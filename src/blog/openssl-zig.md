---
title: A Clean Build of OpenSSL using Zig
description:
  A Zig package that builds OpenSSL using the Zig build system, with no caveats
  or workarounds.
date: 2025-01-18
---

[openssl-zig](https://github.com/dzfrias/openssl-zig) is a working compilation
of [OpenSSL](https://www.openssl.org/) using the
[Zig build system](https://ziglang.org/learn/build-system/) that I've been
working on for the past couple of weeks. There are a few advantages of using Zig
to compile:

- Fast compile times
- Zig build scripts are easy to hack/modify
- Integration with Zig projects as a package

While there are other packages that aim to do the same thing, my goal for this
project was to build OpenSSL is the **cleanest way possible**, without hacky
workarounds or anything of that sort.

In this blog post, I'll go over what I learned and my thoughts on the Zig build
system as a whole. If you just want to read about the project, check out the
[GitHub repository](https://github.com/dzfrias/openssl-zig).

# Learning Zig Build

I came into this project knowing nothing about how to write Zig build scripts.
It took a while to know what was going on, especially given the lack of
up-to-date documentation.

The Zig docs do have [a tutorial](https://ziglang.org/learn/build-system/) of
sorts, but given how vast the possibilities are, it doesn't cover a lot of
ground.[^zig] I ended up learning how to do things in two ways:

1. Trial and error
2. Reading other build scripts

For the latter, I read the `build.zig` file of
[a different Zig compilation of OpenSSL](https://github.com/kassane/openssl-zig/blob/zig-pkg/build.zig).
While that project does a few things that I wanted to avoid in _my_ compilation,
it was a fantastic starting place. I also read the
[Ghostty](https://ghostty.org/) project's
[`build.zig`](https://github.com/ghostty-org/ghostty/blob/main/build.zig). It's
quite complex, but it showed me examples of more advanced things, like using the
[Run](https://ziglang.org/documentation/0.13.0/std/#std.Build.Step.Run) build
step.

## Lazy Paths

The [LazyPath](https://ziglang.org/documentation/0.13.0/std/#std.Build.LazyPath)
is one of the most important concepts in the Zig build system. Getting
comfortable with them is the **best** way to get good at Zig build, in my
opinion.

A `LazyPath` is the path of a file or directory that **may or may not** exist
yet. To understand why we need them, it helps to know about the design of Zig
build scripts. Zig builds are **declarative**, so there are two phases:

1. Telling Zig _how_ to build the project, in steps
2. Executing the steps in the specified manner

For example, in my project, one step of the build process is generating C files
to be included in the compilation.[^generated] Another step (the C compilation
step) depends on those files being built. This is where `LazyPath` comes in. At
the time of specifying the build steps (phase 1), the generated files _do not_
exist yet. So, in order to properly describe the compilation step, we need to
reference their _future_ locations.

# Closing Thoughts

Writing my first Zig build script was an enjoyable experience _after_ I got over
the first few hurdles. Until the language stabilizes, I suspect that this will
continue to be the case for newcomers.

I think it's a very viable replacement for [CMake](https://cmake.org/) (and
similar meta-build tools), on account of how much more programmatic everything
feels.

Make sure to check out [openssl-zig](https://github.com/dzfrias/openssl-zig) if
you're at all interested! I also wrote a
[HOW.md](https://github.com/dzfrias/openssl-zig/blob/main/HOW.md) in case you
want to learn more about the design of the project. I hope you enjoyed this
post!

[^zig]:
    This is not a complaint about the language! As of this post, Zig is at
    version 0.13.0 and is still growing. Once the language eventually
    stabilizes, good documentation will become fair expectation to have.

[^generated]:
    The OpenSSL project generates a lot of files _at build time_ using Perl, so
    I need to re-create that generation in my build scripts.
