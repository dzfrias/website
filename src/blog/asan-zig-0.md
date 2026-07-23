---
title: "Writing an ASan Runtime in Zig #0"
description:
  A look into an alternative runtime for Address Sanitizer that I am writing in
  Zig.
date: 2026-07-20
---

LLVM's [Address Sanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
(ASan) is one of the most widely used tools in production software, particularly
software written in C or C++.[^languages] Briefly, ASan will instrument a
program so that all memory reads and writes are safety-checked (i.e. preventing
buffer overflows, use-after-frees, and other tricky memory bugs). More advanced
features can be enabled, such stack use-after-return checking, at the cost of
performance.

There are many tools that do this, such as [Dr. Memory](https://drmemory.org/)
and [valgrind](https://valgrind.org/). However, ASan remains the most widely
used way to detect memory issues, and a large part of its dominance owes to its
speed; ASan usually only slows down the instrumented program by a factor of
1.8x-2x. This means that ASan **won't** cause running tests to go from minutes
to hours, which is nonnegotiable for giant projects with enormous test suites
like Chromium and Firefox.

In this blog post, I will explain how ASan is so performant, and offer snippets
of an alternative runtime I am writing in [Zig](https://ziglang.org/).

# The Basics of ASan

Consider the following C program:

```c
#include <stdlib.h>

int main(void) {
  char *buf = malloc(8);
  // Uh oh! Heap overflow
  buf[8] = 0;
  free(buf);
  return 0;
}
```

This program has a heap buffer overflow. We can compile this program with ASan
like so:

```text
$ cc asan_test.c -o asan_test -fsanitize=address -g
```

When we run this program, we should get an output that looks like this:

```text
==66248==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x6020000000f8 at pc 0x000102f70600 bp 0x00016ce8ec10 sp 0x00016ce8ec08
WRITE of size 1 at 0x6020000000f8 thread T0
    #0 0x000102f705fc in main main.c:6
    #1 0x00018b59bdfc in start+0x1b4c (dyld:arm64e+0x1fdfc)

0x6020000000f8 is located 0 bytes after 8-byte region [0x6020000000f0,0x6020000000f8)
allocated by thread T0 here:
    #0 0x000103754e24 in malloc+0x70 (libclang_rt.asan_osx_dynamic.dylib:arm64+0x54e24)
    #1 0x000102f705ac in main main.c:4
    #2 0x00018b59bdfc in start+0x1b4c (dyld:arm64e+0x1fdfc)

SUMMARY: AddressSanitizer: heap-buffer-overflow main.c:6 in main
Shadow bytes around the buggy address:
...
```

ASan tells us where the overflow happened, as well as the allocation that it
most likely overflowed. To me at least, this seems pretty magical. How can ASan
figure all of this out?

## Instrumentation

When you pass the `-fsanitize=address` flag into your compiler, it will
**instrument** all of your memory accesses. In other words, it will turn all
code that looks like this:

```c
buf[8] = 0;
```

into

```c
if (!IS_POISONED_MEMORY(buf + 8)) {
  // Report an invalid store of size 1
  __asan_report_store1(buf + 8);
}
buf[8] = 0;
```

It does the same when reading from memory. Simple enough, right?

You might wonder who defines `__asan_report_store1`, and how the instrumented
program is able to call it. This is a good question, as it leads to the next
major component of ASan: the runtime.

## Runtime

The ASan runtime defines functions like `__asan_report_store1`, along with doing
pretty much all the heavy lifting for the internals of ASan. It is a dynamic
library that the instrumented program calls into.

Here is a quick overview of the functionality that the runtime contains:

- Error reporting/printing
- Allocation APIs (`malloc`, `free`, etc.). The dynamic library intercepts calls
  to `malloc` so that they route to `__asan_malloc`. This is how ASan knows
  about the allocations your program is making (because it is the one actually
  providng the memory).
- `__asan_init`. The instrumented code calls this before `main` so that the
  runtime can do anything it needs to set up.
- Stack frame allocation and free, if use-after-return detection is enabled

Combined, the instrumentation and runtime work together to report any bad
(poisoned) memory accesses that your program makes.

While this explains the _architecture_ of ASan, I haven't yet explained how bad
memory is distinguished from good memory (i.e. how does `IS_POISONED_MEMORY`
work in the example I showed in [Instrumentation](#instrumentation)?). This
question leads to the core mechanism that makes ASan so fast: shadow memory.

## Shadow Memory

At a high level, ASan divides the addressing space into two regions:[^address]

1. Application memory
2. Shadow memory

Typically, application memory covers 7/8ths of the total available addressing
space, and shadow memory covers the 1/8th left. Application memory is the memory
that the running process uses, like normal. The shadow memory is a contiguous
segment that is reserved on initialization (during `__asan_init`). When the ASan
runtime reserves this memory, blocks it off so that program only gets memory
(from `malloc` and others) that lives in the application region.

What goes in shadow memory? In short, every byte of shadow memory corresponds to
8 bytes of application memory. If a byte in the shadow region is less than zero,
it means all 8 corresponding bytes of main memory are bad. If it is equal to
zero, that means it is "okay". We are guaranteed that all application memory can
be tracked in shadow memory because of the 1:8 ratio.

```text
|---------------------||--------||-------------------|
      Application        Shadow      Application
```

So, `IS_POISONED_MEMORY` from before returns true if and only if the shadow
value corresponding to the passed address is less than zero. All addresses in
the application memory space can be transformed into a shadow memory address
with a simple calculation:

$$
\text{shadow\_addr}(x) = (x / 8) + \text{shadow\_mem\_base}
$$

Again, the 1:8 ratio is what makes this work. Since it's just a few arithmetic
operations, this check is extremely fast.

### Tail Bytes

There is a slight problem with this model: the 1:8 ratio is not granular enough
to support mapping blocks of memory that are not multiples of 8. For example,
`malloc(16)` corresponds to `0x00 0x00` in shadow memory. However, `malloc(17)`
should not correspond to `0x00 0x00 0x00`, as it represents _24_ okay bytes,
not 17. ASan solves this by defining bytes `0x01`-`0x07`. `0x0k` means that the
first k bytes of the region are okay, and the next 8 - k are not.

So, `malloc(17)` is mapped to `0x00 0x00 0x01`.

## Redzones

**Redzones** are regions of poisoned memory that are installed to detect
overflows. For example, we've covered how the runtime intercepts `malloc(8)` to
call `__asan_malloc(8)`. `__asan_malloc(8)` actually allocates 40 bytes of
memory, and installs 16 bytes of padding bytes on both sides of the user's
allocation region (8 bytes) that are poisoned immediately upon
allocation.[^padding] The shadow memory would looks like this:

```text
... 0xfa 0xfa 0x00 0xfa 0xfa ...
    --------malloc(8)-------
```

So, if the program tried to access out of the bounds of the allocation, the bad
access would likely hit a redzone and thus cause an error report.

ASan also installs redzones around all stack variables. Consider this program:

```c
int main(void) {
  int a = 0;
  *(&a + 1) = 68;
  return 0;
}
```

ASan can report this as a stack buffer overflow because it puts poisoned
redzones around the address corresponding to every stack variable. Something to
note is that the **instrumentation does this**, not the runtime.

# Zig ASan

I am currently writing an alternative runtime for ASan using Zig. As a reminder,
the runtime is responsible for:

1. Reserving shadow memory
2. Intercepting memory allocation functions such as `malloc`
3. Defining error reporting functions
4. Implementing symbols such as `__asan_init`
5. ...and much more that I haven't covered in this post

The runtime is essentially a dynamic library that exposes a fast memory
allocator that maintains shadow memory and prints fancy error reports. I haven't
made the source code public yet, but most likely will within the next couple of
months.

In the rest of this post, I will describe my solution to one of the many
sub-problems that pertains to writing an ASan-style allocator.

## Allocation Headers

We've already seen how ASan uses [redzones](#redzones) to pad allocations with
poisoned memory. But, when a redzone is accessed, how does ASan trace it back to
the original allocation in the error report? How does it print a stack trace of
where the original allocation took place?

The answer is with allocation metadata. Many allocators attach metadata to all
allocations that describe various things about the allocation that are useful
for debugging.

This metadata can be located pretty much anywhere. A naive allocator, for
example, could put this metadata in a giant hash map. This doesn't scale well in
multi-threaded programs; some sort of synchronization would be required for
every single allocation request to prevent data races.

Instead, Zig ASan stores allocation metadata as a header in every allocation. A
convenient place to put this metadata is the left redzone:

```text
XXXXXXXXX|HHHHHHHHHHHHHHHH|00000000000|XXXXXXXXXXXXXXXXXXXX
Left rz   Header/left rz   User data   Right rz
```

Zig ASan's header size is 16 bytes. This is how it is defined:

```zig
const AllocHeader = struct {
    /// State of the allocation
    state: std.atomic.Value(State) = .init(.alive),
    packed_data: packed struct(u8) {
        // Requested alignment from user for allocation
        user_alignment: mem.Alignment,
        // Extra bits to get this type to u8.
        _: u2 = 0,
    },
    // We can't use a u48 for this because we need alignments to be exact
    user_size_high: u16,
    user_size_low: u32,
    // Pointer to stack trace of allocation. We allocate a TraceMetadata upon
    // every allocation.
    trace: *const TraceMetadata,

    const State = enum(u8) {
        alive = 0,
        freed = 1,
    };

    const TraceMetadata = struct {
        stack_trace: std.debug.StackTrace,
        thread_id: std.Thread.Id,
    };
}
```

Suppose the user wants to free an allocation with `free(ptr)`. In Zig, this will
look like

```zig
// Called when the runtime intercepts `free`
fn __asan_free(ptr: ?*anyopaque) void {
    const non_null = ptr orelse return;
    const bytes: [*]u8 = @ptrCast(non_null);
    // Get the header by subtracting 16 bytes from user's pointer
    // NOTE: this requires that `ptr` is 16-aligned. We can guarantee this
    //       by making the minimum alignment of every allocation 16
    const header: *AllocHeader = @ptrCast(@alignCast(non_null - 16));
    // Set the state to quarantined or early return if it's already being
    // quarantined. This needs to be done atomically so that we don't race
    // in the case of a double free. We use the acquire memory ordering to
    // make sure the poisoning comes after this operation.
    if (header.state.cmpxchgStrong(.alive, .freed, .acquire, .monotonic)) |state| {
        return switch (state) {
            .freed => {
                // Write stack trace of offending allocation
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
    // Assemble the u48 size from the low and high fields
    const size = size_low | (size_high << 32);
    // Set the user's allocation to poisoned in shadow memory
    setPoisoned(bytes[0..size]);
}
```

Hopefully this shows a complete example of how allocation headers can be used to
provide good debug info to the user.

There is one thing missing from what I've told you about `AllocHeader`. Consider
the situation where I want to do something to the _full_ allocation (redzones
included) after the user passes a pointer, not just the user's portion of the
allocation. Try to figure out how we might be able to recover the full
allocation from just the user pointer, without adding any fields to
`AllocHeader`.[^hint]

# Conclusion

I hope this post gave a good introduction to how ASan works, and made the
implementation a little less magical. This post should also help to demystify
ASan error reports; they have a lot of densely packed information, so it can be
hard to know what to look for. It's helpful to be able to fluently read the
shadow memory report the ASan provides gives.

Lastly, I hope my work on Zig ASan was interesting. I've made a lot progress on
the library and hope to be releasing it soon! If you have any questions,
comments, or found an issue, send me an email at
[mail@dzfrias.dev](mailto:mail@dzfrias.dev).

Thanks for reading my post!

[^languages]:
    It can actually be used in any LLVM language, such as Rust, Go, and Zig.
    This is less common in practice, though, because those langauges already
    have helpers for memory safety.

[^address]:
    If you are unfamiliar, "addressing space" refers to the range that memory
    can be addressed at by your process. The operating system gives each process
    many terabytes of space to work with, and then maps these terabytes into
    physical memory on your computer.

[^padding]:
    The actual size of the allocation is determined by the runtime and should be
    regarded as an implementation-specific detail. Larger redzones, for example,
    could catch more overflows, but they are more wasteful. Thus, the runtime
    can choose an appropriate redzone size depending on its needs.

[^hint]:
    Hint: think about how we can use alignment math instead of adding extra
    bytes of information somewhere.
