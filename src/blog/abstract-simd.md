---
title: CPU-Abstracted SIMD Is Bad
description:
  My opinions on SIMD interfaces that abstract over intrinsics, instructions,
  and specific CPU capabilities.
date: 2026-09-03
---

Many modern languages have a some way to do
[SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) in such
a way that is agnostic of the host
[ISA](https://en.wikipedia.org/wiki/Instruction_set_architecture) or CPU. This
seems like a natural abstraction, given that compilers already abstract over
CPUs features broadly. For example, Zig has:

```zig
fn simdAddAndReduce(x: @Vector(16, u8), y: @Vector(16, u8)) u32 {
    // Does a vectorized addition and reduction.
    // No ISA-specific intrinsics or instructions here!
    return @reduce(.Max, x + y);
}
```

While this looks nice in theory, in this post, I will make the case that, in the
current day, such abstractions **are not good enough** to be justified over
using ISA-specific compiler intrinsics, at least not in the context of a high
performance library implementing vectorized algorithms.[^applications]

# SIMD Today

Modern applications SIMD look much different than in decades past. In the 90s,
SIMD on commercial computers was concerned primarily with speeding up audio and
visual software on inexpensive hardware. Image processing, for example, is a
classic and straightfoward application of SIMD: something like a grayscale
operation can be performed by doing simple vectorized math on chunks of pixels
instead of single pixels.

However, the innovative SIMD algorithms of today are much more complicated than
just performing math on chunks of numbers. One algorithm I consider a hallmark
of modern SIMD is the
[Keiser-Lemire UTF-8 validation algorithm](https://arxiv.org/pdf/2010.03090),
which shows the application of SIMD in string processing.

How does the algorithm work? The core component is evident in what the authors
call it: the `lookup` algorithm. A vectorized lookup is simply a function that
does the following:

$$
\text{lookup}_i(x_i) = \text{table}[x_i] \quad \text{where} \,\, 0 \le i \le N
$$

where $x$ is a vector of width $N$ and $\text{table}$ is a table of some (small)
size that provides scalar values. On today's hardware, $\text{lookup}(x)$ can be
achieved using `tbl`/`vqtbl4q_u8` for ARM, or `VPSHUFB`/`_mm256_shuffle_epi8`
for x86_64.[^shuffle]

So how do we do $\text{lookup}(x)$ in a modern programming language with a
hardware-agnostic SIMD abstraction? Many langauges cannot.[^rust] At least, not
unless $x$ is a compile-time constant. The reason why is because LLVM doesn't
have an IR instruction for doing a dynamic vectorized lookup;[^recent] it only
has one for when $x$ is constant. In fact, much of the LLVM vector IR is
outdated, and in my opinion, doesn't reflect well the modern capabilities of
hardware.

The consequence of this is that LLVM languages also do not have dynamic
vectorized lookup instructions. Furthermore, LLVM's autovectorizers are not good
at recognizing when a dynamic lookup can be used, even in the most obvious
cases. Thus, you will have a lot of trouble trying to implement the
Keiser-Lemire lookup algorithm without using intrinsics in your favorite
compiled language.

The point is that modern SIMD patterns have evolved past what LLVM is built to
support.

# Different SIMD Capabilities

The next big issue is that not all instruction set architectures have even
remotely similar SIMD capabilities. For example, a common operation in SIMD
algorithms is the `movemask`. On Intel's SSE instruction set, this is called
`PMOVMSKB`. This instruction takes the high bit from each byte of the input
vector and concatenates them into an integer.

```text
movemask({ 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0xFF }) = 0b10011101
```

ARM Neon **does not** have a `PMOVMSKB` equivalent. Thus, any ISA-abstracted
SIMD implementation is going to have to burn a lot of cycles to emulate it on
ARM chips. You can read
[Langdale's blog post](https://branchfree.org/2019/04/01/fitting-my-head-through-the-arm-holes-or-two-sequences-to-substitute-for-the-missing-pmovmskb-instruction-on-arm-neon/)
for details on this problem.

You might wonder, though: if we need `PMOVMSKB` on ARM, why not let a
ISA-abstracted SIMD abstraction generate optimal code for us instead of writing
it ourselves using intrinsics? The answer is that there are faster but
_semantically_ different alternatives to `PMOVMSKB` on ARM.

In
[this ARM community blog post](https://developer.arm.com/community/arm-community-blogs/b/servers-and-cloud-computing-blog/posts/porting-x86-vector-bitmask-optimizations-to-arm-neon),
an approach to the movemask problem is presented. I won't go over the details,
but essentially, ARM Neon has a very fast way to do this:

```text
arm_movemask({ 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0xFF }) = 0xF00FFF0F
```

Instead of having one bit per lane as with `PMOVMSKB`, there are 4 bits per
lane. Despite the fundamental layout difference, the way one might use this
"movemask with multiplicity" is almost the exact same as the `PMOVMSKB`
movemask.

This is just one example that highlights big a problem with abstracted SIMD:
fast SIMD routines often take advantage of hardware- or ISA-specific facts,
beyond what an optimizer can do a simple pass for.

# Non-Uniform Behavior

The next quirk is that, even when two ISAs have similar instructions, they often
have subtly different behavior that force an ISA-abstracted SIMD implementations
to generate sub-optimal code to handle.

To illustrate this, let's go back to [a previous section](#simd-today), with
$\text{lookup}$ instructions. On ARM, this can be achieved with `tbl`, and on
x86_64, this can be achieved with `VPSHUFB`. One good question to ask is: what
happens when the lookup index $x_i$ goes out of bounds of the table? The maximum
addressable slot in a table for `tbl` is 63, and for `VPSHUFB` it is 15. On
Neon, out of bounds indices result in a zero being placed in the result vector.
But for x86_64, it wraps around into the 4 bit range!

Thus, in order to achieve uniform behavior for an abstract "lookup" instruction,
one must lower into machine instructions that attempt to correct the differences
in behavior across ISAs, either choosing OOB to result in 0, modular behavior,
or undefined behavior.

# Conclusion

I hope these points helped illustrate my point that the current state of
ISA-abstracted SIMD is not quite good enough for use in high performance
libraries. I'm not saying that it is _impossible_ for LLVM to get on par with
using ISA-specific intrinsics, just that _a lot_ of work would have to be done
in order for that to be the case.

One thing I would at least like to see in LLVM is a way to perform lookups, and
then perhaps a way to do movemasks. Then, a handful of modern SIMD algorithms
could be ported over to LLVM IR and performance can be measured using those
algorithms as references.

As always, if you have any questions, comments, or pushbacks about anything on
this post, please send me an email at
[mail@dzfrias.dev](mailto:mail@dzfrias.dev)!

[^applications]:
    For the context of an application just trying to squeeze out a little bit
    more performance, this argument doesn't apply. For a software that isn't
    SIMD-focused, it's certainly fine to have some SIMD over no SIMD.

[^shuffle]:
    x86_64 has other flavors of lookup instructions. But `VPERMB` is the most
    ubiquitous. Also, for the purposes of this post, shuffle and lookup are
    interchangeable even though they imply slightly different semantics.

[^rust]:
    Rust recently got a _decent_ (but still not optimal) implementation of a
    dynamic shuffle operation (which can be used to do a lookup). You can read a
    blog post about it
    [here](https://shnatsel.github.io/improving-std-simd-swizzle-dyn/). But it
    still relies on using intrinsics under the hood instead of LLVM.

[^recent]:
    Recently, an
    [RFC](https://discourse.llvm.org/t/rfc-ir-ability-to-shuffle-vectors-with-dynamic-mask/91282)
    and PR were opened that are meant to add a `dynamicshuffle` instruction to
    the LLVM IR. Although it is still experimental, I think it is likely to be
    accepted given the necessity. However, the point still stands: LLVM simply
    does not have the intrinsics necessary to cover the breadth of modern SIMD.
