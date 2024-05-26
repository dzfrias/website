---
title: Fix your posture with almostontop
description:
  An introduction to my favorite shell plugin, almostontop. Save your neck the
  pain in those long coding sessions!
date: 2024-03-10
---

In this post, I'm going to introduce a shell plugin that's been improving my
terminal experience for over a year now:
[`almostontop`](https://github.com/Valiev/almostontop). If you do most of your
work in the terminal, this plugin might be a **life-saver** for you. It was for
me.

So what does it actually do? It's pretty simple: every time you enter a command
in the prompt, it'll _clear your screen_! This effectively keeps your prompt "on
top" (hence the name).

Here's a quick video demo:

<video controls>
  <source src="/img/almostontop/demo.mp4" type="video/mp4" />
  <p>
    Your browser doesn't support HTML video. Here is a
    <a href="/img/almostontop/demo.mp4" download="/img/almostontop/demo.mp4">link to the video</a> instead.
  </p>
</video>

With `almostontop`, you can stop having to crane your neck downwards while
you're working. The change might look small (even a bit superfluous), but it's
been a _huge_ help for me.

# Installing

`almostontop` is a [zsh](https://zsh.sourceforge.io/) plugin. If you're a
[bash](https://www.gnu.org/software/bash/) user, you can use
[`alwaysontop`](https://github.com/swirepe/alwaysontop), which does the same
thing. If you use a different shell, you'll probably have to figure out
something different (see the [other shells](#other-shells) section of this
post).

If you're a zsh user, here are two ways you can install `almostontop`:

1. [Installing raw](#installing-raw)
2. [Installing with oh-my-zsh](#installing-with-oh-my-zsh)

## Installing Raw

At the most basic level, visit
[the GitHub repository](https://github.com/Valiev/almostontop) and download:

- `_almostontop`
- `almostontop.plugin.zsh`
- `version`

Put those files in a unified directory; you'll need to access it later. I
recommend something like `~/.zsh-plugins/almostontop`, so you can put other
plugins in `.zsh-plugins` if/when you want them.

Now, you'll need to edit your `~/.zshrc` to run the plugin when zsh starts up.
This is as simple as doing the following:

```bash
$ echo "source ~/.zsh-plugins/almostontop/almostontop.plugin.zsh" >> ~/.zshrc
```

If you restart zsh, the plugin _should_ be working! If it doesn't, make sure
that the `$ALMOSONTOP` environment variable is set with the following:

```bash
$ echo $ALMOSONTOP
true
```

Yes, the misspelling **is** intentional. If it's not set or `false`, run
`almostontop on`.

## Installing with oh-my-zsh

If you have [oh-my-zsh](https://ohmyz.sh/), the installation is (_slightly_)
easier. Download the repository and do the following:

```bash
$ mv <DOWNLOAD_PATH> $ZSH_CUSTOM/plugins
```

And then in your `~/.zshrc`, add `almostontop` to your plugins:

```bash
plugins=(
  # ...
  almostontop
  # ...
)
```

Restart `zsh`, and everything should be working!

# Other Shells

As far as I know, **only** zsh and bash have plugins for this. **However**, you
can easily emulate this behavior by taking advantage of "post-prompt" hooks that
shells usually have.

For example, see
[this issue](https://github.com/fish-shell/fish-shell/discussions/8574) in the
[fish shell](https://github.com/fish-shell/fish-shell) repository.

There _are caveats_ to this, however, so the result won't be as clean as it is
with zsh and bash.
