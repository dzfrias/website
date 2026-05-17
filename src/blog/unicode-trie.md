---
title: Fast Unicode Character Lookups
description:
  An example of how tries can be used to achieve fast lookups for small integers
  on a static dataset without taking up much space.
date: 2026-05-14
---

In this post, I'll be going over a very useful application of
[tries](https://en.wikipedia.org/wiki/Trie) (also called prefix trees): fast
key-value lookups for small integers. In particular, these tries are specialized
for

- Statically-known key-value data (no insertion or deletion at runtime)
- Integer keys less than $2^{16}$
- **Extremely** fast lookup
- Compact memory representation

Some experience with low-level optimization and data structures is recommended
for reading this post.

# Motivation

The motivation to explore key-value data structures with the properties that I
wanted (listed above) came from a problem in a project I was working on. Given a
Unicode character, I wanted to quickly get its
[combining class](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-4/#G32493),
which is an 8-bit number that is assigned by the Unicode specification. For
instance, the character ◌̃ (U+0303) has a combining class value of 230.[^usage]

Combining classes are always constant (i.e. they can't change at runtime), so I
had the ability to create a data structure at compile time instead of computing
it during the program's lifetime.

You might already be thinking of a data structure that is a classic, efficient,
and interesting solution to this problem:
[perfect hash tables](https://en.wikipedia.org/wiki/Perfect_hash_function). For
reference, a perfect hash table is a hash table that has no collisions, which is
made possible by knowing the keys ahead of time. I used them in my initial
implementation, and they were generally pretty fast!

This is the Python translation[^python] of my hash table lookup code:

```python
def perfect_hash(x: int, salt: int, n: int) -> int:
    mask_32 = 0xFFFFFFFF
    y = ((x + salt) * 2654435769) & mask_32
    y ^= (x * 0x31415926) & mask_32
    return (y * n) >> 32
```

Only a few instructions, right? Yes, but that was not the problem.

Although they look great on paper, in reality, there are _many_ performance
downsides to hash tables, even ones I could fully compute at compile time! Here
are a few I ran into:

- Hash tables have famously bad cache locality. For example, two characters like
  ȃ (U+0203) and Ȃ (U+0202) are a "code point distance" of 1 apart, but
  accessing their values from the hash table requires loading completely
  different sections of memory
- Good hashing requires doing computations in 32-bit (or even 64-bit) space.
  This was a problem because I wanted to be able to do lookups using
  [SIMD](https://en.wikipedia.org/wiki/Single_instruction%2C_multiple_data), and
  converting from a 16x8 vector to two 32x4 vectors is very wasteful.[^vectors]
- Wasted memory. Most (around 99%) of Unicode characters have a combining class
  value of 0. The perfect hash table cannot take advantage of this fact to save
  space.

This all led me to wanting an alternative data structure that didn't have these
downsides. After doing some research, tries were the clear best choice.

# What is a Trie?

A more descriptive name for a trie is "prefix tree". There are many ways to
interpret a trie, but I will go over the perspective that is most useful for
this problem.

Consider a naïve table lookup for a 16-bit integer. That is, we have a static
array $\text{A}$ that contains $2^{16}$ 8-bit integers (the combining class
values). If we have a Unicode character with code point value $x$, we can access
its value by performing $\text{A}[x]$. This is theoretically very fast because
it takes just one memory access, but the table ends up being 65,536 bytes large!

{% img "v1.png", "diagram of naïve implementation" %}

The problem is that, in order to index to the value we want, we need 16 bits of
information. What if we try indexing with less bits? Let's try only looking at
the first 10 bits of $x$ (the prefix). So if we now have a table of size
$2^{10}$, we can perform lookups by doing $\text{A}[x \gg 6]$. But since we used
the 10 bit prefix of $x$, there are $2^6$ code points with the same prefix. For
example, the prefix of $x = \text{0x1DC0}$ ◌᷀ is 8 ($x \gg 6$), but
$x = \text{0x1DC2}$ ◌᷂ also has a prefix of 8. These characters have different
combining classes, though. Hence we have a problem because we cannot
differentiate these two characters when trying to get their combining class
values.

{% img "v2.png", "diagram of prefix implementation" %}

So what if we instead stored an index in $\text{A}$, so that each
$i = \text{A}[x \gg 6]$ identifies a group of 64 code points with the same 10
bit prefix as $x$? We can then create a new table, $\text{B}_i$, that has size
64 such code points. To differentiate code points in this small subset, we can
index $\text{B}_i$ using the six bits we shifted out when getting $i$:
$\text{B}_i[x \, \& \, 63]$.[^mask] If we store the 8 bit combining class at
this location, we now have a reliable key-value data structure! This, in
essence, is a **two-stage trie**.

{% img "v3.png", "diagram of B_i sub-tables implentation" %}

For simplicity, let's concatenate each $\text{B}_i$ into one big table,
$\text{B}$. We index into it using $\text{B}[i + (x \, \& \, 63)]$ (assuming $i$
points to where the 64 byte block starts in the big $\text{B}$ table). You might
be wondering how this is an improvement space-wise over our naïve data
structure. It is not right now, but it has a lot of potential.

{% img "v4.png", "diagram of concatenated B table implementation" %}

Here's just one application of this new key-value lookup scheme: I mentioned
earlier that the vast majority of characters have a combining class value of
zero. This means that most $\text{B}_i$ blocks are "zero blocks" (i.e. filled
with 64 zeroes). So in our $\text{A}$ table, we can change all $i$ values that
point to different zero blocks in $\text{B}$ point to the _same zero block_ in
$\text{B}$, and drop all the other zero blocks. This alone saves us a ton of
space in our combining class example.

{% img "v5.png", "diagram of deduplicated B table implementation" %}

## Further Compaction

There are a few other compaction techniques that are similar to the zero block
deduplication:

1. General block deduplication
2. Fast prefix-suffix merging
3. Slow prefix-suffix merging

General block deduplication is just the generalized version of what was
described before: keep track of which 64-byte blocks we've encountered and
change all indices that point to copies of that 64-byte block to point to the
same 64-byte block. This is the same thing as what we did for the zero blocks,
but with arbitrary block values. This can save _a lot_ of space on many
real-world value distributions.

Prefix-suffix deduplication can also save space. Suppose we have two distinct
blocks, $\text{B}_i$ and $\text{B}_j$, that are of this form:

{% img "overlap.png", "diagram of overlapping blocks" %}

Notice that the last 7 bytes of $B_i$ is the same as the first 7 bytes of $B_j$.
This means that we can merge $\text{B}_i$ and $\text{B}_j$ in the $\text{B}$
table so that indices pointing to $\text{B}_j$ start at the last 7 bytes of
$\text{B}_i$.

{% img "merged.png", "diagram of block merging" %}

How do we find blocks that we can perform this operation on? One possible way is
to try to merge blocks as we are putting together $\text{B}$ from the many
$\text{B}_i$ blocks. For example, we try to merge $\text{B}_{i-1}$ and
$\text{B}_{i}$. This is pretty quick to check, but obviously isn't the optimal
way to construct $\text{B}$ using prefix-suffix merging:

```python
B = blocks[0].copy()
for i in range(1, len(blocks)):
  # Number of bytes shared in the suffix of blocks[i - 1] and prefix of blocks[i]
  n = longest_overlap(blocks[i - 1], blocks[i])
  B.extend(blocks[i][n:])
```

Again, this _only_ tries to merge **adjacent blocks** (by index).

We can reach the theoretically optimal solution using a complete directed graph.
Each node in this graph is a block, and the weights between each node is
determined by how many bytes are shared between prefixes and suffixes. For
correctness, edge weights should be less than half the block size (64 in our
case)[^correctness].

{% img "tsp.png", "diagram of complete directed graph" %}

We can then find the optimal way to arrange these blocks by finding the
**maximum cost Hamiltonian path**. A Hamiltonian path is a path through the
graph that visits every node exactly once. This is actually an NP-hard problem!
If we wanted to find a decent solution, we could an
[approximation algorithm](https://en.wikipedia.org/wiki/Travelling_salesman_problem#Heuristic_and_approximation_algorithms).

Depending on the data, finding a near-optimal prefix-suffix deduplicated path
can be helpful. But in the case of my combining class problem, doing
prefix-suffix deduplication by only checking adjacent blocks was good enough.

# Final Notes

I hope this post illustrates an aspect of tries very useful for low-level
performance: compressing indexing spaces while maintaining very fast lookups.
The speed gains in my project were substantial when moving from perfect hash
tables to tries. Note that this post highlights just one use case of tries.
Tries pop up in many other areas in programming!

Credits are due to the [ICU project](https://github.com/unicode-org/icu) for
sparking my interest in using tries for low-level performance!

If you have any feedback, comments, or issues with this post, please let me know
by [submitting an issue](https://github.com/dzfrias/website/issues/new)!

## Python Code

Here is reference Python code for the trie that I described in this post.

```python
LIMIT = 0x10000

SHIFT = 6
BLOCK_LENGTH = 1 << SHIFT
MASK = BLOCK_LENGTH - 1

FLAG_UNSEEN = 0
FLAG_SEEN = 1


class Trie:
    def __init__(self) -> None:
        self.index: list[int] = [0] * (LIMIT >> SHIFT)
        self.data: list[int] = []
        # Keeps track of which 12-bit prefixes we've encountered
        self._flags: list[int] = [FLAG_UNSEEN] * (LIMIT >> SHIFT)

    def get(self, c: int) -> int:
        i = c >> SHIFT
        return self.data[self.index[i] + (c & MASK)]

    def set(self, c: int, value: int) -> None:
        assert c < LIMIT
        i = c >> SHIFT
        block: int
        # Already exists as an index
        if self._flags[i] == FLAG_SEEN:
            block = self.index[i]
        else:
            block = self._alloc_new_block(i)
        self.data[block + (c & MASK)] = value

    def compact(self) -> None:
        compressed = []

        # Keeps track of blocks that we've seen before
        blocks = {}
        for i in range(len(self.index)):
            block_index = self.index[i]
            block_slice = self.data[block_index : block_index + BLOCK_LENGTH]
            block = tuple(block_slice)
            # Check if we can fully deduplicate this block
            if block in blocks:
                self.index[i] = blocks[block]
                continue

            # If we can't deduplicate the block, then see if we can merge it
            # partially with the previous block
            overlap = longest_overlap(compressed, block_slice, BLOCK_LENGTH)
            if overlap > 0:
                index = len(compressed) - overlap
                compressed.extend(block_slice[overlap:])
                self.index[i] = index
                blocks[block] = index
                continue

            # If we can't do either of the above compaction operations, we
            # should allocate the new data
            self.index[i] = len(compressed)
            blocks[block] = len(compressed)
            compressed.extend(block)

        self.data = compressed

    def _alloc_new_block(self, i: int) -> int:
        new_block = len(self.data)
        self.data.extend([0] * BLOCK_LENGTH)
        self.index[i] = new_block
        self._flags[i] = FLAG_SEEN
        return new_block


def longest_overlap(lst1: list, lst2: list, max_overlap: int) -> int:
    overlap = max_overlap - 1
    if overlap > len(lst1):
        return 0
    while overlap > 0 and lst1[-overlap:] != lst2[:overlap]:
        overlap -= 1
    return overlap
```

Prefix-suffix merging is done by checking adjacent blocks (not using a complete
graph) as described in the [Further Compaction](#further-compaction) section.

[^usage]:
    In the Unicode specification, combining class values are used to determine
    how combining characters should be sorted during
    [normalization](https://www.unicode.org/reports/tr15/). For example, the
    string <U+0044, U+0300, U+0316> has comining classes <0, 230, 220>.
    Normalization would re-order this string to become <U+0044, U+0316, U+0300>.

[^python]: The actual code was written in C.

[^vectors]:
    Some vector instruction sets support 256-bit vectors (making 32x8 vectors
    possible), but for maximum compatibility with commonly-used instructions
    sets like ARM NEON, it is better to support 16-bit operations.

[^mask]:
    63 is represented with six 1s in binary, so using 63 as a mask will get the
    last 6 bits of the number.

[^correctness]:
    This is so prefix merging with one block doesn't overwrite the possible
    suffix merges with other blocks.
