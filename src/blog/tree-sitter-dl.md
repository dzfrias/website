---
title: Neovim and Tree-Sitter Post-Archival
description:
  "This post introduces a replacement for nvim-treesitter: a simple Python
  script for managing tree-sitter parsers."
date: 2026-05-26
---

On April 3rd, 2026, the lauded
[nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter) was
archived, due to maintainer burnout.[^burnout] This post introduces
**tree-sitter-dl**, a simple Python script I wrote to replace one of the primary
functionalities of nvim-treesitter: **parser installation**. My goals for the
script were the following:

- Easy to use
- No dependencies, other than the obvious ones[^dependencies]
- Flexible
- Fast enough

If you want to get started using tree-sitter-dl, check out
[the GitHub repository](https://github.com/dzfrias/tree-sitter-dl). In the rest
of this post, I will go over the main features of the script.

# Overview

I will walk through installing a parser for the
[Zig programming language](https://ziglang.org/). Basic parser installation
looks like this:

```text
./tree-sitter-dl.py install zig
```

This will install parsers, queries, and a lock file into the following locations
depending on your OS:

| OS      | Path                                                   |
| ------- | ------------------------------------------------------ |
| Unix    | `$XDG_CONFIG_HOME/nvim` or `~/.config/nvim`            |
| Windows | `%LOCALAPPDATA%\nvim` or `%USERPROFILE%\AppData\Local` |

This should be the location of your Neovim config directory. If you would like
to specify an installation location instead, use the `-o` option:

```text
./tree-sitter-dl.py install zig -o my-install-dir
```

Make sure that the installation location is in your Neovim `runtimepath` so that
Neovim can find it![^rtpath] Now try editing a `.zig` file with this content:

```zig
const std = @import("std");

pub fn main(init: std.process.Init) !void {
    std.debug.print("All your {s} are belong to us.\n", .{"codebase"});
}
```

You shouldn't see any tree-sitter highlights yet! To activate them, run
`:lua vim.treesitter.start()`! If you want to automate this process, the
following into `ftplugin/zig.lua`:[^ftplugin]

```lua
vim.treesitter.start()
-- Uncomment if you want tree-sitter folding
-- vim.wo[0][0].foldexpr = 'v:lua.vim.treesitter.foldexpr()'
-- vim.wo[0][0].foldmethod = 'expr'
```

## Specific Parser Repositories

Many languages have multiple different tree-sitter parser implementations. For
example, for Lua, there's:

- [Azganoth/tree-sitter-lua](https://github.com/Azganoth/tree-sitter-lua)
- [tjdevries/tree-sitter-lua](https://github.com/tjdevries/tree-sitter-lua)
- [tree-sitter-grammars/tree-sitter-lua](https://github.com/tree-sitter-grammars/tree-sitter-lua)

`tree-sitter-dl` will automatically try to select the best implementation. If
you have a specific implementation in mind, though, you can run something like:

```text
./tree-sitter-dl.py install lua:https://github.com/Azganoth/tree-sitter-lua
```

If you want to get more specific, like retrieving a specfic version, run:

```text
# Tag
./tree-sitter-dl.py install lua:https://github.com/Azganoth/tree-sitter-lua@v2.1.3
# Commit SHA
./tree-sitter-dl.py install lua:https://github.com/Azganoth/tree-sitter-lua@7ab58496586502285a944e380b2cf05339035844
# Branch
./tree-sitter-dl.py install lua:https://github.com/Azganoth/tree-sitter-lua@shebang-magic
```

This flexibility is important for some parsers. For exmaple, I personally use
the following to install my Python parser:

```text
./tree-sitter-dl.py install python:https://github.com/tree-sitter/tree-sitter-python@v0.25.0
```

## Uninstalling

Run the following to uninstall parser(s):

```text
./tree-sitter-dl.py uninstall zig
```

**DO NOT REMOVE THE PARSER FILES YOURSELF**! Trying to do so might mess up the
lock file that tree-sitter-dl maintains.

## WebAssembly

By default, parsers are shared libraries (i.e. `.so`, `.dll`, or `.dylib`
files). Thus, you should only install trusted parsers from trusted sources on
your machine, because if a parser is run, it can do anything it wants (under
your user permissions).

However, if your parser is bundled as a [WebAssembly](https://webassembly.org/)
module, you can achieve both portability _and_ safety. tree-sitter-dl supports
this:

```text
./tree-sitter-dl.py install zig --wasm
```

Note that, to use WebAssembly parsers, Neovim must be built with
`ENABLE_WASMTIME`. Check out the [Neovim docs](https://neovim.io/doc/build) for
building from source. Fair warning: this feature is **somewhat incomplete**; I
ran into numerous different crashes while running Neovim like this.[^time]

## Listing Installed Parsers

Installed parsers can be listed like this:

```text
./tree-sitter-dl.py list
```

It is useful to use the `-v` flag for more detailed output:

```text
./tree-sitter-dl.py list -v
```

# Wrap Up

I hope this post was helpful! If you interested in tree-sitter-dl, check out
[the GitHub repository](https://github.com/dzfrias/tree-sitter-dl). The script
is not perfect, but I hope it gets the job done for you.

As always, if you had questions, comments, or issues with this post, let me know
by [posting an issue](https://github.com/dzfrias/website/issues/new).

[^burnout]:
    From what it looks like, one of the primary motivators of the burnout was
    the amount of
    [rude and uninformed comments](https://github.com/nvim-treesitter/nvim-treesitter/discussions/8627#discussioncomment-16440673)
    the maintainer received whilst rewriting nvim-treesitter. I hope this stands
    as a lesson to be kind to maintainers, and to not fall back to posting an
    issue at the first sign of hardship when using an open source project.

[^dependencies]:
    Python 3,
    [tree-sitter CLI](https://github.com/tree-sitter/tree-sitter/blob/master/crates/cli/README.md),
    and git should be in your `PATH`.

[^rtpath]:
    The location of your Neovim config should be in `runtimepath` already, so
    installation should work by default.

[^ftplugin]:
    If you haven't already, you can create `ftplugin/zig.lua` in your
    configuration directory.

[^time]: At the time of writing, of course.
