---
title: "Side project: Fast definite integral calculator"
description:
  "An overview of a small project: a fast definite integral calculator."
date: 2024-06-09
---

Recently, I built a [definite integral](https://en.wikipedia.org/wiki/Integral)
calculator to supplement a project for a calculus class that I'm taking. In the
project, I researched
[Romberg integration](https://en.wikipedia.org/wiki/Romberg's_method), which is
a way to approximate definite integrals with just a few calculations.[^1] Along
with a [paper](https://github.com/dzfrias/romberg/blob/main/paper.pdf)
documenting my research, I also made a
[website](https://dzfrias.github.io/romberg/) that implements the algorithm
defined in my paper.

The website was fun to make! In order to get the best performance possible, I
wrote the core algorithm in **Rust** and compiled it to
[WebAssembly](https://webassembly.org/). The calculator can quickly determine
when the integral of a function over an interval does not converge,[^2] and is
able to get extremely accurate approximations in just a few milliseconds.

By comparison to other online calculators, the one that I wrote is faster, just
as accurate, and importantly, **reports when the integral does not converge**.
In this blog post, I'll go over some things I learned in the process of making
the website!

# Stuff I Learned

Here are the main things I learned while making the website:

1. Wasm-Rust bindings are great, but the amount of tooling is cumbersome
2. Rust idioms don't always translate well to JavaScript

I'll go over these points in detail in the following subsections.

## Wasm-Rust Bindings

The [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) project makes
communicating between Rust and WebAssembly a breeze. It also makes using Web
APIs a super easy! Even if the functions that I want to export to WebAssembly
are complex, `wasm-bindgen` pretty much always has an _intuitive solution_
waiting for me.

Say I want to export this function in my compiled Wasm module:

```rust
fn fun_format(s: &str) -> String { format!("{s} is so cool!") }
```

If you've done any FFI work, you most likely just had flashbacks to late-night
FFI rabbit holes, complicated build steps, and the most "are you kidding me"
bugs possible. Sidestepping all of that, `wasm-bindgen` allows me to do this:

```rust
#[wasm_bindgen]
fn fun_format(s: &str) -> String { format!("{s} is so cool!") }
```

And I'm done (at least from the Rust side). The JavaScript side is about as
easy. I cannot explain in words how satisfying it feels to put `#[wasm_bindgen]`
over a `struct`, `enum`, or function and just have it **work**. I know a good
amount about WebAssembly (the instruction set), and it still feels magical.

### The Tooling Issue

Unfortunately, even with such fantastic FFI, there's quite a bit of work you
have to do to get Rust running on the browser with libraries like
`wasm-bindgen`. There are three separate
[mdbooks](https://github.com/rust-lang/mdBook) that I was bouncing between while
figuring out the website:

1. [The `wasm-bingen` in-depth tutorial](https://rustwasm.github.io/docs/book/)
2. [The `wasm-bindgen` reference](https://rustwasm.github.io/wasm-bindgen/introduction.html)
3. [The `wasm-pack` book](https://rustwasm.github.io/docs/wasm-pack/introduction.html)

`wasm-bindgen`, of course, is the library I mentioned earlier. `wasm-pack` is
the recommended tool for building your `wasm-bindgen` project (it's essentially
a wrapper over `cargo build`). There are a selection of targets to build for:
module bundlers like webpack (the default), node, and the browser.

All of this is pretty overwhelming when all I want to do is take advantage of
`wasm-bindgen`. I understand that an extra build step is pretty much required,
but I think `wasm-pack` has defaults that do not reflect the bare minimum of
work to get Rust code on the browser. The defaults should be simple: a Wasm
binary and some JavaScript files to load. No more, no less. The tutorials should
show you how to _build around_ those compilation artifacts to take advantage of
more complex tools, like bundlers.

To make it worse, while I was working on getting my code on the browser, I was
getting deprecation warnings and incompatibility errors from the various
dependencies that this build process requires. As we all know, web tooling is a
very fast-growing space, and there were a ton of dependencies required by using
`wasm-pack`, many of which were outdated.

## Rust Idioms to JavaScript

This point is less of an annoyance and more of just an interesting problem I
encountered. I'll start with the actual issue:

We all know and love Rust's `Result<T, E>` type.[^3] However, the
errors-as-values idea (and even enums in general) don't translate well to
JavaScript. In my program, the error type is defined as follows:

```rust
#[wasm_bindgen]
pub enum EvalError {
    ParseError,
    DoesNotConverge,
}

pub type Result<T> = std::result::Result<T, EvalError>;

// Example function
#[wasm_bindgen]
pub fn do_some_stuff() -> Result<()> { /* ... */ }
```

If I call `do_some_stuff` from JavaScript, and it returns a `Result::Err`, an
exception containing my `EvalError` will be thrown. This is a _completely_
different method for error handling! Interestingly, it's neither idiomatic Rust
_nor_ idiomatic JavaScript. If I want to catch this error, then I will have to
do something like this:

```js
try {
  // ...
} catch (e) {
  switch (e) {
    case 0:
      console.log("parsing error");
      break;
    case 1:
      console.log("DNE");
      break;
    default:
      console.error("bad error type found");
      break;
  }
}
```

`e` is a number because `EvalError` is translated to a number across the FFI
boundary. Not great...

# Wrap Up

To summarize my thoughts about the whole Rust-Wasm experience, I'd say that
**allowing for nice APIs that work in complete generality is hard**. Wasm is
useful (in part) _because_ of its generality. That makes it hard to provide a
great FFI experience out of the box. Not to mention, a lot of the idioms of a
language are lost in translation.

This project was really fun and a small dip into the waters of the practical
uses of WebAssembly. There's a lot of theory and cool experiments being done all
the time in the Wasm community, including
[one of my own projects](https://github.com/dzfrias/wsh). So it's nice to check
in with the real world once in a while. Not to mention, it was fun mixing
together heavy math and programming!

You can read [the paper](https://github.com/dzfrias/romberg/blob/main/paper.pdf)
if you're interested in the math or the algorithm we used to implement the
formula. Make sure to check out the project's
[GitHub repository](https://github.com/dzfrias/romberg/) if you're interested in
the actual implementation! Or, of course, you can use the calculator on the
[website](https://dzfrias.github.io/romberg/). Lastly, if you had any questions
or comments about this post, please
[submit an issue](https://github.com/dzfrias/website/issues/new) on this blog's
GitHub repository!

[^1]:
    Basically, it takes a number of
    [Riemann sums](https://en.wikipedia.org/wiki/Riemann_sum), and "combines"
    the information in them to extrapolate a better approximation. It's fast
    because it takes calculations you've already made and produces a better one.

[^2]: It does this _much_ faster than a graphing calculator can.
[^3]:
    If you don't, I'd recommend reading about it in
    [the Rust book](https://doc.rust-lang.org/stable/book/ch09-02-recoverable-errors-with-result.html)!
