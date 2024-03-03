---
title: The Definitive Neovim Unity Setup of 2023
description:
  A neovim setup for Unity that actually works in 2023, with minimal
  dependencies.
tags: [gamedev]
img: /img/neovim-unity-setup/working.webp
date: 2023-06-20
---

# The Definitive Neovim Unity Setup of 2023

If you use [neovim](https://github.com/neovim/neovim) to write code for
[Unity](https://unity.com/), it's likely that you want (or have wanted) a
language server to be set up in your configuration, giving you access to
autocomplete, references, definition jumping, diagnostics, and much more.

However, setting up a Unity-compatible C# LSP is not the easiest task.
Personally, I struggled for hours trying to get it to work, scouring the
internet for any source even remotely related to the issues I was facing. Many
of the blog posts for setting it up were quite outdated and failed to work with
recent changes in Mono and other systems

This post assumes you already have a neovim configuration set up, and you are
using [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig) for your server
configurations.

## Installing Dependencies

The first system-wide dependency you'll need is
[mono](https://www.mono-project.com/). The one vendored by the lsp does not
work. I used [Homebrew](https://brew.sh/) for installation, with
`brew install mono`. I got version v6.12.0.182, but theoretically this should
work for any `mono` version 6.

Next, you'll need [OmniSharp](http://www.omnisharp.net/), which is the actual
LSP. You will **not** need to install this globally on your system, you just
need an _accessible path_ to the binary. This is where things are a bit tricky:
the latest version of OmniSharp will **not** work. You need an **old version**
of the LSP that is compatible with the mono you just installed.

The most recent working release I found was
[v1.38.2](https://github.com/OmniSharp/omnisharp-roslyn/releases/tag/v1.38.2).
To install, first follow that link. Then, find the asset that works with your
system and download the **non-http** version of the server. Put the download in
a path you'll remember!

![OmniSharp release page v1.38.2](/img/neovim-unity-setup/releases.webp)

The last dependency you need is
[Visual Studio Code](https://code.visualstudio.com/) (VSCode). Yes, I know this
is a strange requirement, but it's a necessary step for Unity to generate
project files (credits to
[this post](https://www.jhonatandasilva.com/published/1623278444) for the
trick). Don't worry: the download is actually only needed for a short amount of
time; after the first time you set it up, Unity doesn't care if VSCode exists
anymore (a bug which hopefully is never fixed).

## Setting Up

After you've finished [installing dependencies](#installing-dependencies), you
can actually start setting it up! The hard part is over! This step requires a
tiny bit of work on both the Neovim and Unity ends, but nothing too complicated
or error-prone.

### Neovim Setup

First, start by going into your nvim-lspconfig setup, and enter the following
code:

```lua
-- Change this to your actual download path.
local path_to_download = '/Users/dzfrias/.dotfiles/downloads/omnisharp-osx'
require('lspconfig').omnisharp.setup {
  cmd = {
    'mono',
    '--assembly-loader=strict',
    path_to_download .. '/omnisharp/OmniSharp.exe',
  },
  -- Assuming you have an on_attach function. Delete this line if you don't.
  on_attach = on_attach,
  use_mono = true,
}
```

Of course, change the `path_to_download` variable to the actual path of the
OmniSharp you downloaded. After that, **everything** from the Neovim side should
be set up!

### Unity Setup

Now, for the Unity part. Open up any Unity project, and go to Unity > Settings
in the menu bar. This should take you to a page that looks like this:

![preferences page](/img/neovim-unity-setup/preferences.webp)

As seen in the picture, go to External Tools section and select VSCode as your
external editor. Once that's done, check all the boxes and click the
`Regenerate project files` button. Unfortunately, this means you can't set
Neovim to external editor for Unity, but I think the trade-off is worth it. As
promised earlier in the post, you can delete/uninstall VSCode now!

## Wrapping Up

If you've followed these steps, you should have a working LSP for Unity!
OmniSharp takes a while to start up (for me, about 10 seconds), so stick around
for at least a minute or two to see if it actually works or not.

![the final working version](/img/neovim-unity-setup/working.webp)

I'm using macOS Ventura with an aarch64 CPU. I don't think this should matter,
but in the event this doesn't work, that's one possible avenue worth looking
into.

Here are some other reasons this guide might not work for people reading this in
the future:

- Mono changed again. To solve this, try installing v6.12.0.182 (which was the
  latest release at the time of this article)
- Unity changed project file generation
- nvim-lspconfig changed their OmniSharp setup

Thanks for reading this article! I hope you found it helpful, and good luck with
your future Neovim/Unity ventures!
