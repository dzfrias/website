---
title: Rebuilding the Website
description:
  In this post, I'll go over some high-level changes I've made to this website.
date: 2024-03-06
---

# Rebuilding the Website

A few weeks ago, I was thinking about completely redesigining this website
**from the ground up**. I didn't like the colors that much, and it generally
wasn't as performant as I would've liked.

I was super busy working on [wsh](https://github.com/dzfrias/wsh) at that time,
so I held off from reworking anything. But after deciding to take a short break
from the project, I got time to do work on this website!

In this post, I'll go over [what's different](#what's-different) and
[what's stayed the same](#what's-the-same)!

## What's Different

The whole website is now made with [11ty](https://www.11ty.dev/), which I could
not recommend enough. I'd previously used [SvelteKit](https://kit.svelte.dev/)
for the blog, but this was completely unnecessary for a few reasons:

1. The content of this website is (and will probably always be) static
2. The website is too small to make meaningful use Svelte's component
   abstractions
3. There was little to no use of interactive JavaScript

In my first iteration of this website, I didn't know much about developing
"_real_" sites for the web, so I just chose SvelteKit because it sounded nice.
This just turned out to be **huge** overkill and made things much more
complicated than they needed to be.

11ty is a super simple static site generator. It handles the annoying stuff for
you (like parsing [Markdown](https://www.markdownguide.org/)), while still
allowing you to have full control over your website. It doesn't do anything
crazy under the hood, or deliver _any_ client-side JavaScript. For building
static websites, I can't recommend it enough.

### Color Changes

Perhaps the most visually noticable difference is the colors and general site
layout.

![The old website home page](/img/new-look/old.png)

The [home page](/) looks pretty different now! I think _both_ color schemes
worked pretty well for a personal site, but I wanted something different for
this version of dzfrias.

### Projects Page

New to this website is my [projects page](/projects/)! This is meant to hold the
projects that I'm most proud of. Although they vary in levels of usability (I
think I'd be able to make some of them a lot better if I tried them now), I
still want to feature the projects that I've poured tons of hours into.

### Backend

Since this site is fully static, it's now being served using
[GitHub Pages](https://pages.github.com/)! I was previously using
[Vercel](https://vercel.com/about). Similar to the 11ty/SvelteKit story, using a
dedicated server was a bit overkill.

I use a [GitHub Action](https://docs.github.com/en/actions) for deploying my
website. The
[relevant workflow](https://github.com/dzfrias/website/blob/40a068a58f4481350c1d531c087f33d435927dd4/.github/workflows/deploy.yml)
is nice and simple!

## What's the Same

I tried to make sure that all of the URLs of the site stayed the same. For
_most_ of the content, that was definitely successful. A few minor pieces of
content, like image paths, **are not** consistent with v1 of the website.

It's generally good practice to make sure that your URLs don't change
([cool URIs don't change](https://www.w3.org/Provider/Style/URI)).
