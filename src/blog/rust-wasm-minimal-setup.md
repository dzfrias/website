---
title: The Minimal Rust-Wasm Setup for 2024
description:
  This post will go over the quickest way to get your Rust code running on the
  web in 2024!
date: 2024-06-17
---

If you're looking to get your Rust code on the browser, chances are you've
stumbled across the various [mdBooks](https://github.com/rust-lang/mdBook)
written by the Rust+Wasm community.[^mdbooks] These books are great, but they
require **a lot of tooling/setup** for what should be a pretty simple task:
compile my Rust program to WebAssembly and interface with it using
JavaScript![^romberg]

So, this post is for anyone who was as overwhelmed as I once was with the
tooling. By the end, you'll have a minimal Rust+Wasm setup, with **as few
dependencies as possible**! I'll start from the very beginning and explain the
role of each tool as we go.

# The Rust Part

Before we even think about JavaScript or HTML, we're going to want a WebAssembly
binary. In this section, we're going to build one. If you don't have a Rust
project already, enter the following commands in your shell:

```bash
$ cargo new --lib rustwasm
$ cd rustwasm
```

Additionally, we'll want to edit the `Cargo.toml` file to include
[`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen). `wasm-bindgen` is a
Rust crate that makes it _much_ easier to communicate between Rust and
JavaScript. It generates **bindings** so that your JavaScript code doesn't have
to interact with low-level WebAssembly stuff, and your Rust code doesn't have to
deal with FFI! Anyway, this is what your `Cargo.toml` should look like:

```toml
[package]
name = "rustwasm"
version = "0.1.0"
edition = "2021"

[dependencies]
wasm-bindgen = "0.2"

[lib]
crate-type = ["cdylib", "rlib"]
```

Notice the `crate-type` declaration. This is **required** for compiling Rust
libraries to WebAssembly.[^crate-type] Now, we can get to actually writing our
Rust code! Modify `lib.rs` to contain the following:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Import `alert` from JS runtime
    fn alert(s: &str);
}

// Export `greet`
#[wasm_bindgen]
pub fn greet() {
    alert("Hello, world!");
}
```

Our Wasm module will export the function, `greet`, and import the
[JavaScript function](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert),
`alert`.[^wasm-bindgen]

This is all we need from the Rust side of things! There's one catch though: you
can't use `cargo build` to build the Wasm binary! You need a special tool to
generate the bindings files. For that, we'll use
[`wasm-pack`](https://github.com/rustwasm/wasm-pack). Go ahead and follow the
installation instructions if you don't already have it.

```bash
$ wasm-pack build --target web --out-dir web/dist
```

This command should build the Rust project and put it in `web/dist/` directory
at the root of your project. If you visit the directory, you'll see a Wasm
binary accompanied by some JavaScript files. Those JS files are the **glue**
between your JavaScript code and your Rust code (they wrap the Wasm module, so
you don't interface with it directly)![^target]

We're (eventually) going to serve our `index.html` file from the `web/`
directory, so it's important that our Wasm stuff is in there. Speaking of HTML
and JS, it's time to move on!

# The HTML & JS Part

All I'm going to do from the JavaScript side is make a script (`index.js`) that
calls the `greet` function we defined earlier. Make sure you're operating in the
`web/` directory. Calling `greet` can be accomplished like so:

```js
import init, * as wasm from "./dist/rustwasm.js";

await init();
wasm.greet();
```

The `init()` call will initialize our Wasm module. Make sure to _always_ call
this first! Also, **this operation is asynchronous**, so we're using a top-level
`await`, which is an important detail.

With our `index.js` file written, all we need is an `index.html` to serve our
website! I'll give an example one below:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Rust+Wasm Minimal Setup</title>
  </head>
  <body>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

Notice that we make our script of type **module**. This enables us to use a
top-level `await`. We're now ready to serve it! I like using Python to serve my
files on localhost, but you can use your favorite tool.

```bash
$ python3 -m http.server
```

Visit `http://localhost:8000/` and you should see the greeting message!

![Final product](/img/rust-wasm-minimal-setup/working.png)

# Wrap-Up

In this post, we made a website that uses a **minimal** Rust and WebAssembly
configuration. I tried to keep this post short and concise, but if you want to
do further readings to really learn how things work, I've left plenty of
footnotes!

As always, if you have any feedback or questions,
[open an issue](https://github.com/dzfrias/website/issues/new) on this blog's
GitHub repository!

[^mdbooks]:
    See the [`wasm-bindgen` book](https://rustwasm.github.io/wasm-bindgen/), the
    [`wasm-bindgen` in-depth tutorial](https://rustwasm.github.io/docs/book/),
    and the
    [`wasm-pack` book](https://rustwasm.github.io/docs/wasm-pack/introduction.html).

[^romberg]:
    In fact, I wrote [a blog post](https://dzfrias.dev/blog/romberg) about the
    struggle!

[^target]:
    If you're wondering what `--target web` is, it just tells `wasm-pack` to not
    build for an external bundler or node. It's not the default, but I think it
    simplifies things a lot and reduces the number of external tools (no npm!)

[^crate-type]:
    Read the [Rust reference](https://doc.rust-lang.org/reference/linkage.html)
    for more info on this.
    [This StackOverflow post](https://stackoverflow.com/questions/56227766/why-must-a-wasm-library-in-rust-set-the-crate-type-to-cdylib)
    was helpful too.

[^wasm-bindgen]:
    `wasm-bindgen` can do a lot more than just that though! You can
    [read the book](https://rustwasm.github.io/wasm-bindgen/introduction.html)
    if you're curious.
