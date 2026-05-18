---
title: The Tools I Use - 2026
description:
  Here are the tools I use, both for writing code and daily life, 2026 edition.
date: 2026-05-18
---

This is the second installment in a [series of posts](/blog/tools-2024) in which
I go over the tools and applications that I use to manage my life and write
code. A decent amount has changed over the past year and a half, so I figured
this is a good a time as ever to write an update!

I'm not going to provide specific details on anything that I go over; if those
details are something you're interested in, check out
[my dotfiles](https://github.com/dzfrias/dotfiles) repository.

# Daily Life

I'm going to go over the applications I use for non-programming purposes. I'll
list the stuff that hasn't changed since the last post first.

## Things

I said it in the last post and I'll say it again:
[Things](https://culturedcode.com/things/) is a keystone app in my life. I would
_highly_ recommend this app to literally anyone. Things is a simple to-do app at
its core, but its quality is unmatched! Its ease-of-use allows me to sketch
plans I have for the next 30 minutes, and its well thought out functionality
allows me to draw out the plans I have for five years in the future.

Things has such a smooth, simple interface that using it is a reflex for me at
this point. I think of it less as a to-do app and more as a catalogue of
everything worth thinking about that has crossed my mind.

{% img "things.png", "One of my project-specific to-do lists" %}

## Alfred

Alfred is a better spotlight search for macOS. It is the main way I move around
my computer.

{% img "alfred.png", "Alfred in action" %}

Here are a few helpful features, some of which are built-in but most of which
are something I programmed in:

- Alfred has a built-in calculator!
- Alfred allows searching through clipboard history
- Typing "ghd" opens the GitHub dashboard
- Typing "zig" allows me to search through the Zig docs
- Certain keybinds open frequently used apps (for example, ctrl-opt-s opens
  Safari)
- Many custom scripts: for example, "char" brings up the metadata of the
  provided Unicode code point

{% img "alfred2.png", "Alfred in action using a custom script" %}

My dotfiles have a
[dedicated Alfred section](https://github.com/dzfrias/dotfiles/extra/alfred) if
you want to see all my scripts.

## Safari

A big change I made this year was switching from
[ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium)
to Safari. I do have a [whole blog post](/blog/ungoogled-chromium) solely
dedicated ungoogled-chromium, yes. This was not due to a fault of
ungoogled-chromium, nor a specific feature of Safari. Rather, this change is a
consequence of a larger philosophical in how I approach configuration:

I've come to believe in the idea of getting as minimal configuration as
possible. It is my opinion that being able to be productive while given the
bare-minimum is a skill; moreover, it is a fun challenge. My configuration a
year ago featured many of niche apps (like ungoogled-chromium), dozens of
[Neovim](https://neovim.io) plugins, countless zsh aliases, and tons of small
CLI tools. None of these things are bad, but I wanted to challenge myself and
strip that all away.

Using Safari, the default web browser on macOS, certainly also follows from the
"stick to defaults" mentality. In the [Neovim section](#neovim) of this post,
you can read further about how I applied this philosophy for stripping my Neovim
configuration to the minimum I felt comfortable using.

I use one Safari extension: [Wipr](https://kaylees.site/wipr2.html). Wipr is the
best adblocker that I've come across for Safari! It does cost a few dollars
though, but it is definitely worth it and does not have an annoying
subscription-based monetization scheme.

## Apple Mail

I switched from [Thunderbird](https://www.thunderbird.net/en-US/) to Apple Mail
for my email client, again in the name of preferring defaults. I don't like
Apple Mail all that much, and although good work has been done on my email
client project, it is not ready for day-to-day usage yet.

So for now, Apple Mail is good enough.

## Apple Calendar

My calendar is managed through Apple's calendar app. Again, not much thought
behind this other than that it is the default. It is not the most pleasant app
to use, so until I make my own, I'm stuck with it.

# Programming

I will now go over the programming tools I use! Not much has changed since last
year, but there are a few things worth noting.

## Neovim

[Neovim](https://neovim.io/) is my go-to text editor for programming: it's
configurable, fast, and most importantly, **fun**. My configuration, though, has
gone through _a lot_ of changes over the past few years. Continuing that trend,
2026 brough a huge change: I deleted most of my setup. Following the same
philosophy as in [my switch to Safari](#safari), I decided to challenge myself
to use as little as possible, while still keeping my favorite keybinds,
patterns, and settings, of course.

I have nearly the same functionality as before, but with a lot less. You can
read my [my Neovim dotfiles](https://github.com/dzfrias/dotfiles/.config/nvim)
for specifics. It's small, so it should be easy to read and adapt for your
needs!

{% img "nvim.png", "Writing code in Neovim" %}

Anything that I didn't think was worth using a plugin for, I implemented myself.
For exmaple, I wrote my own integration with auto-formatters instead of using
one of the many plugins.

## zsh

The pre-installed macOS shell, [zsh](https://zsh.sourceforge.io/), has been my
main shell for a while now. Although I have many gripes with POSIX shells, they
always get the job done.

As I said in the last post in this series, I've stayed away from non-POSIX
shells like [nushell](https://www.nushell.sh/). While I think these projects are
great, and I do believe that the POSIX shell standard will be overcome at some
point, it is my opinion that **the right abstractions**, ones that strike a
balance between convenience for users while also maintaining simplicty, have not
been settled on.

In the next few paragraphs, I will present my argument for why some flagship
features in modern shells _do not_ align with what a shell's role is as a tool
for programmers.

A common point of contention between old and new shells: do shell languages need
to be good scripting languages? zsh certainly doesn't think so[^zsh], but many
modern shells do. In this case, I stand on the side of zsh, for the reason that
there are many very good existing scripting languages that work well with
shells, such as [Python](https://www.python.org). Python, with its features,
popularity, robustness, and vast standard library, will _always_ be a better
programming experience than any shell langauge. Python is also installed
natively on many machines.

Another thing I see a lot of new shells doing is providing better graphical
interfaces, using colors, interactive terminal text, TUIs, etc. I think shells
_should_ have syntax highlighting and decent status bars, but doing too much can
quickly lead to violating one of the core principles of the
[Unix philosophy](https://en.wikipedia.org/wiki/Unix_philosophy): text programs
should have simple, predictable outputs. nushell has made the intentional choice
to grow past this philosophy, as builtins output typed data, not just plain
text. While it is interesting to see what is possible with such a system, I
think raising the level of abstraction for program input and output is not
viable for practical use. Processes spawned by the OS are given unstructured
input bytes, and are expected to yield unstructured output bytes. To me, shell's
job is to mirror and expose this behavior, not abstract above it.

{% img "zsh.png", "my zsh prompt" %}

This was all a very long-winded explanation as to why I have stayed with zsh.
Despite this, I support experimenting with bringing modern ideas to shells. In
fact, I've written [my own shell](https://github.com/dzfrias/wsh) that has a
[WebAssembly](https://webassembly.org) twist! The POSIX shell standard _will_ be
replaced; we just need to find the alternative that checks all the boxes.

You can read [my .zshrc](https://github.com/dzfrias/dotfiles/.zshrc) for
specific details about my configuration.

## Ghostty

I now use [Ghostty](https://ghostty.org) for my terminal. Not only that, but it
also replaced [tmux](https://github.com/tmux/tmux), which I never though I would
do!

Here are the things I like about Ghostty:[^zig]

- It has sane defaults but doesn't go over the top
- It actually has a good window multiplexing system
- It integrates with native macOS APIs
- It isn't annoying to configure

These factors combined make Ghostty my preferred terminal. Although there are
many terminals, they all fall short in some way against the criteria above.
[iTerm](https://iterm2.com), for example, is hard to configure and has less than
ideal defaults. Another option is the default macOS terminal, but most modern
programs (like Neovim) aren't very compatible with it.

{% img "ghostty.png", "the Ghostty terminal in action" %}

# Wrap Up

I hope you enjoyed this post, and got a basic understanding of how I like using
my computer! I plan on continuing this series so I can document how my tools and
apps change over time.

If you have any feedback, comments, or questions, feel free to
[submit an issue](https://github.com/dzfrias/website/issues/new) on this
website's GitHub repository.

[^zsh]: zsh is a pretty unpleasant scripting language...

[^zig]: It's also written in Zig!
