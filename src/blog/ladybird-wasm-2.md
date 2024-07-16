---
title: "Ladybird WebAssembly Update #2"
description: My third update on the Ladybird WebAssembly implementation.
date: 2024-07-10
---

Nearly a month has passed since my
[latest update](https://dzfrias.dev/blog/ladybird-wasm-1/) on the
[WebAssembly](https://webassembly.org/) implementation of the
[Ladybird browser](https://ladybird.org/). My intention is to get the Wasm
virtual machine to be **fully spec-compliant** by the end of the summer. My
[original post](https://dzfrias.dev/blog/ladybird-wasm-1/) explains a little bit
more about what that means as well as my motivations behind it.

_A lot_ has happened in the last few weeks, so I'll do my best to show my
progress in this post. I also have an exciting announcement to make regarding
the scope of this challenge!

# Improvements

Right now, we're sitting at a mere **10 tests** that do not pass on my
machine.[^simd] Here's a list of the PRs I've made, from most to least recent:

1. Fix a tiny `memory.grow` bug
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/563))
2. Fix loop arity for certain blocktypes
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/559))
3. Implement SIMD bitwise operations
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/558))
4. Fully validate section lengths
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/522))
5. Give names to functions exposed to JS via `ref.func`
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/521))
6. Clean up some unused value type variants
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/500))
7. Make float operations fully spec-compliant
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/459))
8. Validate edge-case `if` instruction
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/418))

In the following subsections, I'll go into a little bit more detail about a few
of the notable PRs.

## Floats

This was a very, _very_ painful thing to work on. The main problem was this:

In the [IEEE754 spec](https://en.wikipedia.org/wiki/IEEE_754), there are many
float bit patterns that mean "not-a-number".[^nan] However, most JS
implementations canonicalize them, meaning that two JS `NaN`s will _always_ have
the same bit pattern, even though they _technically_ could have different
internal representations and nobody would be mad.[^boxing] For example,
`0x7fc00000` and `0x7fb71688` are both "not-a-number" by IEEE754's standard, but
JS `NaN`s are always the former.[^impl]

"Wait we're talking about Wasm, so why is this a problem?" Well, the Ladybird
Wasm testsuite **uses JavaScript** as a harness to run the tests! This means
that we sometimes need to pass `NaN`s from JS to Wasm. But sometimes, we want to
pass a `NaN` that **is not** `0x7fc00000`. There is literally no way to do that
in JS.

So, in short, because Ladybird's JS implementation canonicalizes `NaN`s to have
the same bit pattern, we lose vital information when passing arguments to Wasm
tests. Technically, this is not a problem with the Wasm VM itself. The VM is
pretty much fine. It's a problem with how the tests are run.

### The Fix

To fix this, instead of passing `NaN` from JavaScript (and losing information),
**we now pass a `Uint8Array`** that contains the specific bit pattern of the
`NaN` in question. Then, when JS values are being translated to Wasm values, we
check if it's a `Uint8Array`, and if it is, we `memcpy` the data into a float
(we're in C++ land at that point, and C++ doesn't canonicalize anything).

This wasn't an easy problem to solve, nor was it to find! You can read the code
[here](https://github.com/LadybirdBrowser/ladybird/blob/3850214aac1b84356d7f2ae1a4eb0079884ec2a9/Tests/LibWasm/test-wasm.cpp#L260).

## SIMD Bitwise Operations

I saw that some SIMD instructions such as:

- `v128.not`
- `v128.and`
- `v128.or`
- etc.

weren't implemented, and they seemed like low-hanging fruit, since they're just
bitwise operations on a `u128`. I've been staying away from SIMD, but this was
_too hard_ to just ignore! I implemented them in a few minutes and a bunch of
tests pass now.

This leads me into my next announcement...

# Expanding the Goal

We've reached nearly full spec-compliance (minus SIMD) _much faster_ than I
thought we would.[^summer] I initially decided to ignore SIMD tests because very
few compilers take advantage of Wasm SIMD, even though it's part of the
specification. But, since we have the extra time, **why not go for 100% for
real**? The whole WebAssembly 2.0!

I did [an experiment with SIMD](https://dzfrias.dev/blog/simd-backed-strings/) a
few weeks ago, and I feel comfortable enough to implement it.
[Another Ladybird contributor](https://github.com/Enverbalalic) has been stuck
on [a big SIMD PR](https://github.com/LadybirdBrowser/ladybird/pull/159) for a
while now, so I think the first thing to do is to start there!

# Wrap-Up

With a good amount of things just pushed to the to-do list, I once again invite
you to help out! We can _definitely_ get to 100% by the end of the summer; the
existing progress has been a testament to that.

From a personal perspective, I've really enjoyed contributing to the project.
I've learned a lot of modern C++ (even a little bit of template magic!), and I
truly believe in the project's mission.

As always, if you have any issues, questions, or feedback about the post, feel
free to post an issue on
[this website's GitHub repo](https://github.com/dzfrias/website/issues/new)!

[^simd]:
    This does not include SIMD tests, but you'll read more about that later :)

[^nan]:
    I'd recommend checking out [float.exposed](https://float.exposed/0x7fc00000)
    to play around with the number of `NaN`s there are!

[^boxing]:
    This isn't fully true. Most JS implementations (including Ladybird's) do
    something called
    [NaN boxing](https://craftinginterpreters.com/optimization.html#nan-boxing),
    which essentially exploit the idea that `NaN` bit patterns are arbitrary to
    the effect of storing extra information inside `NaN` values. That's actually
    the reason why `NaN`s are canonicalized in the first place (so there's "one
    true NaN")!

[^impl]:
    This canonicalization behavior is not part of the JS standard, but is common
    among JS implementations.

[^summer]: We're only about halfway through the summer!
