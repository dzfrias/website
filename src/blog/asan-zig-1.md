---
title: "Writing an ASan Runtime in Zig #1"
description: A deep dive into how ASan's memory quarantine works.
date: 2026-08-01
---

In a [previous post](/blog/asan-zig-0), I wrote a high-level overview of how
LLVM's [Address Sanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
works, as well as providing a small snippet of a custom ASan runtime I am
writing in Zig. That post particularly focused on the core algorithm, which
explains how ASan can track complex memory violations with relatively little
overhead.

In this post, I will do a deep dive into an important component of the runtime:
the **memory quarantine**.

# Why Quarantine?

In the first post of this series, I gave a brief implementation of how the
`__asan_free` function works. In pseudocode:

```python
def free(ptr):
    header = getHeader(ptr)
    if header.state == FREED:
        abort("Double free!")
    header.state = FREED
    setPoisoned(getAllocBytes(header))
```

You can read the actual implementation
[here](/blog/asan-zig-0#allocation-headers). You might notice a key part is
missing from this implmentation of `free`: actually releasing memory back to the
OS! In other words, with this implementation, no memory is ever re-used across
the instrumented program's lifetime. There is a simple reason for this, though:
if we actually released memory, we _wouldn't_ be able to detect
use-after-frees![^uaf]

But there is an obvious problem with keeping memory around forever. For enormous
pieces of software that ASan instruments like Chromium, it is unsustainable to
never re-use memory. To try to get the best of both worlds, ASan has the notion
of a memory quarantine.

# The Idea

The idea of the quarantine is this: all freed allocations are held in a giant
queue. The queue is bounded so that the sum of the sizes of all allocations
living in the queue stays below a certain size. Once new memory is freed (via
`__asan_free`), old memory is popped out of the queue to stay below the bound.

{% img "queue0.png", "Global allocation queue" %}

In the picture, the 5kB and 15kB allocations are being flushed to make room for
the new 30kB allocation. Allocations that are flushed from the queue are
released to the operating system.

This model ensures that memory stays around long enough so that use-after-frees
are usually detected.[^perfect] The size of the quarantine is usually around 256
megabytes, but ASan allows it to be set arbitrarily using the
`quarantine_size_mb` flag.[^flags]

# Synchronization

There is a big performance problem with the idea I just introduced. Every time
an allocation is freed using `__asan_free`, the runtime has to add the
allocation to a big queue. To prevent data races in a multi-threaded program,
this means that the queue needs to be locked and unlocked _on every free_.

Since it is very possible that many threads are constantly allocating and
freeing at the same time, the global quarantine is a very contentious resource.
Thus, to competition between threads, we need to figure out a way to minimize
the amount of locking.

One clever approach to solving this problem is introducing **local
quarantines**. Every thread can have its own individual quarantine for when it
frees allocations; all freed allocations can enter this fast buffer in a
lock-free manner. Once the local quarantine becomes larger than a certain size,
the thread locks the global quarantine and flushes the entire local quarantine
into the queue.

This approach makes reduces the amount of locking while still preserving the
original behavior of the quarantine idea.

{% img "queue1.png", "Global allocation queue with local quarantines" %}

# Implementation

In this section, I'll share some simplified snippets of how the quarantine
system works in Zig ASan. First, we define the global quarantine:

```zig
/// Global quarantine for allocations. Thread-safe but not lock free. Does not actually free any
/// memory.
const Quarantine = struct {
    size: usize = 0,
    queue: std.Deque(Batch) = .empty,
    mutex: std.Io.Mutex = .init,
    evict_limit: usize,

    const Batch = struct {
        allocs: []const *AllocHeader,
        size: usize,
    };

    pub fn init(evict_limit: usize) Quarantine {
        return .{ .evict_limit = evict_limit };
    }

    pub fn deinit(self: *Quarantine, gpa: std.mem.Allocator) void {
        if (!self.mutex.tryLock()) {
            // A thread is holding this mutex... we should just quit to avoid undefined behavior.
            // The memory will leak
            return;
        }
        self.size = 0;
        self.queue.deinit(gpa);
        self.mutex = .init;
    }

    /// Flush all remaining allocations. Returns all batches that must be released back to the
    /// OS as a result of this operation. Caller owns all memory.
    pub fn flush(self: *Quarantine, io: std.Io, gpa: std.mem.Allocator) std.mem.Allocator.Error![]const Batch {
        self.mutex.lock(io) catch @panic("mutex lock should not be cancelled");
        defer self.mutex.unlock(io);
        var freed: std.ArrayList(Batch) = .empty;
        errdefer freed.deinit(gpa);
        while (self.queue.popFront()) |batch| {
            try freed.append(gpa, batch);
            self.size -= batch.size;
        }
        assert(self.size == 0);
        return try freed.toOwnedSlice(gpa);
    }

    /// Receive a batch into the quarantine. Returns all batches that must be released back to the
    /// OS as a result of this operation. Caller owns all memory.
    pub fn batchReceive(
        self: *Quarantine,
        io: std.Io,
        gpa: std.mem.Allocator,
        batch: Batch,
    ) std.mem.Allocator.Error![]const Batch {
        self.mutex.lock(io) catch @panic("mutex lock should not be cancelled");
        defer self.mutex.unlock(io);
        try self.queue.pushBack(gpa, batch);
        self.size += batch.size;
        var freed: std.ArrayList(Batch) = .empty;
        errdefer freed.deinit(gpa);
        while (self.size > self.evict_limit) {
            const front = self.queue.popFront() orelse break;
            self.size -= front.size;
            try freed.append(gpa, front);
        }
        return try freed.toOwnedSlice(gpa);
    }
};
```

Notice that we lock every time we call `batchReceive`. Our per-thread
quarantines should submit batches to the global quarantine. I went over the
definition of `AllocHeader` [here](/blog/asan-zig-0#allocation-headers). Next,
here is the definition of the per-thread quarantines:

```zig
/// Local quarantine for allocations. Not thread-safe. Does not actually free any memory.
const FastQuarantine = struct {
    size: usize = 0,
    allocs: std.ArrayList(*AllocHeader) = .empty,

    pub const empty: FastQuarantine = .{};

    /// Minimum size of the thread local quarantine before flushing to the global quarantine
    const flush_limit = 1 << 20; // 1MB

    /// Add an allocation to the fast quarantine. Adds to global quarantine and flushes if
    /// flush_limit is reached. Returns any batches that need to be freed. Caller owns all
    /// returned memory. Does not actually free anything.
    pub fn addAlloc(
        self: *FastQuarantine,
        io: std.Io,
        gpa: std.mem.Allocator,
        global: *Quarantine,
        header: *AllocHeader,
    ) std.mem.Allocator.Error![]const Quarantine.Batch {
        try self.allocs.append(gpa, header);
        self.size += header.fullAllocSize();
        if (self.size > flush_limit) {
            return self.flush(io, gpa, global);
        }
        return &.{};
    }

    /// Flush all memory into the global quarantine as a batch. Returns any batches that must
    /// be released back to the OS as a result of this operation.
    pub fn flush(
        self: *FastQuarantine,
        io: std.Io,
        gpa: std.std.mem.Allocator,
        global: *Quarantine,
    ) std.mem.Allocator.Error![]const Quarantine.Batch {
        const allocs = try gpa.dupe(*AllocHeader, self.allocs.items);
        errdefer gpa.free(allocs);
        const freed = try global.batchReceive(io, gpa, .{
            .allocs = allocs,
            .size = self.size,
        });
        self.allocs.clearRetainingCapacity();
        self.size = 0;
        return freed;
    }
};

threadlocal var local_quarantine: FastQuarantine = .empty;
```

Now I will provide the full Zig implementation of `__asan_free`, using this new
quarantine system:

```zig
fn __asan_free(ptr: ?*anyopaque) void {
    // Same as before:
    const non_null = ptr orelse return;
    const bytes: [*]u8 = @ptrCast(non_null);
    const header: *AllocHeader = @ptrCast(@alignCast(non_null - 16));
    if (header.state.cmpxchgStrong(.alive, .freed, .acquire, .monotonic)) |state| {
        return switch (state) {
            .freed => {
                const stderr = std.debug.lockStderr(&.{}).terminal();
                defer std.debug.unlockStderr();
                std.debug.writeStackTrace(&header.trace.stack_trace, stderr) catch {};
                @panic("double free!");
              },
            .alive => unreachable,
        };
    }
    const size_low: usize = @intCast(header.user_size_low);
    const size_high: usize = @intCast(header.user_size_high);
    const size = size_low | (size_high << 32);
    setPoisoned(bytes[0..size]);
    // New!
    const needs_free = local_quarantine.addAlloc(io, backing_allocator, &global_quarantine, header) catch blk: {
        // Worse case, just free the allocation
        backing_allocator.free(header.allocation());
        break :blk &.{};
    };
    // Every batch here has been evicted by the global quarantine
    for (needs_free) |batch| {
        // Actually release all allocations in the batch
        for (batch.allocs) |h| {
            // Stop tracking the allocation in shadow memory
            setUnpoisoned(alloc);
            backing_allocator.free(h.allocation());
        }
        backing_allocator.free(batch.allocs);
    }
    backing_allocator.free(needs_free);
}
```

Here I am assuming `io`, `backing_allocator`, and `global_quarantine` are global
variables. The `allocation` method returns the full allocation of the
`AllocHeader` as described in the last post.[^challenge]

Lastly, you may be wondering what happens when a thread exits. In order to not
leak memory, the `FastQuarantine.flush` should be called! This can be done using
per-thread destructors. The POSIX standard defines per-thread destructors via
the `pthread_key` API, and Windows might have an equivalent (I don't really
know).

# Conclusion

I hope you enjoyed this post! While it is only a small component of how ASan
works, the memory quarantine is an interesting concept that studying in-depth
can be rewarding.

As always, if you have any questions, comments, or found an issue, send me an
email at [mail@dzfrias.dev](mailto:mail@dzfrias.dev).

I hope to finish Zig Asan in a few months once I iron out all the nuances of the
runtime. There are a lot of small but important behaviors to consider when
instrumenting complex programs!

[^uaf]:
    You might be tempted to think that it is okay to release the memory _and_
    continue tracking it using shadow memory. This is not safe, though. Once we
    release memory, we should consider acccessing it as undefined behavior.

[^perfect]:
    This model is not perfect. It fails to detect applications using memory a
    very, very long time after it has been freed, but it catches most cases.
    This is an okay trade-off for performance.

[^flags]:
    ASan has a lot of useful flags like this. You can find a big list of them in
    the
    [Address Sanitizer Wiki](https://github.com/google/sanitizers/wiki/AddressSanitizerFlags).
    It is an outdated resource, but it is still the best list I could find.

[^challenge]:
    In the last post, I didn't fully give you the definition of `allocation`. I
    left it as an exercise!
