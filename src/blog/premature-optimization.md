---
title: Premature Optimization is Bad, But...
description: My opinion on the classic warnings against premature optimization.
date: 2026-11-02
---

...inherently slow code is worse. In this post, I will state and explain my
opinion on the classic saying that "premature optimization is the root of all
evil." In short, I think there is more nuance to this saying than what was
portrayed to me when I started thinking about how to make my programs faster.
The same goes for "make it work, make it good, make it fast."

In general, I am against these sayings. There are certainly kernels of wisdom in
them, but in the world of programming, I see them applied **dogmatically** as
approaches to writing software. So it's not that the sayings are wrong, but
rather that they are frequently **misinterpreted**, in my opinion.

So, in the following sections, I will explain some instances where I think it's
okay to optimize your code _without_ thorough analysis.

# Defensively Allocate

A simple fact always holds: allocating in less places $\implies$ less total
memory usage. Additionally, small allocations within a program tend to stack up.

This leads to a natural conclusion for how to avoid memory usage buildup: be
mindful, at _all_ times of when you are allocating memory. This is easier said
than done; it is a blessing and a curse that modern systems programming
languages make it so easy to allocate.[^raii] Sometimes I find myself asking:
why am I going through the trouble to pass pointers around and think about
memory lifetimes when I can just allocate a copy? But if you find yourself
asking the same thing, I would urge you to spend the extra minutes thinking
about the problem instead of reaching for copying your `std::vector` or
`Vec<T>`.

For example, consider a simple parser for the JSON format. We want to store keys
and values. There are two main options we have for representing keys in our
parsed structure:

1. A pointer to the original string
2. A copy of the original string

Of course, there are other options that might be useful depending on our parsing
strategy.[^intern] But, if we only consider these options, we should at least
spend some time thinking about if it is worth it to keep the original JSON
string in memory or if we should free it and copy out only what we need.

The problem with deferring our thinking is that it will be hard to reverse our
initial choice. It deserves to be thought through before a ton of lines of code
are written, instead of labeling such thinking as "premature optimization" and
blazing forward.[^json]

# Defensively Virtualize

Virtualization can be very useful, and especially with the prominence of
[OOP](https://en.wikipedia.org/wiki/Design_Patterns#Patterns_by_type), it is
prolific. However, I believe that there are better options nearly all the time.
The main issue is that virtualization add a lot of overhead, and I think this
overhead is generally understated in programming pedagogy.

Performance-wise, virtualization can have the following affects:

1. Adding a vtable lookup and pointer dereference before calling a function. For
   some reason this is what is most talked about when teaching virtualization,
   in my experience.
2. Blocking compiler optimizations. Inlining is one of the most powerful tools
   your compiler has.
3. Pressuring your I-cache with unpredictable jumps.

Consider, on the other hand,
[static dispatch](https://en.wikipedia.org/wiki/Static_dispatch).[^traits]
Static dispatch carries none of these downsides. But there are two cases where
you might want virtualization:

1. You truly don't know what function you need until runtime
2. Binary size

Case 1 is the most likely to be relevant. Binary size is certainly important,
but it is not something that you should base your decisions on before
[measuring](https://github.com/google/bloaty). So, in total, I think that the
benefits of virtualization relative to the benefits of static dispatch are
small. Additionally, undoing a virtualized structure in code is not an easy
thing.

The conclusion is to think deeply about the problem before using virtualization.
Static dispatch is your friend.

# Defensively Parallelize

The title of this section might seem nonsensical; parallelization is often added
on explicitly _for_ the sake of performance. This should be the case, but I've
recently been noticing a trend in systems programming that suggests otherwise.

Modern systems languages have made it easy to add concurrency to our programs,
such as in Rust's [Tokio](https://tokio.rs). All we have to do is paste in
`cargo add tokio -F full` and just run with it using Tokio's many abstractions
and rich set of APIs.

But the `-F full` flag introduces a more serious consideration to the program:
parallelism. All of the sudden, you need thread safety with `Send + Sync` and
you're wrapping all your state with locks and making all your pointers with
atomically reference counting. This scenario is easy to get in, especially as a
concurrency beginner.

But parallelism is not as easy to justify, modulo
[embarrassingly parallel cases](https://en.wikipedia.org/wiki/Embarrassingly_parallel).
I once watched a talk by a [TigerBeetle](https://tigerbeetle.com) core member
about parallelism. He spent a good first chunk of the talk convincing me to
_not_ reach for parallelism unless I really know what I'm doing. The talk is
[here](https://www.youtube.com/watch?v=x1N9JPPPC18). So don't fall for `-F full`
early on, because it's hard to get yourself out of!

If you want concurrency in Rust, I recommend
[smol-rs](https://github.com/smol-rs/smol) and its
[`LocalExecutor`](https://docs.rs/smol/latest/smol/struct.LocalExecutor.html).

# Conclusion

In this post, I went over some examples in which neglecting to think about your
performance early on can seriously affect your program in the long run. The
common thread between all of these examples is that they are all high cost
decisions that, due to the nature of modern systems programming, are easy to
make without a second thought.

I thus hope this post helped make you more mindful of performance decisions that
you might have carelessly made before. If you have any feedback, questions, or
comments, please email me a [mail@dzfrias.dev](mailto:mail@dzfrias.dev)!

[^raii]:
    Smart pointers and RAII are the standout examples. C++'s `std::unique_ptr`
    and Rust's `Box` are undoubtedly a good things, but managing a complex
    structure like `std::vector<std::unique_ptr<T[]>>` so trivially is at least
    little bit concerning in how it hides the underlying nature.

[^intern]:
    For example, we could intern keys. Or we could use something like Rust's
    `Cow` to try to keep borrowed references when possible, and bail to
    `Cow::Owned` if we encounter an edge case (such as if we need substitute to
    unpaired surrogates with replacement characters).

[^json]:
    JSON might not be the most illustrative example for this point because it
    has a simple grammar. But it isn't difficult to imagine making the same
    choice for a more complex grammar (e.g. a C-like programming language).

[^traits]: Also known as traits in Rust and templates in C++
