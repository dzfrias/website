---
title: Fun Fixture Tests in Rust
description: Learn about writing fixture tests and a fixture harness in Rust!
date: 2024-03-15
---

# Fun Fixture Tests in Rust

Recently, I've been working on an interpreter/shell
([wsh](https://github.com/dzfrias/wsh)). For projects like this, I want to make
sure I have lots of tests! However, as my features got more complex and nuanced,
I found it hard to freely write tests in a **streamlined** manner.

For example, let's say you're testing a simple interpreter. Writing tests for it
should normally involve you doing something like this:

```rust
#[test]
fn some_math() {
  let input = "1 + 1";
  let expected = 2;
  // ...
}
```

No problem, right? But what happens when you need to test semi-complex control
flow?

```rust
#[test]
fn looping_and_break() {
  let input = "x = 0\nwhile true:\n    x += 1\n    if x == 10:\n        break\nx";
  let expected = 10;
  // ...
}
```

Not as nice... and while you can use multiline strings (or even use the
[`indoc`](https://crates.io/crates/indoc) macro), there is still some
boilerplate, and it began to bother me. Yes, a solution _might_ be unnecessary.
But it's _fun_ (and it looks cool)!

Okay, so what if we had a test that:

- Is described by a file
- Has arbitrary metadata at the top
- Gets its own entry in the `cargo test` output

Maybe something like this:

```text
---
expected: 10
---

x = 0
while true:
    x += 1
    if x == 10:
        break
x
```

This is called a
[test fixture](https://en.wikipedia.org/wiki/Test_fixture#Software), and is a
common pattern for certain types of software.

## Inspiration & Implementation

The idea for this style of test was inspired by the excellent
[WABT](https://github.com/WebAssembly/wabt) project.
[Their tests](https://github.com/WebAssembly/wabt/tree/356931a867c7d642bc282fff46a1c95ab0e843f3/test)
are run by a much more complicated fixture harness than what my implementation
has (with their own fancy
[DSL](https://en.wikipedia.org/wiki/Domain-specific_language)), so if you want
to look at something more robust, definitely check WABT out.

[My own implementation](https://github.com/dzfrias/wsh/blob/d59ad832931519838bf233248dd2c8c19e6169d2/tests/shell.rs)
is largely driven by [serde](https://github.com/serde-rs/serde) and
[dir-test](https://github.com/fe-lang/dir-test). Serde is used to parse the
metadata (in the `---`), and dir-test is used to generate tests cases based on
**files in a directory** (at compile time). So, every file in the
[fixtures directory](https://github.com/dzfrias/wsh/tree/d59ad832931519838bf233248dd2c8c19e6169d2/tests/fixtures)
corresponds to a test.

If you want to use this style of testing in your own project, keep in mind that
[my implementation](https://github.com/dzfrias/wsh/blob/d59ad832931519838bf233248dd2c8c19e6169d2/tests/shell.rs)
is for a shell, so some parts may have to be adapted. It's quite simple though
(only about ~80 lines); it shouldn't be too hard to apply to something else!

## Closing Thoughts

Using this style of testing in wsh has been pretty great! It was fun to
implement, and it's now much nicer to write tests. It also helps when **viewing
diffs**, which was an unexpected bonus when I first wrote the fixture harness.

Let me know if you have any further questions or if there were any issues you
found in this post!
