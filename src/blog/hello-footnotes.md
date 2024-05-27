---
title: Hello Footnotes
description: "An exciting update in the blog: footnotes!"
date: 2024-05-26
---

Today, I added the ability to make **footnotes** in this blog.[^1] I'll
definitely be using this feature in future posts! In most of my writings thus
far, I often feel the need to provide supplementary information, or cite where I
got something. Usually, I'll just put that stuff in parentheses. But now, I can
use fancy Markdown syntax!

Since this blog is made with 11ty (see [this post](/blog/new-look)), I use the
[markdown-it](https://github.com/markdown-it/markdown-it) to compile my Markdown
files into HTML. They have an official plugin called
[markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) that
extends the syntax, allowing for footnotes. You can read about it in their
GitHub repository!

You can view my implementation
[here](https://github.com/dzfrias/website/blob/aa8eeeb66a37fcf081a9ff91c4e98e63b73b4a89/.eleventy.js#L49).
I made a few adjustments to the default behavior. Fortunately, markdown-it makes
it _really easy_ to extend/change the compiler, so it wasn't too much trouble!
Anyway, that's it for this post. I'm excited to use this new feature, and I
think it'll be a really useful addition to this blog!

[^1]: Like this one
