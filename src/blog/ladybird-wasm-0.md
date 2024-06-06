---
title: "Ladybird WebAssembly Update #0"
description:
  The first of (ideally) many updates about the Ladybird WebAssembly
  implementation.
date: 2024-06-02
---

By the end of the summer, I want to make the Ladybird browser's WebAssembly
implementation 100% spec-compliant. [Ladybird](https://ladybird.dev/) is a new
browser engine being developed **from scratch**, free, open source, and not
backed by a massive company. Like many people, I discovered the project through
Andreas Kling, the
[BDFL](https://en.wikipedia.org/wiki/Benevolent_dictator_for_life) of the
project. On his [YouTube channel](https://www.youtube.com/@awesomekling), I
watched a video where he mentioned that the
[WebAssembly](https://webassembly.org/) (a.k.a. Wasm) virtual machine needed
quite a bit of work before being reliable for use in the browser. After taking a
look at how the VM fared against the official testsuite, I found myself sharing
that opinion.[^disclaimer]

Kling's YouTube videos had been a big inspiration for me in the past, and
independent browser engines are
[something I really believe in](https://dzfrias.dev/blog/ungoogled-chromium/).[^we-need-more]
So, since I've had some [experience](https://github.com/dzfrias/wsh) with Wasm
already, I decided that it's a reasonable goal to get the Ladybird VM to full
spec-compliance. There's a lot of work to do, but I believe that we can get
there by the **end of the summer**. In this post, I will go over what I believe
it will take to reach this milestone, as well the challenges I've been facing
thus far.

# My To-Do List

After taking a look at the testsuite results, I've compiled a list of things
that the Wasm implementation needs (ranked in order of importance):

1. A (fully) working spec-test generation script
2. A better validator
3. A better linker
4. All memory instructions implemented
5. All table instructions implemented
6. Float weirdness
7. SIMD
8. Multi-memory
9. Other proposals

7, 8, and 9 I don't consider part of the spec-compliance goal. They're things I
can imagine getting done post-summer. Yes, SIMD is _technically_ part of the
Wasm 2.0 spec, but most compilers don't take advantage of it.

## Test Generation

Wasm spec-test files are written in a special superset of the
[WebAssembly text format](https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format).
Currently,
[a script](https://github.com/LadybirdWebBrowser/ladybird/blob/f0aa378dabd00e4e5ce065fc5e6ef033cb0e923a/Meta/generate-libwasm-spec-test.py)
parses these files manually and generates the corresponding Ladybird unit tests.
The script misses a lot of tests, though (or generates incorrect outputs). I
believe that fixing this script is the **highest priority** problem. I have a
[PR open](https://github.com/LadybirdWebBrowser/ladybird/pull/41) right now, but
it's still a draft. Everything works, but I just haven't added support for SIMD
tests. Even though it hasn't been merged, the new script has unveiled _a lot_ of
crashes and undefined behavior (I use it locally).

I also didn't know about the validator problems before switching to the new
generator. WebAssembly has a post-parse step called **validation**, where
everything is type-checked to make sure invalid states don't show up at runtime.
Previously, the vast majority of validator spec-tests were getting skipped!

## The Validator & Linker

The validator needs a lot of work. Thankfully, it never gives false negatives,
but there are _a ton_ of false positive scenarios. I'd say that this is
(probably) the biggest contributor to failing tests. Fortunately, the Wasm
specification handily gives us a
[pseudocode algorithm](https://webassembly.github.io/spec/core/appendix/algorithm.html)
for the validation process. I haven't analyzed what's wrong with the validator,
but I'm assuming that the core algorithm has some bugs.

Like the validator, I haven't analyzed the tests that the linker fails in, but I
see a lot of them. Certainly less than validation tests, but many tests
nonetheless. Aside from the float weirdness, I think that fixing this will be
the most painful part of the project for me.

## Memory & Table Instructions

There are a solid amount of tests either failing because:

1. A memory instruction was implemented incorrectly or
2. a memory or table instruction hasn't been implemented yet.

In my opinion, memory and table-related instructions are one of the most
complicated parts of the spec. Most WebAssembly instructions aren't very
complex, but there are definitely exceptions. I don't expect that rounding out
these instructions will take too long, but I don't know at this point in time.

# Challenges Thus Far

The journey to 100% _will not_ be, and has not been, an easy thing to do. I've
been working on the Ladybird project for around a week now, and there's
definitely been some issues. First and foremost, I'm **not** a C++ programmer.
Most of what I know comes from Rust. I get uncontrollably confused seeing crazy
template logic, trying to decipher macros, and using the build system.[^build]

Additionally, since the Wasm implementation is part of a larger ecosystem (for
the browser), changing code related to the VM can _easily_ break other parts of
the system. For example, I've been trying to make a small patch to the
[UTF-8](https://en.wikipedia.org/wiki/UTF-8) validator. Right now, it doesn't
reject strings that have surrogate code points,
[as it should be doing](https://datatracker.ietf.org/doc/html/rfc3629#page-5).
When I made the fix, it broke part of the JS implementation! And I'm not
familiar with how the JS engine works, so trying to work out what's going on has
been immensely challenging. Fortunately, Ladybird has a
[Discord server](https://discord.gg/nvfjVJ4Svh), and I intend to ask some
questions on there.

# Wrap Up

I'm excited to see what I can do for Ladybird's Wasm implementation! I think
100% by the end of the month is a reasonable goal, even with the numerous
challenges. In just this last week, I feel like I've been able to make a
difference in the codebase. I'll continue to post updates, though they'll likely
be smaller than this one. If you're reading this and are interested in helping
out, then please do!

Projects like Ladybird embody the beauty of open source software. I often
thought that writing a browser engine was impossible. But, with Ladybird, I've
asked myself the question: why not just do it? And the knowledge that thousands
of people around the world will be working on it together, for no other reason
than just for the belief in the project, is very motivational indeed.

[^disclaimer]:
    Short disclaimer: the Wasm implementation is by no means the most important
    part of the browser, and it would be wrong to paint it as such. I'm happy
    that the core maintainers are focusing on making the JavaScript and layout
    engine spec-compliant.

[^we-need-more]:
    Seriously, we need more than just Chromium, Firefox, and WebKit.

[^build]: It took me two hours to set up the specification test suite...
