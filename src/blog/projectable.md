---
title: "Projectable: A Command-Line Project Manager"
description:
  "Projectable is a highly configurable command-line project manager: everything
  your project needs from a comfortable and smooth interface."
date: 2023-06-22
---

# Projectable

![projectable](/img/projectable/projectable.webp)

Projectable offers the ultimate solution to getting lost in your project's file
hierarchy, trying to find the right file to open. Instead of exploring the
depths of your most nested directory, open it simply from the file listing!

Above just a hierarchical view of your filesystem, projectable comes with
built-in integration with [tmux](https://github.com/tmux/tmux) and git. Not only
that, but it's also incredibly extensible: providing sane defaults yet allowing
_just about everything_ to be customized.

The vast amount of features coalesce into a pretty neat package! The goal of
projectable is for you to **never leave** the comfortable TUI interface, and
instead interact with your project efficiently and safely using the
dashboard-style interface.

You can learn more about the project
[on GitHub](https://github.com/dzfrias/projectable). In the rest of this post,
I'll go over some reflections/highlights that brought me to its initial v0.1.0
release!

## Motivations

Back before I was as comfortable in my terminal, I was always in search of a
universal terminal "_project manager_". There was never quite one that pulled
together _all_ of the features I wanted, pulling together git, tmux, my editor,
and of course, all the specific commands I ran exclusive to my projects.

So, I put it on my ideas list. And a few months later, I felt good enough to try
to implement what I had previously envisioned.

### A Few Implementation Highlights

I wrote projectable in [Rust](https://www.rust-lang.org/), using
[tui-rs](https://github.com/fdehau/tui-rs) to handle the UI. There were a bunch
of interesting challenges I came across writing the code, two of which I think
are notable enough to talk about.

#### Blocking I/O and Event Sources

One of the earliest and most prominent challenges I stumbled upon was real-time
filesystem updates, something I considered **essential** for true "project
management". I found the excellent
[notify-rs](https://github.com/notify-rs/notify) crate that served this exact
purpose. One of my big challenges of this, however, was blocking at the right
time such that 100% of my CPU would not be consumed. So for the new system, my
app needed to block while waiting for two sources:

1. Keyboard or mouse input
2. Filesystem changes

I ran into numerous problems getting both to block at the right time, especially
because foreground processes that projectable might spawn (like
[vim](https://www.vim.org) or [neovim](https://neovim.io)) need keyboard input
too. Long story short, I had to manage projectable's long-running threads with
great precision, which took me a while to figure out as I was pretty new to this
style of I/O in general. All of this and more is present in
[the `external_event` module](https://github.com/dzfrias/projectable/tree/main/src/external_event)
of the repository.

#### Windows Command Execution

As I wanted projectable to be Windows-compatible, many of the shell commands I
was running (like `cat` for previews) would not work the same. Specifically,
some select Windows programs have a different style of receiving arguments. This
made running preview commands **very difficult**, as Windows would not properly
escape paths with spaces in them. Additionally, I don't own a Windows computer,
so debugging during this process was quite tedious.

After a great deal of struggle, I found the insufficiently referenced
[`raw_arg`](https://doc.rust-lang.org/std/os/windows/process/trait.CommandExt.html#tymethod.raw_arg)
extension for the Rust
[`Command`](https://doc.rust-lang.org/std/process/struct.Command.html) type.
This allowed paths to be actually escaped, so spaces would work. You can see
[my implementation](https://github.com/dzfrias/projectable/blob/010da24e131a94bce1e7dfe14bc61244a32bc6ac/src/app/components/preview_file.rs#L119)
in the source!

## Moving Forward

I will continue to update projectable until I feel like it's good enough to
release v1.0.0. I still have a few ideas in mind! Again, check out the
[GitHub repository](https://github.com/dzfrias/projectable) for more information
about the actual program. If you're interested in a specific feature, find a
bug, or don't understand something, feel free to submit an issue.

I myself use projectable all the time, like when I know I'll be working on a
project for over an hour or two. I hope you found this post interesting, and
perhaps it even got you interested in projectable!
