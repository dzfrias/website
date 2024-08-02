---
title: "Ladybird WebAssembly Update #3"
description: My fourth update on the Ladybird WebAssembly implementation.
date: 2024-08-01
---

It's been a great few weeks since
[my last Ladybird browser update](https://dzfrias.dev/blog/ladybird-wasm-2/),
where I'm focusing on the [WebAssembly](https://webassembly.org/)
implementation, **LibWasm**. A few months ago, I set a goal: get LibWasm to pass
_the entire_ Wasm 2.0 specification test suite by the end of the
summer.[^original]

I'm happy to announce that **we've done it!** As of
[PR #851](https://github.com/LadybirdBrowser/ladybird/pull/851/), there are zero
failing Wasm spec-tests.

![A graph showing spec-test results over time](/img/ladybird-wasm-3/results.png)

It's been an amazing journey, and I'll go over the specific progress we made in
this post!

# Improvements

A lot of my effort these past weeks has been directed towards
[SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data), or
rather,
[WebAssembly's version of SIMD](https://github.com/WebAssembly/simd/blob/main/proposals/simd/SIMD.md).

I implemented/fixed the many of the Wasm SIMD instructions, including:

- Load and store ([PR](https://github.com/LadybirdBrowser/ladybird/pull/635))
- Min/max ([PR](https://github.com/LadybirdBrowser/ladybird/pull/605))
- Comparisons ($\lt$, $\ge$, etc.)
  ([PR](https://github.com/LadybirdBrowser/ladybird/pull/594))
- Integer conversions
  ([PR](https://github.com/LadybirdBrowser/ladybird/pull/719/commits/400dabf50d4f76d32455e5a83a6ba7d6dee9a292))
- Float conversions
  ([PR](https://github.com/LadybirdBrowser/ladybird/pull/719/commits/a1d55875af3a365ce0eaf8f779d902d4323d6e70))
- Bit shift right
  ([PR](https://github.com/LadybirdBrowser/ladybird/pull/794/commits/108065fe6f7755763163c66ebd485114bc4608a1))
- Shuffle and swizzle[^shuffle]
  ([PR](https://github.com/LadybirdBrowser/ladybird/pull/794/commits/b75a75350b32e2ec6f659abd9b7b3701a4f40ace))
- A bunch more miscellaneous ones

## iNxM PR Co-Author

I co-authored [a large PR](https://github.com/LadybirdBrowser/ladybird/pull/615)
that implemented the vast majority of the SIMD integer operations. The
[original PR](https://github.com/LadybirdBrowser/ladybird/pull/159) was written
by [Enver Balalic](https://github.com/Enverbalalic), but the author ran into
some annoying issues caught by UBSan, which I decided to try to help fix after a
few weeks.

It felt fantastic to check out someone's in-progress work and help out! Somewhat
anticlimactically, the undefined behavior was caused by C++'s implicit integer
conversions, which I've become more and more annoyed by over time...

## gcc Weirdness

Getting the Wasm SIMD testsuite to pass uniformly across macOS, Linux, clang,
and gcc was quite a chore. One such issue arose when implementing the swizzle
instructions.

Essentially, gcc has access to an
[intrinsic](https://en.wikipedia.org/wiki/Intrinsic_function) called
`__builtin_shuffle`. Our goal is to use this intrinsic for our SIMD swizzle
instructions. However, `__builtin_shuffle` and Wasm's swizzle actually have
**different behavior in edge-cases**!

A swizzle in Wasm _should_ look like this:

```wasm
(i8x16.swizzle
  (v128.const i8x16 10 241 -3 0 1 -15 3 23 24 25 90 244 180 4 77 31)
  (v128.const i8x16 15 1 2 3 4 5 6 7 8 9 10 11 12 13 14 0))
;; This will return a vector with the first (index 0) and last (index 15)
;; elements swapped!
;; (v128.const i8x16 31 241 -3 0 1 -15 3 23 24 25 90 244 180 4 77 10)
```

When index vector has indices that are out of bounds, (i.e. -10 or 18), Wasm
says to put a 0 in the output vector, like so:

```wasm
(i8x16.swizzle
  (v128.const i8x16 10 241 -3 0 1 -15 3 23 24 25 90 244 180 4 77 31)
  (v128.const i8x16 -10 16 100 -1 87 99 18 -1 -1 -1 -1 -1 -1 -1 -1 15))
;; All zeroes except for the last element:
;; (v128.const i8x16 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 31)
```

How does `__builtin_shuffle` work? It wraps those invalid indices modulo 16 and
proceeds from there, which is very different behavior!

Since I'm on macOS, clang is an unescapable default,[^symlink] and clang
**doesn't** have the `__builtin_shuffle` intrinsic! I tried to compile Ladybird
using gcc, but ran into a ton of problems, so fixing this was a little
difficult.

The fix wasn't too difficult itself, but actually getting gcc working _was_.

## Optimizations

I optimized the parser quite a bit, making it fast enough to instantiate
`spidermonkey.wasm` (a 5.4mb file) in 140ms, compared to the initial 450ms.

I'm going to write a dedicated post about this in the future, so stay tuned for
that!

# Going Forward

It's taken a good amount of work to the point of full spec-compliance, which was
made possible by [Ali](https://github.com/alimpfard), who maintains LibWasm
and gave feedback on a lot of my PRs. But, even though my goal has been
completed, I'm _nowhere_ near done hacking on Ladybird!

Right now, complex Wasm websites are nearly unusable because of how slow the
bytecode interpreter is. In the next few weeks, I think I'll focus my efforts on
that front![^romberg]

Also, I've recently been branching out a little bit into other areas of the
browser. I implemented the `:has()` pseudo-class in
[this PR](https://github.com/LadybirdBrowser/ladybird/pull/613). More of that
work is to come!

[^original]:
    You can read my [original post](https://dzfrias.dev/blog/ladybird-wasm-0/)
    for more details!

[^shuffle]:
    Fun fact: both shuffle _and_ swizzle instructions re-order the lanes of a
    vector based on a set of indices. The difference is that a shuffle's indices
    are statically defined!

[^symlink]: The `gcc` command on macOS is actually just a symlink to `clang`...
[^romberg]:
    My [integral calculator website](https://dzfrias.github.io/romberg/) does
    work, though!
