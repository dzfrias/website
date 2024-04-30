---
title: Privacy with ungoogled-chromium
description: This post introduces ungoogled-chromium, my web browser of choice.
date: 2024-03-22
---

# Privacy with ungoogled-chromium

The word "_privacy_" regarding modern browsers is similar to the word
"_healthy_"
[in regards to fruit juice](https://www.nytimes.com/2018/07/07/opinion/sunday/juice-is-not-healthy-sugar.html).
It's ambiguous, relative, and more often than not, deceiving. Just about every
browser will make claims about the protection of user data, yet it seems as
though there's always a caveat just beyond the surface. As a consumer, it
becomes hard to know what private _really means_ to browser companies.

For better or for worse, I've gone on a browser-searching rampage that was
mainly motivated by what I can only describe as "heat-of-the-moment paranoia."
In this post, I will introduce
[ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium),
and why it stood out in my quest for a better browser. I will spend as little
time as possible discussing other browsers, because ironically, I'm not in a
position to evaluate how private they actually are. I chose ungoogled-chromium
because there are things about the project that I know that I can **trust**, not
because I've formally audited the user data protection models of _every single
browser_ and decided that ungoogled-chromium has the best one.

## What is ungoogled-chromium?

Taken from
[their own description](https://github.com/ungoogled-software/ungoogled-chromium),
ungoogled-chromium is

> Google Chromium, sans integration with Google

This is an apt description, but what is Chromium?
[Chromium](https://www.chromium.org/Home/) is a browser engine that's backed by
Google, and in my opinion, is the _highest quality_ browser engine out there. It
powers Google Chrome and a host of other browsers, including:

- [Opera](https://www.opera.com/)
- [Brave](https://brave.com/)
- [Arc](https://arc.net/)
- [Vivaldi](https://vivaldi.com/)

To name a few. Web browser engines are extraordinarily complex tools (just look
at the [standards...](https://www.w3.org/TR/)), so there's a good reason that
all these browsers use Chromium: it's fast, correct, and stable. New standards
are drafted all the time too, and Chromium is always on top in terms of
implementing them.

ungoogled-chromium is a **fork** of Chromium that gets rid of **all** the
built-in integrations Chromium has with Google, while still aiming to feel like
Google Chrome. The
[design document](https://github.com/ungoogled-software/ungoogled-chromium/blob/master/docs/design.md)
details how this works. Basically, ungoogled-chromium ensures the protection of
your data by cutting off all internal communications with Google.

## Why ungoogled-chromium?

I like ungoogled-chromium for three main reasons:

1. I can be _actually sure_ about what it's doing with my data
2. It uses Chromium
3. It does its job, and nothing more

To go over point one, the project is open source, actively maintained, and
carefully documents **exactly** what it changes about the base Chromium, which
is viewable in the patchset.

In regard to the second point, I just got tired of using Firefox's engine.
Chromium browsers just **felt smoother**, and I use my browser a lot, every
single day. I also didn't like the opt-out integrations with products like
[Pocket](https://support.mozilla.org/en-US/kb/what-is-pocket).

Relating to the aforementioned Pocket integration, I just want a browser that
will **appropriately display a webpage**. Nothing more. Ultimately, a browser
has a simple role for the user: render a webpage's information in the way that a
server described. However complex that task might actually be, the point is that
a web browser's goal is to allow the user to _interact with the World Wide Web_,
not interact with the browser itself.

## Final Thoughts

That's pretty much all I have to say about ungoogled-chromium! I've been using
it for a few months now, and it's been great! However, I will mention that
_some_ (very select) parts of pages will not work. This almost never happens to
me, and it's not like the whole webpage ever completely breaks. It'll never be a
rendering issue or anything like that, but sometimes a request might fail
because ungoogled-chromium blocked it (which might be a good thing in some
scenarios). For that reason, I recommend keeping another browser installed on
your machine.

As always, if you had any questions, comments, or issues with this post, feel
free to [submit an issue](https://github.com/dzfrias/website/issues/new) on
GitHub! If you'd like to learn more about ungoogled-chromium, check out its
[GitHub page](https://github.com/ungoogled-software/ungoogled-chromium).
