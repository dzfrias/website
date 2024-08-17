---
title: A Modern Writing Setup For Neovim
description:
  A Neovim setup for grammar and spell checking, using modern LSP tools like
  nvim-lspconfig.
date: 2024-07-22
---

Whether it's in a git commit, blog post, or README, writing syntactically
correct English is often harder than writing syntactically correct code.

Fortunately, we have _plenty_ of quality grammar-checking software out there to
help us out. But, if you're writing in [Neovim](https://neovim.io/), you're
going to have to configure them yourself. While there are many plugins and
tutorials to help you through this, they're all quite outdated and don't use the
luxuries of modern Neovim:[^plugins]

- Built-in LSP support
- Diagnostics
- Lua APIs

In this blog post, I'm going to show you how to set up Neovim for writing,
complete with **advanced grammar checking and spell checking**, using _modern_
LSP tools like [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig).

![The spelling/grammar checking working](/img/neovim-writing-setup/working.png)

# Setting up ltex-ls

[ltex-ls](https://github.com/valentjn/ltex-ls) is a batteries-included provider
of [LangaugeTool](https://languagetool.org/) grammar-checking via the
[Language Server Protocol](https://en.wikipedia.org/wiki/Language_Server_Protocol).[^batteries]
You can install it through a variety of methods:

- The command line ([Homebrew](https://formulae.brew.sh/formula/ltex-ls),
  [AUR](https://aur.archlinux.org/packages/ltex-ls-bin), etc.)
- [mason.nvim](https://github.com/williamboman/mason.nvim)
- [The official releases](https://github.com/valentjn/ltex-ls/releases)

Once it's been installed, all you need to do is set up the language server using
lspconfig!

```lua
require('lspconfig').ltex.setup {
  on_attach = function()
    -- ...
  end,
  filetypes = { 'markdown', 'text', 'tex', 'gitcommit' },
  flags = { debounce_text_changes = 300 },
}
```

By now, if you enter a Markdown file, the LSP should be up and running! Go ahead
and do some experimentation!

## Getting everything working

You might notice that some code actions **aren't working**, like "add to
dictionary." That's because lspconfig doesn't support them on its own.

So, we'll need to use another plugin,
[ltex_extra](https://github.com/barreiroleo/ltex_extra.nvim). This will add
handlers to the "add to dictionary" action, along with a few others. Install the
plugin with your Neovim plugin manager, and add the following to your
configuration:

```lua
require('lspconfig').ltex.setup {
  on_attach = function()
    require('ltex_extra').setup {
      -- This is where your dictionary will be stored! Replace this directory with
      -- whatever you want!
      path = vim.fn.expand '~' .. '/.config/nvim/ltex',
    }
    -- ...
  end,
  filetypes = { 'markdown', 'text', 'tex', 'gitcommit' },
  flags = { debounce_text_changes = 300 },
}
```

All the code actions should be working now!

## Pedantic lints

There are some LanguageTool lints that are labeled "picky". They **aren't
necessary**, but I personally prefer writing with them on, since they help with
style and some advanced grammatical forms.

Anyway, you can enable with them with the following:

```lua
require('lspconfig').ltex.setup {
  on_attach = function()
    require('ltex_extra').setup {
      -- This is where your dictionary will be stored! Replace this path with
      -- whatever you want!
      path = vim.fn.expand '~' .. '/.config/nvim/ltex',
    }
    -- ...
  end,
  settings = {
    ltex = {
      additionalRules = {
        enablePickyRules = true,
      },
    },
  },
  filetypes = { 'markdown', 'text', 'tex', 'gitcommit' },
  flags = { debounce_text_changes = 300 },
}
```

# Wrapping up

That's it! By now, you should have a fully-functional writing setup, using
modern Neovim systems.

As always, feel free to
[submit an issue](https://github.com/dzfrias/website/issues/new) if you have any
problems, suggestions, or questions related to this post!

[^plugins]:
    To name a few: [vim-grammarous](https://github.com/rhysd/vim-grammarous),
    [vim-LanguageTool](https://github.com/dpelle/vim-LanguageTool), and
    [LanguageTool.nvim](https://github.com/vigoux/LanguageTool.nvim).

[^batteries]:
    By "batteries-included," I mean that you don't need Java _or_ LangaugeTool
    pre-installed on your system to use it.
