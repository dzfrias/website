---
title: Exploring SIMD-Backed Strings
description:
  A report on my creation of SIMD-backed strings, an extremely fast small string
  type with SIMD built-in.
date: 2024-06-25
---

Perhaps one of the most accessible uses of
[SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) is in
string algorithms. If you're unfamiliar, SIMD instructions are CPU operations
that operate on **vectors** of data, as opposed to scalar registers like most
instructions. This means that you can perform operations on multiple pieces of
information, _simultaneously_. The example below shows SIMD addition, where two
vectors are added component-wise with one instruction, all at the same time.

![an example of component-wise addition in SIMD](/img/simd-backed-strings/add.png)

For strings, there are a lot of ways SIMD can speed up algorithms. In Rust,
there's the popular [memchr crate](https://docs.rs/memchr/latest/memchr/) that
provides a ludicrously fast SIMD byte search, and plenty of optimized parsers
utilize SIMD.[^parsers] SIMD string algorithms generally work like this:

1. Convert a slice of the string to a SIMD vector
2. Execute some SIMD instructions
3. Repeat 1-2 for the whole string until the algorithm's result is computed

A couple of days ago, though, I had an idea: why don't we make a string type
that's cheap to copy (small), and, using this smallness, make every algorithm
performed on it to take advantage of SIMD automatically?

# What is a SIMD-Backed String?

A SIMD-backed string is **a string whose information is packed into a SIMD
vector, in totality**. Many string operations (e.g. `find`, `contains`,
`to_uppercase`, etc.) can inherently be accelerated with SIMD, with no
conversions necessary!

Since the length of the string is **always** less than the length of a SIMD
vector, we can do all of our standard string operations using SIMD without any
extra work.[^size] Also, since these strings are small, they'll be cheap to
copy.

Here's a diagram of what a SIMD string might look like in memory:

![example string, showing eight squares that contain the message: "hello!!"](/img/simd-backed-strings/string.png)

In the above picture, each square is one byte, so the SIMD string is 8 bytes
wide **maximum**. This special string is also **NUL terminated**. For any C
programmers who just had a violent reaction upon reading that, don't worry! We
can easily (and efficiently) compute the length using SIMD operations, so the
pitfalls of NUL-terminated strings can be avoided.

## Example

Let's write an algorithm to convert a SIMD-string $S$ to lowercase. In ASCII
world, you may know that for any uppercase letter $l$, the corresponding
lowercase letter is $l + 32$. We can exploit this fact: at the _simplest level_,
our algorithm will be a vector addition operation. Let's write it out:

```nasm
;; simd.add DST LHS RHS
;; Splat takes in a scalar and returns
;; a vector filled with that scalar.
simd.add S S splat(32)
```

This performs component-wise addition on each byte in $S$, turning each
uppercase letter to lowercase. However, this implementation is buggy! What
happens when the character is _not_ alphabetic? We need a way to conditionally
apply our addition, so that it _only_ operates on uppercase letters.

That's where **masks** and **selects** come into play. A mask is a SIMD vector
that contains only zeroes and ones. For our use-case, we want a mask $M$ such
that $M_i = 1$ when $65 \le S_i \le 90$, and zero otherwise ($65$ and $90$ are
the byte values of `'A'`and `'Z'`, respectively). In math notation:

$$
M_i =
\begin{cases}
    1 & 65 \le S_i \le 90 \\
    0 & \text{otherwise}
\end{cases}
$$

Then, we can use a select, which will use this mask to "conditionally" modify
characters in our string. Here's what the algorithm looks like with the mask and
select:

```nasm
;; Two masks: one selecting values >= 65,
;; the other selecting values <= 90
simd.ge M1 S splat(65)
simd.le M2 S splat(90)
;; Combine the masks using bitwise-and
;; storing the result in M
simd.and M M1 M2

;; Stored in T
simd.add T S splat(32)
;; simd.select DST M T F
simd.select S M T S
```

The key here is `simd.select`. It takes in a mask, and for each $i$, when
$M_i = 1$, it sets $\text{DST}_i = T_i$, and if $M_i = 0$, it sets
$\text{DST}_i = F_i$. In other words:

$$
\text{DST}_i = \begin{cases}
                T_i & M_i = 1 \\
                F_i & M_i = 0
\end{cases}
$$

Hopefully this example showed how SIMD can be used to write branchless, parallel
algorithms. And ([spoiler alert!](#benchmarks)), this algorithm is _much_ faster
than its non-SIMD counterpart.

# Implementation

I implemented SIMD-backed strings in **Rust** using the experimental
[`portable-simd`](https://github.com/rust-lang/portable-simd) feature. The
string looks like this:

```rust
pub struct Qstr<const N: usize>(Simd<u8, N>)
where
    LaneCount<N>: SupportedLaneCount;
```

This allows you to choose the size `N` at compile time.

I'd never used `portable-simd` before, but it was wonderful! The
[example algorithm](#example) I gave is implemented like this:

```rust
impl Qstr {
    // --snip--
    pub fn to_lowercase(&self) -> Self {
        let mask = self.0.simd_ge(Simd::splat(b'A')) & self.0.simd_le(Simd::splat(b'Z'));
        Self(mask.select(self.0 + Simd::splat(32), self.0))
    }
    // --snip
}
```

`portable-simd` has an amazing API that allows SIMD code to be concise,
intuitive, and of course, CPU-agnostic. My main only pain points were when I
needed to swizzle a vector, but the team is
[actively working on that](https://github.com/rust-lang/portable-simd/issues/364)!
I personally cannot wait until the library is stabilized![^nightly]

# Benchmarks

As far as I'm aware, SIMD-backed strings boast some of the **best performance**
numbers out there right now. Here is a table comparing SIMD-backed strings with
various other string types, run on my M1 MacBook Air:

| Test        | Qstr     | String   |
| ----------- | -------- | -------- |
| `uppercase` | 382.23ps | 16.652ns |
| `replace`   | 741.00ps | 27.079ns |
| `contains`  | 462.25ps | 7.5863ns |
| `find`      | 783.67ps | 11.436ns |
| `eq`        | 313.04ps | 1.5928ns |

This is only a small selection of algorithms, but similar performance behavior
is present for the rest of the `Qstr` methods.[^worst-case]

For some methods (like `replace`), the performance increase was substantial. For
others, (i.e. `eq`), the performance increase was statistically significant but
not as incredible. Also note that each of tests were run on a string with
length 16.

I've compiled a list of reasons why I think why such good performance is
possible:

- SIMD. Computations are done in a single step.
- Small. The strings aren't heap allocated, and they're cache-efficient.
- Branchless. Most algorithms can be done without branches.
- Immutable. Moving it around is cheap and thus there are less pointer derefs.
- Always in a SIMD vector. No conversions necessary!

# Wrap-Up

This post was a report on some experiments I've been doing with SIMD-backed
strings. I also tried to give an introduction to SIMD and its use-cases, so
hopefully you can start applying SIMD to your programs where it's appropriate!

SIMD-backed strings are useful as a "small string" type, which is a very common
optimization for string-related programs. They use SIMD out of the box, so _no_
SIMD knowledge is required to take advantage of SIMD's speed!

Anyway, I hope this post was interesting and clear. If there were any issues,
errors, or questions you came across while reading, feel free to open a
[GitHub issue](https://github.com/dzfrias/website/issues/new) in this website's
GitHub repository!

[^parsers]:
    Examples: [`simdjson`](https://github.com/simdjson/simdjson),
    [`tl`](https://github.com/y21/tl), and
    [`atoi-simd`](https://docs.rs/atoi_simd/latest/atoi_simd/).

[^size]:
    The largest SIMD vectors I could find on commercial CPUs are 512-bits wide,
    but most machines support a maximum of 256-bit vectors.

[^nightly]: Right now, you need the nightly version of Rust to use it.
[^worst-case]:
    Note that $O(n)$ `String` operations like `contains`, `find`, and `eq` were
    done with **worst-case** scenarios. There were no notable worst-case
    scenarios for `Qstr` algorithms.
