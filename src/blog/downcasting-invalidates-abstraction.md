---
title: Downcasting invalidates abstraction
description: My thoughts on the idea of downcasting.
date: 2024-04-10
---

Downcasting is a common pattern in programming. In general terms, it allows the
programmer to take a _supertype_ and "**downcast**" it into a _subtype_, so long
as the actual the object being cast is actually that subtype. You might be
familiar with downcasting from pretty much any statically typed language, like
Java, Go, C#, C++, and (very rarely) Rust.

In this post, I'm going to talk about a few reasons why I believe that
downcasting is a particularly nasty thing to rely on in a **statically typed
language**. I will not being talking about languages like Python or Ruby,
because technically, you're downcasting any time you do literally anything, and
you have no choice. However, in a statically typed language, downcasting
_invalidates abstractions_, and _undermines type safety_ as a whole.

# Conflicting with abstractions

In the context of a function, the point of receiving or returning a supertype
should be to rely on the type's abstractness. In some senses, that's one of the
core ideas of inheritance. The "is a" relationship _should_ allow us to treat a
subtype **exactly the same** as its supertype. This allows our types to be
extendable (in theory). I'll give a quick example in C#:

```csharp
public void DoSomething(Animal animal)
{
    for (i = 0; i < 10; i++)
    {
      animal.Speak();
    }
}
```

Yes, I know. You're probably tired of seeing animal-related abstractions. Me
too. But, at this point, they've become the foo and bar of type hierarchies, so
I'm using them for their ubiquity. Anyway, `DoSomething` will work the same for
any animal subtype! Abstraction achieved!

Now, let's suppose we have a new function:

```csharp
public void SomethingElse(Animal animal)
{
    if (animal is Dog dog)
    {
        dog.Fetch();
    }
    else if (animal is Bird bird)
    {
        bird.Fly(100);
        bird.Speak();
    }
    else
    {
        animal.Speak();
    }
}
```

In this function, we're considering a _finite_ number of subtypes. And no, even
though there's an `else` case, I'd still argue that the scope of our function is
still limited. Because we've inherently (no pun intended) tied it to `Dog` and
`Bird`, we've invalidated the thing that `Animal` should provide us:
abstraction. We're reaching for functionality that isn't in the **information**
of the function itself (the parameter). As such, we've chosen and used the
**wrong abstraction**.

For whatever `Animal` we pass into a function, we _should_ have confidence that
the function's mechanisms will work the same. Failing to uphold that promise
creates dodgy API's and hard-to-track-down bugs. So, just as the internal state
of types shouldn't be exposed, the subtypes of a type should be irrelevant
information with regard to the type itself.

# Undermining type safety

One of the main selling points of languages like Java, C#, and C++ is **type
safety**. That is, you will know every value's type before runtime, and thus
will be able to more effectively reason about, debug, and write programs. While
this promise is mostly upheld in the aforementioned languages, I have trouble
calling them truly type safe, especially when downcasting exists.

I once worked in the C++ codebase of a pretty awesome project,
[WABT](https://github.com/WebAssembly/wabt), and I tried to fix a bug in one of
their tools. Their codebase goes pretty crazy with the abstractions C++ gives
you, which I attempted to use to stay consistent with the rest of the code, even
though I'm not very familiar with the language. So, I made my changes, hopeful
that I could knock out the fix in under an hour. But when I ran the tests, I was
shocked by the result! I got a type error at runtime! The error message I got
was in some (very primitive) pointer type defined in the codebase that was
performing a cast, which failed, so C++ panicked.

I struggled for hours trying to fix the bug. I was using and instantiating a
type wrong. Yes, I understand that an experienced C++ developer who's familiar
with the codebase would probably understand what happened in a few minutes, but
I believe that it took me an unreasonable amount of time to fix for the scope of
the problem. I'm not calling out the WABT codebase, it's very well written, but
I just had an unfortunate experience. In my case, downcasting invalidated type
safety that should've been statically guaranteed.

So, along with invalidating abstractions, downcasting undermines type safety. It
can cause type-related **runtime** panics if you're not careful! Runtime type
errors are for dynamically typed languages, not statically typed ones.

# So how do we fix it?

Unfortunately, the answer is not as simple as: "don't downcast!" because
downcasting is a fundamental concept for a lot of languages.

## A real example

All I've been giving is cat and dog examples in this post, so I think you
deserve a real-world example now. Say you're representing a server's message. It
can be one of the following:

- A "delete" message containing a 32-bit integer
- An "add" message containing a string
- A "compare" message containing two 32-bit integers

Now, in a language without
[tagged unions](https://en.wikipedia.org/wiki/Tagged_union) (like C#), you
pretty much have to represent this using an inheritance/interface model combined
with downcasts:

```csharp
public abstract class Message {}

public class DeleteMessage : Message
{
    public int id;

    // ...
}

public class AddMessage : Message
{
    public string contents;

    // ...
}

public class CompareMessage : Message
{
    public int id1;
    public int id2;

    // ...
}
```

If you want to process all add messages, you'd need to receive each message,
check if it's an `AddMessage`, and then getting the corresponding state if it is
(i.e. you'll need a downcast!).

So, in these types of languages, you often **don't have a choice**. This usage
of downcasting, though, is less egregious than others. There are absolutely
better/worse cases for downcasting, and I think it just takes time to get an
intuition for when it's necessary and when it's extraneous. It's all about
_what_ is using your abstraction.

## Other Languages

There are a lot of languages that don't have this problem. Take Rust, for
example. Something _like_ downcasting exists, but is basically never used. One
of the big reasons is that Rust has
[tagged unions](https://en.wikipedia.org/wiki/Tagged_union). This is how you'd
represent the `Message` type in Rust:

```rust
pub enum Message {
    Delete(u32),
    Add(String),
    Compare(u32, u32)
}
```

Here, there is no abstraction at all! You simply have all the information up
front. I recommend learning about
[Rust enums](https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html) if
you haven't already!

# Wrap up

Depending on the language, downcasting is a necessary evil. While it's certainly
not going to ruin your codebase in _every case_, you must be careful when you
use it. Ask yourself the following questions:

1. Am I invalidating an abstraction's contracts?
2. Am I reaching for information that an abstraction does not contain?

Also, as with all things in software engineering, **no** code is written
perfectly first try. Just write code and see how it works. If it sucks, then fix
it! Don't spend too long trying to design a complex system for a problem that
you don't fully understand.

Anyway, I hope you enjoyed this post. If you found an error or have a
suggestion, please feel free to
[open an issue](https://github.com/dzfrias/website/issues/new) on this website's
[GitHub repo](https://github.com/dzfrias/website).
