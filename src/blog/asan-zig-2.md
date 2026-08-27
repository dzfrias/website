---
title: "Writing an ASan Runtime in Zig #2"
description: An exploration into how ASan's stack detection works.
date: 2026-08-27
---

In the [last post](/blog/asan-zig-1) of this series, I did a deep dive into how
[Address Sanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
quarantines your application's memory to provide a low false negative rate for
use-after-free bugs. In this post, we'll be exploring ASan's fake stack, which
allows complex stack violation bugs (such as a use-after-return) to be detected.
Throughout the post, I'll show snippets of a simplified implementation of a fake
stack in Zig.

Before doing research on this topic, I thought the stack was a relatively
straightforward construct. It turns out there are a lot of stack-related
oddities that can happen during a program's runtime, and that is part of what
makes ASan's fake stack so cool!

# The Basics

Suppose I have a program with a stack use-after-return bug:

```c
int *bad() {
  int x = 68;
  return &x;
}

int main() {
  int *addr = bad();
  *addr = 10;
  return 0;
}
```

Compile with ASan:

```text
$ cc example.c -o example -fsanitize=address
```

Running the outputted executable will actually result in no errors. This is
because stack use-after-return detection is opt-in, as it incurs a noticeable
performance cost.

```text
$ ASAN_OPTIONS=detect_stack_use_after_return=1 ./example
```

Running the above command, we get an error report:

```text
==15926==ERROR: AddressSanitizer: stack-use-after-return on address 0x0001025d0020 at pc 0x000100dc07f4 bp 0x00016f03ebf0 sp 0x00016f03ebe8
WRITE of size 4 at 0x0001025d0020 thread T0
    #0 0x000100dc07f0 in main+0x70 (prog:arm64+0x1000007f0)
    #1 0x00018b59bdfc in start+0x1b4c (dyld:arm64e+0x1fdfc)

Address 0x0001025d0020 is located in stack of thread T0 at offset 32 in frame
    #0 0x000100dc05e4 in bad+0xc (prog:arm64+0x1000005e4)

  This frame has 1 object(s):
    [32, 36) 'x' <== Memory access at offset 32 is inside this variable
```

This seems pretty magical. How does it actually work?

# The Mechanism

When you pass `-fsanitize=address`, the compiler instruments every function
prologue with something like:

```c
// ...setting up stack pointer
uint8_t *stack_data_ptr = (uint8_t *)(0xdeadbeef); // Normal address for stack data
uint8_t *fake_stack_ptr = NULL;
if (detect_stack_use_after_return > 0) {
  fake_stack_ptr = __asan_stack_malloc_N(SIZE);
  if (fake_stack_ptr != NULL) {
    stack_data_ptr = fake_stack_ptr;
  }
}
// Stack variables are accessed by loading from stack_data_ptr
uint8_t stack_var_0 = stack_data_ptr[0];
// ...function data
```

And every epilogue is instrumented with:

```c
if (fake_stack_ptr != NULL) {
  // Free the stack frame (poison its data)
  __asan_stack_free_N((size_t)(stack_data_ptr), SIZE);
}
```

Essentially, the compiler swaps out your native CPU stack at runtime for a new
stack that is controlled with `__asan_stack_malloc` and `__asan_stack_free`.
`__asan_stack_free` **poisons the stack frame data** so that use-after-returns
are detected.

You might be wondering what the constants `N` and `SIZE` are. These are
determined by how much space your stack frame needs to hold its data. For small
stack frames, we usually get the configuration `N=0` and `SIZE=64`. `N`
identifies the **size class** of the stack frame. A size class of 0 corresponds
to a frame that is 64 bytes large, and every size class afterwards doubles the
size of the previous class. `N` can go up to 12, so the max size class `N=11`
indicates a stack frame of size $2^{17}$.

## Details

It's also worth looking at how fake stack frames are laid out in memory.
Although the fake stack costs some performance, ASan still has some tricks up
its sleeve to make things faster!

The fake stack is essentially one big slab allocator:

{% img "fake_stack.png", "Fake stack" %}

From the picture, `n` is the conceptual "stack size," and it is usually set to 8
megabytes.[^size] Each size class gets `n` bytes each, and those regions are
divided up into the frames that correspond to the size class. For example, size
class 0 gets `n / 64` frames of memory that can be used for
`__asan_stack_malloc_0`, each of which are 64 bytes large. The runtime picks a
suitable, unused stack frame in the size class 0 region every time it is
requested by the instrumentation.[^oom] Conceptually:

```python
SIZE_CLASS_LIMIT = 12
REGION_SIZE = 8 * 1024 * 1024
stack_memory = [0] * REGION_SIZE * SIZE_CLASS_LIMIT

# Returns index of stack frame in `stack_memory`.
def stack_malloc(N):
    assert N < SIZE_CLASS_LIMIT
    region_start = N * REGION_SIZE
    # Iterate left to right to try for an inactive frame
    for frame in range(region_start, region_start + REGION_SIZE, N):
        if is_frame_active(frame):
            continue
        set_frame_active(frame)
        return frame
    # Analogous to null pointer in this example
    return None
```

How does the runtime keep track of which stack frames are currently in use (i.e.
how are `is_frame_active` and `set_frame_active` implemented in the above
pseudocode)?

The runtime stores a giant array of flags (one per stack frame).[^zig] Each flag
is one byte wide, where 0 represents inactive, and 1 represents active. Finding
an inactive frame can thus be simplified into doing a linear search over the
flags array.

Let's see some actual code! First, the definition of `SizeClass` and `Flag`:

```zig
const SizeClass = enum(u4) {
    @"0" = 0,
    @"1" = 1,
    @"2" = 2,
    @"3" = 3,
    @"4" = 4,
    @"5" = 5,
    @"6" = 6,
    @"7" = 7,
    @"8" = 8,
    @"9" = 9,
    @"10" = 10,
    @"11" = 11,

    const min_size_log2 = 6;
    const max_size_log2 = min_size_log2 + (std.meta.fields(SizeClass).len - 1);

    /// Return size in bytes of this size class
    pub inline fn size(class: SizeClass) usize {
        return @as(usize, 1) << (@as(u6, @intFromEnum(class)) + min_size_log2);
    }
};

pub const Flag = enum(u8) {
    in_use = 1,
    unused = 0,
};
```

And for the actual implementation:

```zig
const default_stack_size = 8 * 1024 * 1024;
// Lazily initialized per-thread
threadlocal stack_memory: ?[]u8 = null;
threadlocal stack_flags: ?[]Flag = null;

fn stack_malloc(comptime class: SizeClass, size: usize) std.mem.Allocator.Error!?[*]const u8 {
    if (stack_memory == null) {
        const region_len = default_stack_size * std.meta.fieldNames(SizeClass).len;
        // Using PageAllocator.map to call the raw OS mmap function. We need pages to be zeroed.
        const region_mmap = std.heap.PageAllocator.map(region_len, .@"1") orelse return null;
        stack_memory = region_mmap[0..region_len];
        // Get the total flags memory length by computing for the size class limit. This function
        // is explained below!
        const flags_len = countFramesCumulative(std.meta.fieldNames(SizeClass).len + 1);
        const flags_mmap = std.heap.PageAllocator.map(flags_len, .fromByteUnits(std.heap.pageSize())) orelse return null;
        // ptrCast u8 to Flag type
        stack_flags = @ptrCast(flags_mmap[0..flags_len]);
    }
    const memory = stack_memory.?;
    // Skipping some robustness where we handle the case where these two don't get initialized
    // together
    const flags = stack_flags.?;
    // Each region gets default_stack_size bytes worth of frames
    const size_class_region_start = default_stack_size * @intFromEnum(class);
    const size_class_region: []u8 = stack_memory[size_class_region_start .. size_class_region_start + DEFAULT_STACKS_SIZE];
    // Get the slice of flags memory that corresond to this size class
    const flags_class_start = countFramesCumulative(@intFromEnum(class));
    const flags_class = stack_flags[flags_class_start .. flags_class_start + default_stack_size / frame_size];
    // Find first inactive frame
    const i = std.mem.findScalar(Flag, flags_class, .unused) orelse return null;
    // Set to active
    flags_class[i] = .in_use;
    // This is the whole stack frame that the instrumented code will use
    const frame_data: []u8 = size_class_region[i * frame_size .. (i * frame_size) + frame_size];
    setUnpoisoned(frame_data);
    return frame_data.ptr;
}
```

Hopefully you can see how all the details correspond to the pseudocode I
provided. There is one detail I left out, though: `countFramesCumulative`. This
function solves a simple problem: for any given size class, we want to be able
to retrieve the flags region and the size class region. Every size class region
has `stack_size / class_size` frames in it, spanning `stack_size` bytes.
However, the flags region corresponds to `stack_size / class_size` number of
frames (one flag per frame), but each flag only takes up one byte. Thus, the
mapping between the size class' flags region and the size class' frames region
is not one-to-one.

The actual mapping is simply a the result of a geometric sum, given by the
formula:

$$
\begin{align}
\text{flag\_offset} &= \sum_{i=0}^{n-1} (\text{stack\_size} / 64) \cdot 2^{-i} \\
&= \frac{(\text{stack\_size} / 64)(1 - 2^{-n})}{2^{-1}} \\
&= (\text{stack\_size} / 64)(2 - 2^{-n - 1}) \\
&= (\text{stack\_size} / 64)(2^{n + 1} - 2)(2^{-n}) \\
&= \frac{(\text{stack\_size} / 64)(1 \ll (n + 1) - 2)}{1 \ll n}
\end{align}
$$

where $n$ is the size class. The final formula gives us a mapping that can be
computed using unsigned arithmetic operations without the numbers getting too
large.

## Metadata

I haven't yet gone over how frames are freed (i.e. `__asan_stack_free_N`). One
potential idea would be to take the inputted frame pointer and do some pointer
math to get its flag value, and then set the flag to inactive.[^messy] But ASan
has a simpler solution.

**ASan stores a pointer to the flag value at the end of every frame**. Yes; the
frame doens't just store user data.

{% img "flag_ptr.png", "Frame data's flag pointer" %}

Now, I will show the true definition of `Flag`, this time with a function to
revover the saved flag at the end of a frame.

```zig
const Flag = enum(u8) {
    in_use = 1,
    unused = 0,

    /// Every frame should have at least one usize of space for a pointer to the corresponding
    /// flag, stored at the rightmost end of the frame. This function returns a pointer to the
    /// pointer to the flag.
    pub fn saved(frame: []u8) **Flag {
        const size = frame.len;
        const saved_flag_byte_ptr: *align(8) [@sizeOf(usize)]u8 = @ptrCast(@alignCast(frame[size - @sizeOf(usize) .. size]));
        return @ptrCast(saved_flag_byte_ptr);
    }
};
```

We set the flag pointer during frame allocation:

```diff
fn stack_malloc(comptime class: SizeClass, size: usize) std.mem.Allocator.Error!?[*]const u8 {
    // ...
    const size_class_region_start = default_stack_size * @intFromEnum(class);
    const size_class_region: []u8 = stack_memory[size_class_region_start .. size_class_region_start + DEFAULT_STACKS_SIZE];
    const flags_class_start = countFramesCumulative(@intFromEnum(class));
    const flags_class = stack_flags[flags_class_start .. flags_class_start + default_stack_size / frame_size];
    const i = std.mem.findScalar(Flag, flags_class, .unused) orelse return null;
    flags_class[i] = .in_use;
+   const flag_ptr = &flags_class[i];
+   const saved_flag: **FakeFrame.Flag = .saved(frame_data);
+   saved_flag.* = flag_ptr;
    // ...
```

This makes freeing frames particularly easy:

```zig
fn stack_free(comptime class: SizeClass, frame_ptr: [*]u8) void {
    const size = class.size();
    const frame = frame_ptr[0..size];
    const saved_flag: **Flag = .saved(frame);
    // Set the flag to unused so that the frame can be re-used on a later call to stack_alloc.
    saved_flag.*.* = .unused;
    setPoisoned(frame);
}
```

## Inline Free

Although it makes runtime code more convenient, the _key_ reason having the flag
pointer around is that **the instrumentation can now access it**. This enables a
very useful optimization: most stack frames are small, and it can be wasteful to
call into the runtime every time a stack frame should be freed.

This observation results in a nice optimization. The instrumentation can use the
saved flag pointer to free frames _inline_; that is, do what `stack_free` does
above, but within the instrumented program, not via calling the runtime.

For $N \le 4$ the epilogue looks like:[^inline]

```c
if (fake_stack_ptr != NULL) {
  size_t size = 1 << (N + 6);
  uint8_t **saved = &stack_data_ptr[size - 8];
  **saved = 0;
  // Usually implemented inline using a loop or an unrolled loop
  setPoisoned(stack_data_ptr, size);
}
```

This improves performance for small frames, which is a common case in many
programs.

## Even More Metadata

ASan stores _even more_ metadata within stack frames. In the ASan report I
[showed earlier](#the-basics), you might have wondered how the following
information is recovered:

```text
  This frame has 1 object(s):
    [32, 36) 'x' <== Memory access at offset 32 is inside this variable
```

ASan can somehow access debug information of stack frames that are no longer
active? Yes, but not in the way you might think.[^stack-trace] Firstly, every
stack frame has both a tail (the flag pointer) and a header. The header stores
the following:

1. A magic value that indicates the state of the frame, set by the
   instrumentation
2. A pointer to a "description string", set by the instrumentation/compiler
3. A program counter value, set on frame creation by the instrumentation
4. The address of the native CPU stack frame that corresponds to the fake stack
   frame

{% img "actual_frame.png", "The frame with all of its metadata" %}

Starting at the beginning, the magic value is a 64-bit value that is either (as
of writing):

- `0x41B58AB3`: current frame magic
- `0x45E0360E`: retired frame magic

It can be used to identify stack frames in otherwise arbitrary memory. It's not
too important of a detail as to how the runtime works, though.

I'll skip the second part of the header, for now. It's called the description
string pointer, and it requires some extra writing to explain. The third item in
the header is simply just the program counter value upon allocation of the
frame. Lastly, the fourth item in the header is the address of the native/real
stack frame that is managed by the CPU. This is an important detail, as it
establishes a correspondence between CPU stack frames and fake stack frames. Its
uses will be made clear later in this post.

### Description String

Finally, we can circle back to the description string. It is a 0-terminated that
holds all the stack variable metadata that ASan uses in its error report. The
picture I made shows an example of what one might look like. Each item is
separated by an ASCII space. The first item (`2`) indicates the number of
variables in the stack frame. The following 4 items are all metadata of a single
stack variable. Here is a list of what they say:

1. Offset in the frame. This is the variable's position within the stack frame
   data.
2. Size of the variable (in bytes).
3. Number of bytes in the next item in the description string.
4. `<name>:<line>` of the variable.

Hopefully you can see how the runtime can parse this string to get an error
report that looks like the one [I provided](#even-more-metadata).

# Garbage Collection

So far so good. Everything I have described so far seems like a good model for
how to create a fake stack for an ASan-instrumented program. But there are
complications that I haven't yet gone over...

Consider the C functions `setjmp` and `longjmp`. If you're unfamiliar, basic
usage looks like this:

```c
#include <stdio.h>
#include <setjmp.h>
#include <stdnoreturn.h>

jmp_buf buf;

noreturn void foo(int status) {
  printf("foo(%d) called\n", status);
  longjmp(buf, 33);
}

int main(void) {
  volatile int count = 0;
  if (setjmp(buf) == 0) {
    foo(68)
  } else {
    // setjmp should return 33 here
    printf("finished\n");
  }
  return 0;
}
```

We should see the following printed:

```text
foo(68) called
finished
```

Essentially, `setjmp` defines a "landing point" and `longjmp` jumps to that
point. `setjmp` is actually invoked twice in the above example, once retuning
the value `0` on the first invocation, and again when it returns `33` after
being jumped to from the `longjmp`. This is clearly some funky control flow, and
it has implications for the stack.[^longjmp]

The core issue is that, since functions that invoke `longjmp` don't reach the
function epilogue, `__asan_stack_free` (inlined or not) will never be executed.
This means we have garbage frames that are not in use (since they were jumped
out of by `longjmp`), but are still marked as active by the runtime.

{% img "garbage_stack.png", "A stack with garbage due to longjmp" %}

In the above picture, a `longjmp` is executed in frame 4, which means frame 3
and frame 4 are both garbage and don't get a chance to be freed. Cleaning up
these garbage frames is a difficult problem and I recommend you to try to think
of a solution.

## Solution

I mentioned in the [Even More Metadata](#even-more-metadata) section that fake
frame headers store the address of the real CPU stack frame address of the call
to `__asan_stack_malloc`. This is the key piece of information that allows us to
garbage collect dead frames.

More precisely, notice that, in the picture I provided above, the garbage frames
(3 and 4) are lower down the stack than frame 2. When I say "lower down," I mean
that

$$
\text{real}(\text{frame\_2}) \gt \text{real}({\text{frame\_3}}) \gt \text{real}({\text{frame\_4}})
$$

Where $\text{real}$ gives the value of the real stack frame address
corresponding to the fake frame. This is the key fact that allows us to detect
garbage. Suppose we have a conceptual "garbage collection" function:

```python
# frame_addr is the frame address _after_ a noreturn function is called.
def gc(frame_addr):
    for frame in all_frames:
        # Check if frame is active and lies below the frame address post-jump
        if is_frame_active(frame) and real(frame) < frame_addr:
            stack_free(frame)
```

When should we run the garbage collection function? In an overly-aggressive (but
correct) manner, we could run `gc` **every time** `stack_malloc` is called. This
is obviously wasteful, because it means we have to iterate over all active
frames very often.

A better heuristic can be achived using the instrumentation: we only need to
think about garbage collection after a `noreturn` function is called. The
compiler can help us here. Specifically, the instrumentation will call into a
runtime function, `__asan_handle_no_return` every time the compiler sees that a
`noreturn` function is called.

```python
should_garbage_collect = False

def handle_no_return():
    should_garbage_collect = True
```

`handle_no_return` simply sets a flag that tells the runtime to run the `gc`
function next time `stack_malloc` is invoked! For reference, here is the Zig
implementation of `gc`:

```zig
/// Returns the frames that should be
pub fn gc(fa: usize) void {
    // Get the range in memory of the CPU stack (CPU+OS dependent)
    const stack_bounds = queryStackBounds();
    const top = stack_bounds.bottom + stack_bounds.size;
    // Frame address should be within stack bounds
    assert(fa >= stack_bounds.bottom and fa < top);
    // Iterate over active frames
    inline for (0..std.meta.fields(SizeClass).len) |i| {
        const class: SizeClass = @enumFromInt(i);
        const frame_size = class.size();
        const flags_start = countFramesCumulative(i);
        const flags = stack_flags[flags_start .. flags_start + self.stack_size / frame_size];
        var start: usize = 0;
        // Find active frames within the size class region
        while (std.mem.findScalarPos(Flag, flags, start, .in_use)) |pos| : (start = pos + 1) {
            const region: []u8 = stack_memory[self.stack_size * i ..];
            const frame: []u8 = region[pos * frame_size .. (pos * frame_size) + frame_size];
            const real_stack = header(frame).real_stack;
            // Garbage collect when the fake frame's address is in this thread's stack bounds and
            // the address is unreachable (FakeFrame's frame address value is below the current
            // frame address).
            if (stack_bounds.bottom < real_stack and real_stack < fa) {
                // Free the frame
                flags[pos] = .unused;
                setPoisoned(frame);
            }
        }
    }
}
```

This will prevent us from having garbage frames when `longjmp` is called!

## Last Detail

One last challenge to think about. In the [first post](/blog/asan-zig-0) of this
series, I introduced the idea of stack redzones. These redzones catch memory
overflow accesses on stack variables.

A problem exists because of `setjmp` and `longjmp`: these redzones stay around,
even in dead frames. They live in the CPU stack, not the fake stack, so our `gc`
function cannot take care of them. How can we unpoison these redzones? I will
leave this as an exercise for you![^hint]

# Conclusion

I learned something in this post! The ASan's fake stack is deceptively simple;
it has a lot of small technicalities that make it work correctly with good error
reporting mechanisms. This post was pretty technical and had lots of parts, so
if there were any issues you found or questions you have, definitely send me
email [mail@dzfrias.dev](mailto:mail@dzfrias.dev).

[^size]:
    Since there are 12 size classes, the total fake stack takes up `n * 12`
    bytes. This memory is lazily requested from the OS when
    `__asan_stack_malloc` is called for the first time. Although this is a lot
    of memory, as long as we keep the unused pages zeroed out, the OS will
    deduplicate almost all of it and only actually commit exactly the pages that
    we need.

[^oom]:
    You might be considering the case where there are **no** unused stack frames
    in the requested size class, and `__asan_stack_malloc` is called. In such
    cases, the function returns `NULL`, indicating that the native stack should
    be used.

[^zig]:
    When I say "the runtime," I am referring to the Zig runtime here. This is a
    place where Zig ASan and LLVM ASan deviate. I'm not totally sure where LLVM
    ASan stores its flags.

[^messy]:
    I'll refrain from going into details on this since it is a bit of an
    involved process. But I encourage you to think about how it works,
    especially in relation to how flag regions are recovered, as I talked about
    in the previous section.

[^inline]:
    This threshold is freely subject to change, since this detail is not related
    to the ASan ABI.

[^stack-trace]:
    The compiler usually provides debug info in a fancy format for printing
    things like stack traces, and allowing tools like `lldb` and `gdb` to have
    rich information about your program. But, somewhat to my surprise, this
    machinery is not what ASan uses! If you're curious about the fancy debug
    info format, I recommend reading about
    [DWARF](https://en.wikipedia.org/wiki/DWARF).

[^longjmp]:
    You might wonder what the purpose of `longjmp` and `setjmp` are. One common
    use case in C code is for "exceptions." An exception (`longjmp`) should
    break control flow and go back to the last handler (`setjmp`). Many C
    applications don't use these functions even still, as they making things
    somewhat complicated and error return codes are usually much more
    manageable. Personally, I would never consider using them.

[^hint]:
    Hint: think about at what time we should unpoison these redzones. Also, does
    it matter if we unpoison the redzones only, or is it okay to unpoison other
    data in the stack?
