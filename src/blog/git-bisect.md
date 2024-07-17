---
title: Finding Bugs in log(n) Time With Git Bisect
description:
  A post about git bisect, possibly the most satisfying tool to find bugs.
date: 2024-07-15
---

You begin running your application, just for fun. It's gotten pretty large at
this point, complete with **dozens** of features and interesting interactions.
You decide to test one of them. An old favorite, perhaps? You trigger it,
expecting to see a pleasant popup that you spent a weekend on a few months back.

Your application stutters, stops, and crashes.[^sigbus] You do a double take.
You try again. Same result. The expectations, the disappointment, the casual
naivety you started with, the irony of it all: _it's shocking_, like stepping
down to a nonexistent stair in the dark.

You've found a
[**regression**](https://en.wikipedia.org/wiki/Software_regression): a bug that
breaks a that feature previously worked. In large codebases with long, storied
git histories, they can be _notoriously_ difficult to track down. In this post,
I'll show you an effective way to find the **exact commit** which introduced the
bug, in the order of $\log_2(n)$ time.[^log]

# What is Git Bisect?

> Note: This section assumes you have some knowledge of
> [git](https://git-scm.com/).

I will introduce `git bisect` with an example: our goal is to find the **first
version** of the app that introduces the bug, in a history that looks like this:

![Commit history (7 commits)](/img/git-bisect/commits0.png)

Each circle represents a version of your app (i.e. a commit), where the bug may
or may not be hiding. `G` represents your current version, which you know is
broken. Your first instinct _might_ be to check if commit `D` has the bug, since
it's in the middle of the "timeline":

![Checking out commit D](/img/git-bisect/commits1.png)

It does! Importantly, we can make an assertion with this information: **anything
to the right of commit `D` must also have the bug**, since git commits are
chronologically ordered (`G` is your most recent version).[^time] So, really,
your history looks like this:

![Decreasing the search space](/img/git-bisect/commits2.png)

Your search space has now decreased by half. You now check if `B` has the bug,
since it lies in the middle of the three unknown commits.

![Checking out commit B](/img/git-bisect/commits3.png)

`B` doesn't have the bug, so `A` must not either! That means that there are two
options now:

1. `C` is green: bug in `D`!
2. `C` is red: bug in `C`!

You check `C`, and it's green:

![Checking out commit C](/img/git-bisect/commits4.png)

So, you must've introduced the bug in `D`, meaning that you know _exactly_ where
to look to make a fix!

## Summary

If you're familiar with algorithms, this process is basically a
[binary search](https://en.wikipedia.org/wiki/Binary_search). `git bisect` is a
handy sub-command built into git that _automates_ what I just showed. Yes, you
_could_ get the exact middle of your git history yourself, but `git bisect` will
do it for you! In the next section, I'll go over how to use the command.

# Usage

To start `git bisect`, run

```bash
$ git bisect start
```

This will give you a message that looks like this:

```text
status: waiting for both good and bad commits
```

`git bisect` needs to know at least one commit that is "good" (no bug), and one
commit that is "bad" (has bug). `git bisect` will find the first "bad" commit,
as shown in [the example](#what-is-git-bisect%3F).

Usually, the commit I'm currently on (`HEAD`) is bad, and we can let `git` know
like so:

```bash
$ git bisect bad
status: waiting for good commit(s), bad commit known
```

`git bisect` is telling us now that it only needs to know **any** commit that is
good. You can find this manually by checking out some old commit and seeing if
it has the bug, or you can just tell `git` that your very first commit is good
(as is often the case):

```bash
$ git bisect good $(git rev-list --oneline HEAD | tail -n 1 | cut -wf1)
```

After entering this, you'll be automatically switched to a version of your
repository. From there, you can run your app and see if it has the bug. If it
does, run `git bisect bad`. If it doesn't, run `git bisect good`. In other
words, you have the following workflow:

1. Check out a commit
2. Good or bad
3. Repeat until `git` finds the first bad commit!

> Note: If at any point you need to quit the bisection, run `git bisect reset`.

# Wrap-Up

This post went over how `git bisect` can be used to fix regressions! I also
showed it actually works, using [an example](#what-is-git-bisect%3F). I
personally use the sub-command quite often, especially as my projects grow older
and more complex.

If you want to learn more about `git bisect`, you can
[read the manual](https://git-scm.com/docs/git-bisect)! If you have any
feedback, questions, or issues with this post, feel free to
[submit an issue](https://github.com/dzfrias/website/issues/new) on this
website's GitHub repository!

[^sigbus]:
    Maybe it even gives you a really helpful crash message such as: `SIGBUS`.

[^log]:
    That is, if you have 1000 commits, you'll find it in 10 steps worst-case.

[^time]:
    If you need some time to wrap your head around this, feel free to! This also
    makes the assumption that the bug isn't introduced, fixed, then
    _reintroduced_ in the timeline.
