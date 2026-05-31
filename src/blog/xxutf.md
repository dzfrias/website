---
title: "xxUTF: Unicode Normalization at Speed"
description:
  xxUTF provides highly optimized Unicode normalization and case folding
  routines for UTF-8 and UTF-16 using SIMD. All in a small, simple C library.
date: 2026-05-31
---

[xxUTF](https://github.com/dzfrias/xxUTF) provides highly optimized
[Unicode normalization](#unicode-normalization) and
[case folding](#case-folding) routines for UTF-8 and UTF-16 using SIMD. All in a
small, simple C library. It never allocates memory, does not depend on libc,
cannot fail, and most importantly, is **insanely fast**. It is a direct
replacement for [utf8proc](https://github.com/JuliaStrings/utf8proc) and the
relevant parts of [ICU4C](https://github.com/unicode-org/icu).

I've been working on this project for a long time. This post comes along with
the alpha (v0.1.0) release of the project. In it, I will walk through
[what xxUTF does](#unicode-normalization), provide [basic usage](#usage) of the
C API, and dicuss [future plans](#future-plans) for the project.

I will also write a follow-up post dedicated to explaining the SIMD algorithms
and optimizations I came up with to achieve the speed that I did.

# Unicode Normalization

> This section will go over what xxUTF does. If you're already familiar with
> Unicode normalization, skip to [the Usage section](#usage).

Unicode normalization is a process that transforms strings of
[Unicode text](https://en.wikipedia.org/wiki/Unicode) (i.e.
[UTF-8](https://en.wikipedia.org/wiki/UTF-8),
[UTF-16](https://en.wikipedia.org/wiki/UTF-16)[^endianness], or
[UTF-32](https://en.wikipedia.org/wiki/UTF-32) encoded strings). I will now
explain the problem that normalization solves and how it works.

Consider the character "é". This character corresponds to a **code point**
defined by the Unicode standard. A code point is just a number that identifies a
character. In this particular case, "é" has a code point value of
0x00E9.[^code_points]

The point is, the computer reads 0x00E9 and renders "é" in accordance. Now try
running this Python code:

```python
__runnable
print(chr(0x00E9))
print(chr(0x0065) + chr(0x0301))
```

You should see "é" printed twice. But clearly, we are printing two different
strings. What's going on?

It turns out that there are two ways to render "é": either with 0x00E9 or with
0x0065, 0x0301. Taking a look at the latter, we will find that 0x0065 maps to
"e" (ASCII letter e) and 0x0301 maps to "◌́" (combining acute mark). The renderer
reads this sequence of characters and places the combining mark on top of the
base character (thus creating "é"), whereas in the first example, the renderer
just maps 0x00E9 directly to "é".

There are good reasons that both these methods of rendering "é" exist, and it
turns out that there are many code points that have similar behavior. But this
can also lead to problems, as in:

```python
__runnable
print(chr(0x00E9) == chr(0x0065) + chr(0x0301))
```

evaluates to false even though both strings look the exact same, which is a bad
property. We **don't** have the following relationship:

$$
\text{appearance}(x) = \text{appearance}(y) \iff x = y
$$

This is where Unicode normalization comes in. Normalization guarantees that:

$$
\text{appearance}(x) = \text{appearance}(y) \iff \text{normalized}(x) = \text{normalized}(y)
$$

Essentially, if two strings _look_ the same, they will _be_ the same if
normalization is applied to both sides.

## Normalization Forms

Although I used the term "normalization" loosely in the last section, there are
actually four different ways to normalize a string defined by the Unicode
standard (yet they all have the property I concluded with in the last section):

- NFD (decomposition)
- NFC (composition)
- NFKD (compatibility decomposition)
- NFKC (compatibility composition)

Returning to the previous example, NFD normalization expands code points where
possible. For example, we have:

```python
__runnable
import unicodedata

assert unicodedata.normalize("NFD", chr(0x00E9)) == chr(0x0065) + chr(0x0301)
print("Assertion passed!")
```

So 0x00E9 gets expanded to 0x0065, 0x0301. NFC does the opposite:

```python
__runnable
import unicodedata

assert unicodedata.normalize("NFC", chr(0x0065) + chr(0x0301)) == chr(0x00E9)
print("Assertion passed!")
```

NFKD and NFKC are special variants of NFD and NFC respectively. All they do is
turn special characters like "①" and "⑴" into "1".[^compat]

## Case Folding

Have you ever checked that two strings are equal by converting them to
lowercase? This is called
[caseless matching](https://www.unicode.org/reports/tr21/tr21-5.html#Caseless_Matching).
Although the lowercase implementation is common, it is not the proper operation
for caseless matching when writing in certain languages. For example, the German
letter "ß" uppercases to "SS". So, if we were doing case insensitive comparison,
we would want "ß" to equal "SS". This is not the case:

```python
__runnable
print("ß".lower() == "SS".lower())
```

Thus we need **case folding**, which is the proper way to do caseless matching:

```python
__runnable
print("ß".casefold() == "SS".casefold())
```

# Usage

xxUTF implements conversion to all normalization forms as well as case folding
for UTF-8 and UTF-16 encoded Unicode text. It is distributed as an amalgamated C
file with a single header, similar to
[what SQLite does](https://sqlite.org/amalgamation.html). You can download the
amalgamation on the [releases page](https://github.com/dzfrias/xxUTF/releases)
of the GitHub repository.

Using the C API looks like this:

```c
// Get a good upper bound on the size of the output after NFC normalization
size_t out_length_bound = xxutf_normalize_utf8_nfc_length(input, input_length);
// Allocate according to out_length_bound
uint8_t *out = malloc(out_length_bound + 1);
// Get the actual number of bytes written (<= out_length_bound)
size_t out_length = xxutf_normalize_utf8_nfc(input, out);
// xxUTF does not write a NUL byte
out[out_length] = '\0';
printf("NFC normalized to: '%s'", out);
```

[More documentation](https://github.com/dzfrias/xxUTF/blob/main/README.md#api)
lives on the GitHub repository.

# Benchmarks

xxUTF has the fastest open source implementations of Unicode normalization and
case folding algorithms by far. Here are benchmark results for UTF-8 NFD
normalization, run on a machine supporting
[Arm Neon](https://www.arm.com/technologies/neon), using inputs from real-world
texts (blue is xxUTF):

{% img "neon_utf8_nfd.png", "Benchmark results for UTF-8 NFD" %}

These are the results for NFKC normalization on UTF-16LE text:

{% img "neon_utf16le_nfkc.png", "Benchmark results for UTF-16LE NFD" %}

If you're curious and want to run your own tests on xxUTF's speed, check out
[the documentation](https://github.com/dzfrias/xxUTF/blob/main/README.md#building).
Also see the
[`benchmarks/`](https://github.com/dzfrias/xxUTF/tree/main/benchmarks) directory
for details.

# Future Plans

xxUTF still has a long way to go before being production-ready. Mainly, it needs
to support more SIMD instruction sets. As of right now, only Arm Neon has been
implemented. The good news is that xxUTF is still the fastest implementation
even _without_ SIMD.

Also, xxUTF needs to be safe. Although the fuzzer helps, I haven't done a
thorough security check of the project. Because xxUTF has simple functionality,
there are not many avenues for vulnerabilities, but I am sure they exist in the
project.

# Wrap Up

I hope you enjoyed this post! If you want to encourage the development of xxUTF,
star the project [on GitHub](https://github.com/dzfrias/xxUTF). Version 0.1.0
stands as a proof of the speed possible using SIMD, and there is more to come.
xxUTF is ready for usage in hobby projects and non-critical applications, but
there is a lot to be done, [as mentioned earlier](#future).

If you have any questions or comments,
[submit an issue](https://github.com/dzfrias/website/issues/new) on this
website's GitHub repository!

## Credits

The [simdutf](https://github.com/simdutf/simdutf) project is one of the leading
examples of a production-grade SIMD C library. I also used some of their
techniques for parsing UTF-8, which is cited in the source code in the relevant
places.

AI was not used to write the xxUTF library, nor for the creation of the
vectorized algorithms that power xxUTF's speed. However, I did use LLMs to
generate some supplementary scripts and programs. All usages are cited in the
source code.

[^endianness]:
    Note that UTF-16 actually encompasses two encodings: UTF-16LE and UTF-16BE.
    LE and BE stand for little-endian and big-endian respectively. The
    difference between the two is small, but
    [endianness](https://en.wikipedia.org/wiki/Endianness) it is an important
    detail to consider if you were using these encodings. xxUTF supports both
    endians.

[^code_points]:
    Not all characters have a code point value. This is because combining marks
    exist, which I will explain soon.

[^compat]:
    Compatibility variants naturally **do** change the appearance of the text
    they are run on, whereas NFD and NFC do not. This is by design, and can be
    helpful in areas like string matching based on user input.
