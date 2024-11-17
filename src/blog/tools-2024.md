---
title: The Tools I Use - 2024
description:
  Here are the tools I use, both for writing code and daily life, 2024 edition.
date: 2024-11-15
---

In this post, I'll share some of the tools I've used this year, both for
programming and for daily life. Expect some apps to be macOS specific, but most
will have Linux/Windows equivalents.

I won't list _every_ detail of my setup; I'll be showing the most important
parts. But if you want a super in-depth look into my programming setup, check
out [my dotfiles](https://github.com/dzfrias/dotfiles), which are public on
GitHub.

# Daily Life

First, I'll go over software that isn't necessarily related to programming (but
note that most of these work well with my programming workflow).

## Things

[Things](https://culturedcode.com/things/) is _by far_ the most irreplaceable
app in my life. I've been logging to-dos in it since 2021, and I use it for
pretty much everything:

- Life tasks
- Reminders
- Calendar
- Programming projects
- Quick notes

What makes Things so great is its **simplicity**. It has a remarkably small
interface for a to-do app, and it gets everything just right. It strikes the
perfect balance between functionality and staying minimal.

![Things window](/img/tools-2024/things.png)

Although it does have an up-front cost, I _highly_ recommend it for anyone
looking to just get stuff done. Things's system is simple, opinionated, and
fast. Once you learn how to use it, I guarantee you won't be able to leave.

## Alfred

[Alfred](https://www.alfredapp.com/) is like a configurable macOS spotlight
search; you can use it to open apps, find things in your file system, go through
clipboard history, do math, open frequently visited websites, and more.

Alfred is the central hub of my computer, allowing me to open my most frequently
visited things (like Things or GitHub) in a few keystrokes.

![Alfred prompt](/img/tools-2024/alfred.png)

You can use the free version of Alfred for most things, but a paid version is
available for people who want it.[^one-time]

## Thunderbird

Right now, I'm using [Thunderbird](https://www.thunderbird.net/en-US/) to read
emails. I haven't been able to find a good email client that I don't have to
sell my left kidney for, so until I make my own, Thunderbird will do.

I don't use any add-ons, but I _do_ keep my main calendar on it.

## Hammerspoon

[Hammerspoon](http://www.hammerspoon.org/) provides a Lua-based API for
controlling macOS. Primarily, I use it to programmatically control windows and
switch between applications with one keystroke.

| Key          | Application |
| ------------ | ----------- |
| `ctrl-alt-i` | Terminal    |
| `ctrl-alt-s` | Browser     |
| `ctrl-alt-c` | Email       |
| `ctrl-alt-d` | Things      |

I also have app-specific keystrokes, like `ctrl-j` to move down, but _only_ in
Things.

I've also written code to automatically expand each new application window I
open to max width and max height. Since I generally don't like fullscreen mode,
this is a nice alternative.

If you want to check out my full Hammerspoon config, it's in
[a section of my dotfiles](https://github.com/dzfrias/dotfiles/tree/main/hammerspoon).

## ungoogled-chromium

To browse the web, I use a fork of Chromium called
[ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium).
I've actually written a
[dedicated blog post](https://dzfrias.dev/blog/ungoogled-chromium) that covers
why I chose it.

Here are the extensions I use:

- [uBlock Origin](https://ublockorigin.com/)
- [Dark Reader](https://darkreader.org/)
- [Refined GitHub](https://github.com/refined-github/refined-github)

# Programming

Here are the tools I use for programming.
[My dotfiles](https://github.com/dzfrias/dotfiles) have the actual (up to date)
configs for all of these tools.

## Neovim

I use [Neovim](https://neovim.io/) to write code. I've been tuning my Neovim
config for a long time, and I have a configuration that I'm pretty happy with at
this point. If you're interested in the plugins I use and/or my keymaps,
definitely check out
[the nvim directory of my dotfiles](https://github.com/dzfrias/dotfiles/tree/main/vim/nvim).

![Neovim editor](/img/tools-2024/neovim.png)

Although I strongly recommend that everyone gives Neovim or Vim a _try_, I'm not
a huge proponent of the “Neovim makes you faster” argument. Regardless of if
that's true, the main reason I like it is simple: **it's fun**![^keybinds].

## zsh

I use the built-in macOS [z-shell](https://zsh.sourceforge.io/) program as my
main shell. I've tried using modern shells, like
[nushell](https://www.nushell.sh/) and [fish](https://fishshell.com/), but I
keep coming back to the simplicity and functionality of POSIX shells.[^posix]

My [zshrc](https://github.com/dzfrias/dotfiles/tree/main/zsh/zshrc) has the
setup of my shell. I used to be a frequent shell-scripter, but I've since scaled
back on the number of aliases/functions I actually _use_ on a daily basis.

## tmux

I don't know where I'd be without [tmux](https://github.com/tmux/tmux/wiki). My
main use for it is editing multiple files side-by-side, but I also use it to
save my terminal sessions for later. Like with [my shell](#zsh), I've tried
modern alternatives like [zellij](https://github.com/zellij-org/zellij), but I
think tmux's simplicity and reliability is unmatched.

One handy thing that's saved me numerous headaches is that accidentally closing
my terminal app doesn't destroy my tmux sessions, so closing my terminal by
mistake (which I've done more than a few times) is usually not a big deal.

# Wrap Up

Those are all the tools I use on a daily basis! I hope you enjoyed this post,
and are maybe even encouraged to try some of these yourself. I honestly can't
recommend them enough.

As always, if you have any suggestions or comments about this post, make sure to
[open an issue](https://github.com/dzfrias/website/issues/new) on this website's
GitHub repository. I'm hoping to make my “tools report” an annual thing, too!

[^one-time]: And fortunately, it's a one-time payment, not a monthly thing.
[^keybinds]:
    The other side effect of using vim is that I can't go anywhere without
    vi-style keybinds…

[^posix]:
    They're definitely something that you have to get used to, but there's
    usually always a well-defined reason behind each of their (many) quirks.
    Writing [my own shell](https://github.com/dzfrias/wsh) has helped me
    appreciate zsh a lot more.
