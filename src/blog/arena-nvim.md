---
title: "arena.nvim: A frecency-based buffer switcher"
description:
  arena.nvim aims to be the ultimate buffer-management solution, allowing you to
  hop around files as fast as you can think!
date: 2023-10-01
---

# arena.nvim

[arena.nvim](https://github.com/dzfrias/arena.nvim) is a
[**frecency**](https://en.wikipedia.org/wiki/Frecency)-based buffer switcher.
Its tunable algorithm suggests the most relevant buffers for you, massively
speeding up productivity!

![arena window](/img/arena-nvim/window.png)

Using the arena window, you can easily jump between files!

## Motivation

I wrote `arena.nvim` because I was tired of how long it took to get back to a
buffer I'd previously opened. Fuzzy finders took too long, especially for large
projects. Alternate files were too rigid, as I could only get fast
buffer-hopping between two files. Existing buffer managers hold on to every file
edited in the current session, so every single buffer opened adds to the
listing. Persistent marks got hard to manage in large codebases.

After enough time dealing with these annoyances, I wrote a "smart" buffer
switcher that uses a [frecency](https://en.wikipedia.org/wiki/Frecency)
algorithm to suggest buffers _for you_.

With `arena.nvim`, you no longer have to spend any energy trying to get back to
a file you've already edited. Rather, it'll most likely be listed in as soon as
you open the arena window!

## Extra Stuff

The design and feel of the window is very-much inspired by ThePrimeagen's
[harpoon](https://github.com/ThePrimeagen/harpoon). Although `arena.nvim` has a
similar interface, it is **not** a replacement. `arena.nvim` has no persistence
between neovim instances; there are other plugins for that.

I'd love for some other thoughts on the plugin. It's been vital to my workflow
ever since its earliest iteration, so other sources of input would be great!
I've been experimenting with different configurations of the algorithm, and
haven't decided on the best default quite yet.

If you run into any bugs using the plugin, or have any suggestions, please open
an [issue](https://github.com/dzfrias/arena.nvim/issues)!
