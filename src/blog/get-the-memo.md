---
title: "Game Project: Get The Memo"
description:
  A reflection on a video game project that I've been working on for a few
  months!
date: 2024-05-15
---

For the past few months, a few friends and I have been working on a video game
called _Get The Memo_ ([GitHub](https://github.com/dzfrias/GetTheMemo)). From
our official description:

> “Get the Memo” is a first-person dystopian role-playing game set in the
> imposing corporation Big Corp., which is overseen by an intimidating boss.
> Play as an aspiring intern in their first week on the job, where you'll
> navigate through a maze of unassuming cubicles, combat sentient office
> supplies, and climb the corporate ladder

![Cover](/img/get-the-memo/cover.webp)

We developed the game for a game project competition that took place in our
state! In total, we worked on the project for seven months! My favorite part was
working on a team, especially with people who don't code. On our team, we had
people for:

- 3D modeling
- Writing
- 2D art
- Marketing
- Documentation of process
- and more!

Communicating with everyone and taking full advantage of their talents was a big
challenge, and I think that game development is unique in that respect. Games
are the intersection of so many different crafts, programming included, which
makes working on a team difficult but in a good, challenging way!

# Programming

I can't say that I like writing game code, but certainly teaches some good
lessons! We wrote the game in Unity, and the main struggle was **decoupling**
our components. In video games, coupling is so easy, since everything in the
world can interact in so many different ways. One "solution" is global state,
but that doesn't usually end well...

On that note, I'm thinking about writing a post about using events for
decoupling components in Unity, as I believe they are the most effective
solution to coupling, and they mesh (no pun intended) especially well with
Unity's component-based system. Although, I'm far from an expert in game
development, the post might be helpful for people without ton of experience such
as myself.

Also, I wasn't a huge fan of C#. Compared to Rust, there are _very few_ static
guarantees. I think being able to analyze a program statically is useful for
games, since there are so many independent variables and combinations of state.
I've (very recently) been coming back to Rust, which has been really nice.

# Final Thoughts

Working on _Get The Memo_ was overall a great experience. Being on a team with
talented artists and musicians was unique and presented many challenges! The
game we made won the award for best art and assets! That included overall visual
design, which I spent a long time on (graphics programming is hard!).

We competed in the same state competition last year, with
[_Roadent Rampage_](https://github.com/dzfrias/roadent_rampage), and our game
was **much better** this time around! Anyway, I hope you enjoyed my reflections
on _Get The Memo_. I didn't show much gameplay, but you can go to the game's
[GitHub repository](https://github.com/dzfrias/GetTheMemo) for that kind of
content. As always, let me know on
[this blog's GitHub repo](https://github.com/dzfrias/website) if there are any
issues!
