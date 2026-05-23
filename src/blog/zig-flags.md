---
title: A Copy-Paste Flag Parser for Zig
description:
  A command line argument parser for Zig that focuses on a small code footprint.
date: 2026-05-23
---

In a couple of my [Zig](https://ziglang.org/) projects, I've needed the ability
to parse command line arguments. There are many existing libraries that do this,
but none of them felt quite right. Some allocated more than I thought was
necessary; others did IO for me (like exiting, error codes, printing, etc.), or
formatted diagnostics in a way I didn't like.

I wanted a minimal flag parser that did none of these things. So I wrote a
small, simple library with a declarative interface inspried by Rust's
[clap](https://docs.rs/clap/latest/clap/):

```zig
const flags = @import("flags.zig");

pub fn main(init: std.process.Init) u8 {
    var args_it = init.minimal.args.iterate();
    _ = args_it.next();
    const result = flags.parseFromIterator(Flags, args_it, init.gpa) catch {
        // Handle OOM
        return 1;
    };
    const options = switch (result) {
        .flags => |f| f,
        .err => |e| {
            // Handle/format error
            return 1;
        },
    };
    if (options.help) {
        // Print help (write your own!)
    }
    // ...
}

const Flags = struct {
    // Collects multiple arguments
    inputs: []const []const u8,
    encoding: enum { utf8, utf16, utf32 } = .utf8,
    help: bool,

    // Denotes positional arguments
    pub const positionals = .{
        .input = void,
    };
    // Denotes the short versions of arguments
    pub const shorts = .{
        .encoding = 'e',
        .help = 'h',
    };
    // Denotes flags that override required arguments
    pub const standalone = .{
        .help = void,
    };
};
```

What you see above is pretty much the entire API surface. It is compatible with
Zig 0.16.0. If this fits your needs, check out the [Usage section](#usage).

Here are some things `flags.zig` does not have:

- Subcommands
- Renaming (prefer Zig's `@"extended-identifier"` syntax)
- Complex argument dependency specifications: all arguments are required unless
  otherwise specified
- Argument aliases
- Custom value parsers (use `[]const u8` and write your own!)
- Validation

If you want one of these features for your project, feel free to create your own
version of `flags.zig`!

# Usage

I haven't put `flags.zig` on any Git hosting website. That might wound weird,
but I have a good reasons:

1. It is about ~500 lines of code
2. It is very barebones
3. Zig isn't stable

In this scenario, I think it's best for users to take management of `flags.zig`
into their own hands; I do not want to give the impression that `flags.zig` is a
dependency that will be maintained and grown over time. The features I've added
are the features I need, and I don't expect to be write any more. Also, Zig
changes a lot in between versions. As of this post, IO was completely re-worked,
and process arguments are no longer available globally!

For these reasons, I would much rather have someone **copy-paste** `flags.zig`
into their project, therefore taking responsibility for it. See the
[Code section](#code) for the whole file.

In general, I believe **copy-paste dependencies should be normalized in modern
software development**, as it encourages programmers to take ownership of their
dependencies as opposed to relying on them blindly.[^small] Ecosystems like
JavaScript's and Rust's encourage enormous dependency graphs; this can lead to
headaches, unnecessary code bloat, and security risks.

Copy-paste inclusion is common in large C and C++ projects, and while the ease
of language package managers has stimulated fast iteration in modern software, I
believe it can have harmful effects on the language's ecosystem as a whole.

# Writing flags.zig

On a different note, I have some thoughts on the experience of writing
`flags.zig`. It involved writing a lot of compile-time code, something Zig can
do with unparalleled quality. Here are some of the things I wish I knew.

## Giant comptime Blocks

My first recomendation is to wrap comptime-only code in a giant `comptime`
block. For example, I found myself writing code like this:

```zig
fn hasVariadic(comptime T: type) bool {
    comptime var found = false;
    inline for (std.meta.fields(T)) |field| {
        if (std.mem.eql(u8, field.name, "variadic")) {
            found = true;
        }
    }
    return found;
}
```

While this works for small code blocks, it quickly gets unwieldy. Instead,
write:

```zig
fn hasVariadic(comptime T: type) bool {
    return comptime f: {
      var found = false;
      for (std.meta.fields(T)) |field| {
          if (std.mem.eql(u8, field.name, "variadic")) {
              found = true;
          }
      }
      break :f found;
    };
}
```

In the second version, Zig doesn't have to do any fancy runtime/comptime
inference, whereas the first version leaves room for misunderstandings between
you and the Zig compiler.[^inference]

## Compile-Time Print

## Helpful Datatypes

EnumSet, EnumMap, FieldEnum

## Helpful Builtins

@field, @compileError, @hasDecl, @hasField

## Array Concatenation

++

# Wrap Up

# Code

[^small]:
    For large, complicated functionality that can be hard to maintain, I
    definitely think it's best to include an explicit dependency. But for small
    things like argument parsers, I don't think that's necessary!

[^inference]:
    In such cases, Zig has to figure what values are runtime-known and what
    values are comptime-known. This is a difficult task and can lead to
    confusing errors!
