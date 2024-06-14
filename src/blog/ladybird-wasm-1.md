---
title: "Ladybird WebAssembly Update #1"
description: My second update on the Ladybird WebAssembly implementation.
date: 2024-06-13
---

It's been a little over a week since
[my first post](https://dzfrias.dev/blog/ladybird-wasm-0/) regarding the
[Ladybird](https://ladybird.dev/) web browser! For a quick recap: I've set a
goal to get the Ladybird [WebAssembly](https://webassembly.org/) virtual machine
to full spec compliance **by the end of the summer**. Why, and what is
WebAssembly? I think the original post explains it pretty well, so go check it
out if you're interested in that.[^1]

Anyway, some great progress has been made, and not just by me! Here's a short
list of the things I've done:

1. Finish the
   [UTF-8 validation fix](https://github.com/LadybirdBrowser/ladybird/pull/96).
   Update #0 explains
   [my troubles with this PR](https://dzfrias.dev/blog/ladybird-wasm-0/#challenges-thus-far)
2. Finish the new spec test generator
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/41) and
   [my last update](https://dzfrias.dev/blog/ladybird-wasm-0/#test-generation))
3. Validate imports more thoroughly
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/130))
4. Make loops work
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/148))
5. Tighten validation algorithm
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/147))
6. Tiny `memory.fill` fix
   ([see PR](https://github.com/LadybirdBrowser/ladybird/pull/149))
7. Miscellaneous validator fixes (see
   [this PR](https://github.com/LadybirdBrowser/ladybird/pull/134) and
   [this PR](https://github.com/LadybirdBrowser/ladybird/pull/97))

# Reflection

From these PRs, we've gone from 1k+ failing tests[^2] to just over 200! I'd say
the most impactful PRs were 1 through 5. 6 and 7 were pretty small, fixing at
most 3 tests per commit included.

The largest changes code-wise were definitely 3 and 5.

In 3, I validated that import and export types matched. This was my first _real_
foray into the code base, because it required me to write more code than I was
getting rid of.

In 5, I rewrote one of the core aspects of the validation algorithm (stack
polymorphism support). This allowed for some pretty important validation checks
to be made, like stack height validation.

It's worth noting that some of the most impactful changes I made required _very
little_ changes code-wise. Take the fourth PR I listed (making loops work). I
added two lines of code and deleted seven, but loops are fully spec-compliant
now, and we no longer have to skip the test file in CI! Pretty much all the
framework for the VM is already in place, but it just has a lot of minor issues
that cause major bugs. Another good example of small things making major issues
is PR 6 (`memory.fill`). The bug here was a result of a typo and a _small_ spec
misunderstanding (probably). Yet, it cut down the number of failed tests by 200
alone.

## New WebAssembly contributor

A user named [Enverbalalic](https://github.com/Enverbalalic) has been
contributing to the SIMD side of the Wasm VM! With their help, we might actually
be able to get full spec compliance (**SIMD included**) by the end of the
summer! I hope they keep working on it, because I know absolutely nothing about
SIMD nor how it works in WebAssembly!

# Conclusion

And that's it for this update! I'm trying to keep these small and easily
digestible by intention. I'm not going into the weeds about the changes I'm
making, but I recommend reading my PRs and the relevant spec pages if you're
interested. The [specification](https://webassembly.github.io/spec/core/) isn't
too hard to read if you're just getting into it!

As always, if you have any feedback or questions, make sure to
[submit an issue](https://github.com/dzfrias/website/issues/new) on this blog's
GitHub repository!

[^1]: Or don't.
[^2]: I'm not including SIMD as part of the spec-compliance goal.
