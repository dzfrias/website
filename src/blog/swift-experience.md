---
title: Experiments with the Swift Language
description:
  A report of the things I like and dislike about the Swift language,
  specifically in comparison to C++ and Rust.
date: 2024-08-31
---

Following the announcement that the
[Ladybird browser engine](https://ladybird.org/) is going to adopt
[Swift](https://www.swift.org/) as a successor language for the codebase, I
decided that it would be worth getting to know the language a little
better.[^reason]

So, I wrote a toy [WebAssembly](https://webassembly.org) parser and validator. I
chose to write a Wasm parser for a few reasons:

1. I've written a few of them before
2. It's possible that we could integrate my work with the actual browser
3. It's somewhat low-level and performance matters

In this post, I'm going to go over the things I **like and dislike** about
Swift, in comparison to C++ and Rust.[^background] At the end, I'll do an
evaluation of the choice of Swift as a whole.

# Things I liked

I'll start off with my favorite things about the language.

## Good defaults

I'd say that Swift's **biggest strength** is that it has very good default
semantics.

Compared to a language like Rust, where you have to be _more conscious_ about
the decisions you make, you can generally just “_do what you feel like_” in
Swift, and it'll be performant and ergonomic.

For example, the
[`Array`](https://developer.apple.com/documentation/swift/array) type is always
[copy-on-write](https://en.wikipedia.org/wiki/Copy-on-write). Let's take this
simple program:

```swift
func process(_ a: [UInt8]) {
  // do some work
}

let a: [UInt8] = [1, 2, 3, 4, 5]
process(a)
```

In this example, `a` is not copied, even when it's passed into `process`. It's
also not borrowed, as we might do in Rust. **`a` will never be copied until it
is written to**. This means that we get to treat `a` as if we own it. There's
_no need_ for lifetimes, but we can also skip the (potential) performance hit
that comes with cloning.

Compared to C++, where _everything_ is implicitly copied unless you pass by
reference, this gives us the semantics we want without having to be explicit
about it.

Compared to Rust, where pretty much nothing is copied _ever_ unless it's
explicit, we don't have to worry about lifetimes at all.

## Error handling

In light of my thoughts on Swift's powerful default semantics, another thing I
really liked was the **error handling** in Swift. It's _way_ better than C++'s
pretty much non-existent error handling, but that's a low bar to clear honestly.

```swift
enum MyError: Error {
  case ten
  case twenty
}

func fallible(_ a: Int) throws -> Int {
  guard a != 10 else {
    throw MyError.ten
  }
  guard a != 20 else {
    throw MyError.twenty
  }
  return a
}
```

When you call a fallible function in Swift (which is marked by the `throws`
keyword), you have two options:

1. Propagate the error with `try`
2. Handle the error with `do-catch`

```swift
// 1. Propagate, if in another function that can throw
try fallible(10)

// 2. Handle the error
do {
  try fallible(10)
} catch {
  // `error` is implicitly put in scope
  print("failed: \(error)")
}
```

Error handling in Swift is nice because you don't have to think about it _that
much_, but you're still forced to handle things.

In Rust, which has the [`Result`](https://doc.rust-lang.org/std/result/) type,
you have to think about your errors a lot more when designing your API. You need
to make important decisions like:

- Do I want my error to be opaque?
- How do I carry borrowed data in my `Result`?
- How do I give it idiomatic semantics?

Often, in Rust, we use libraries like
[anyhow](https://docs.rs/anyhow/latest/anyhow/) and
[thiserror](https://docs.rs/thiserror/latest/thiserror/) to answer these
questions. Since Swift has good defaults out of the box, these decisions are
**less pervasive** in our minds.

## Computed properties

This is something that I've **changed my mind on** over my time programming, and
largely because of my experiences with Swift. I used to dislike the idea of
computed properties.[^argument] Take this example:

```swift
struct Example {
  let name: String
  let id: UInt

  var fullId: String {
    return "#\(id) \(name)"
  }
}

let e = Example(name: "Diego Frias", id: 0)
print(e.fullId)
// alternative w/o computed properties:
// print(e.fullId())
```

I don't know if it's just me. Something's kind of nice about them. I'll take a
real snippet from the Wasm parser:

```swift
public enum ValueType {
  case i32
  case i64
  case f32
  case f64
  case funcref
  case externref
  case v128

  public var bitWidth: Int? {
    switch self {
    case .i32, .f32: return 32
    case .i64, .f64: return 64
    case .v128: return 128
    case .funcref, .externref: return nil
    }
  }

  public var isReference: Bool {
    return self == .funcref || self == .externref
  }
  public var isNumeric: Bool {
    return !isReference && self != .v128
  }
}
```

They just make sense sometimes. I don't have a lot else to say, I just like
them.

# Things I disliked

While there's _a lot_ to like about Swift, there were definitely some pain
points along the way.

## Typed throws

I'll start with something pretty light: the lack of typed throws. When you
declare a fallible function in Swift, you **can't specify** the specific error
type that the function may throw.

Let me illustrate what I mean with an example:

```swift
enum MyError: Error {
  case invalidInput
  case outOfMemory
}

func doSomething() throws {
  // ...
}
```

Even if `doSomething` can _only_ throw `MyError`, there's no way to put that
info in the signature of the function. This was a little painful when designing
APIs. Sometimes it's useful to **explicitly state** when a function can only
throw a specific error.

There's good news, though! Swift is getting typed throws in version 6! Swift 6.0
isn't out at the time of me writing this, but I'm eagerly awaiting the feature.

## Tooling

I like writing code in [Neovim](https://neovim.io/).[^btw] When I'm starting out
with a new programming language, there are two things I like to check off:

1. [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) support
2. [LSP](https://en.wikipedia.org/wiki/Language_Server_Protocol) support

Swift's tree-sitter grammar is great! However, it's lacking quite a bit in the
LSP department.

There's a general sluggishness when using it, even on small codebases. Many
handlers for the protocol haven't been implemented, too (like show-references
and rename). The client sometimes quits unexpectedly, and error diagnostics will
sometimes linger indefinitely after something has been fixed.

I eventually ended up using the [Xcode](https://en.wikipedia.org/wiki/Xcode) IDE
Swift for development. Xcode is nice, but certainly not something I prefer over
Neovim. The Swift team has been investing more and more into the open-source
ecosystem, so hopefully these will be fixed with time.

## Ownership

Swift has something of an ownership model, a la Rust. But it's not nearly as
comprehensive, for better and for worse.

Firstly, **the concept of borrowing only exists for structs**. This makes sense,
since classes are
[reference counted](https://en.wikipedia.org/wiki/Reference_counting), but just
know that any borrowing/ownership problems are immediately absolved by the
`class` keyword.

Second, **borrowing is only available in function signature**. There's no such
thing as storing a borrowed value in a struct field (lifetimes would have to be
introduced, which is understandably not in the cards).

The following is allowed:

```swift
func doSomething(with x: borrowing Int) {
  // ...
}

let x: Int = 10
doSomething(with: x)
```

But there's no concept of:

```swift
struct MyStruct {
  let x: borrowing Int
}
```

The borrowing/ownership system isn't _incomplete_, but it's certainly _less
powerful_ than Rust's. I'm not totally familiar with the system yet, so it'll
take some getting used to.

I'm getting the impression that it should be used only for hot paths and hot
copies.

# Results

I'll share a little bit about the Wasm parser/validator itself. It's _not_ fully
spec-compliant, but the core behavior is all correct, so these results wouldn't
change much had I spent the time to make sure it was completely aligned with the
spec.

Running it on [spidermonkey](https://spidermonkey.dev/), we can parse and
validate the module in just 60ms, which is about 2x faster than the C++ version!
That was without any low-level performance optimizations.

Swift's good defaults are both ergonomic and performant, which lends itself to a
quick way to develop reliable software. You can read the
[source code on GitHub](https://github.com/dzfrias/LibWasm).

# Wrap up

I really enjoyed this little experiment with Swift! I think Swift is honestly
the **best successor language** choice for Ladybird. It hits the perfect blend
between ease-of-writing and performance, which is exactly what Ladybird needs.

It didn't take very long to write the Wasm parser, and it's already faster than
the C++ version. Of course, I had my fair share of struggles with the language
(and tooling) but my experience was generally extremely pleasant.

[^reason]:
    There were numerous reasons Swift was chosen. See
    [Andreas Kling's tweet](https://x.com/awesomekling/status/1822236888188498031)
    for more. My thoughts on it are at the end of this post!

[^background]:
    I'm comparing with Rust because it's the language I'm most comfortable with,
    and I had some interesting observations about the two languages
    side-by-side.

[^argument]:
    I'd always make the argument of “they're obscuring behavior with syntax!”
    Something like that.

[^btw]: by the way.
