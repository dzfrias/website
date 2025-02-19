---
title: Understanding Zig Build Options
description:
  This post walks through setting up build options in Zig for use in
  compile-time code.
date: 2025-02-18
---

**Build options in Zig** are extremely powerful and very versatile, but getting
started with them can be a bit of a struggle: the
[standard library docs](https://ziglang.org/documentation/0.13.0/std/) don't
explain much, and the fact that there are four _very different_ build-related
methods with `option` in their names also doesn't help.[^name]

After spending some time figuring it out myself, I'm writing this post to give a
quick guide on how to set up simple build options for your Zig project! This
post was made for Zig 0.13.0 and 0.14.0.

# The Goal

We want to be able to:

1. Specify certain options to be parsed in the `zig build` command
2. Use those options in the `build.zig` script
3. Access those options in source files using `@import`

The following sections will show how to do each of those things in the order
listed above!

# Option Parsing

Let's say you want to add a build flag, `simd`, that enables
[SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data)
algorithms for hardware that can use it. First, in our `build.zig`, we need to
specify that the flag exists so that it can be parsed:

```zig
pub fn build(b: *std.Build) !void {
    // ...
    const simd = b.option(
        bool,
        "simd",
        "Enables/disables support for SIMD algorithms",
    ) orelse false;
    // ...
}
```

The three arguments are pretty simple here: type, name, and description.
`b.option` will return `null` if the option was not specified in the build
command, so we're using `orelse false` to configure the **default value** for
the flag.

This will make `zig build -Dsimd` or `zig build -Dsimd=true` set the `simd`
variable to true in your build script!

> You can use more than just booleans flags, though! Strings, enums, numbers,
> and pretty much any other primitive type you can think of can be made into a
> build option. Just change the type argument!

# Using Options

Telling Zig to parse options is pretty simple, but actually _using_ those
options at compile-time in source code can get a bit confusing. Here's how to do
it, in one go:

```zig
pub fn build(b: *std.Build) !void {
    // ...
    const simd = b.option(
        bool,
        "simd",
        "Enables/disables support for SIMD algorithms",
    ) orelse false;

    const options = b.addOptions();
    options.addOption(bool, "simd", simd);

    // Assuming `exe` was defined earlier
    exe.root_module.addOptions("build_options", options);
    // ...
}
```

I'll break it down step-by-step:

1. We create a new
   [`Options`](https://ziglang.org/documentation/master/std/#std.Build.Step.Options)
   instance using
   [`b.addOptions`](https://ziglang.org/documentation/master/std/#std.Build.addOptions).
   Think of it like a key-value data structure **that is empty at
   first**.[^correspondence]
2. We add an entry for our `simd` flag using
   [`options.addOption`](https://ziglang.org/documentation/master/std/#std.Build.Module.addOptions).
3. We tell our build artifact (in this scenario, an executable) to make our
   build options importable under the name of `build_options`.

Now, in our source files, we can access the `simd` flag:

```zig
const build_options = @import("build_options");

pub fn find(needle: u8, haystack: []const u8) ?usize {
    if (build_options.simd) {
        // Special vectorized byte search implementation
    } else {
        // Normal byte search algorithm
    }
}
```

# Wrap-Up

I hope this post was useful! In the future, once Zig stabilizes, hopefully
little things like this will be better documented. But for now, posts like this
will have to do. Zig's philosophy for build options makes a lot of sense, but
its flexibility is a bit uncanny when coming from other languages like Rust or
C++.

As always, if you found any issues or have any suggestions related to this post,
[open an issue](https://github.com/dzfrias/website/issues/new) in this website's
[GitHub repository](https://github.com/dzfrias/website)!

[^name]:
    For reference, I'm talking about:
    [`std.Build.option`](https://ziglang.org/documentation/master/std/#std.Build.option),
    [`std.Build.addOptions`](https://ziglang.org/documentation/master/std/#std.Build.addOptions),
    [`std.Build.Module.addOptions`](https://ziglang.org/documentation/master/std/#std.Build.Module.addOptions),
    and
    [`std.Build.Step.Options.addOption`](https://ziglang.org/documentation/master/std/#std.Build.Step.Options.addOption).
    None of them are similar. Don't worry, I'll cover each one individually in
    the post!

[^correspondence]:
    It actually has _no_ relation to `b.option`! A nice consequence of this is
    that you can include completely arbitrary metadata in your build options;
    they don't even have to be tied to command line arguments!
