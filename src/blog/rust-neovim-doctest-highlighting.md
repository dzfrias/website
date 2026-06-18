---
title: Highlighting Rust Doctests in Neovim
description:
  A code snippet for injecting Rust syntax highlighting into doctests in Neovim,
  using tree-sitter.
date: 2026-06-17
---

Have you ever wanted [tree-sitter](https://tree-sitter.github.io/tree-sitter/)
language injections for your doctests and other code blocks in
[Neovim](https://neovim.io/)?

````rust
/// Here is an important fucntion with a contrived example.
///
/// ```rust
/// # use::my_crate::important_fn;
/// assert_eq!(important_fn("hello"), 68);
/// ```
pub fn important_fn(s: &str) -> usize {
    unimplemented!();
}
````

Existing Rust tree-sitter query providers (like
[nvim-treesitter](https://github.com/neovim-treesitter/nvim-treesitter/blob/main/runtime/queries/rust/injections.scm))
don't do this yet, mostly because it's non-trivial to get working with the
[standard Rust tree-sitter parser](https://github.com/tree-sitter/tree-sitter-rust).

But I spent an afternoon figuring it out to get something that _almost_
perfect.[^caveat] This post will that share that solution, as well as give an
explanation for how it works.

# The Query

Here is the injection query that I created:

````scheme
((line_comment (doc_comment) @_first) @injection.language
  .
  ((line_comment (doc_comment) @injection.content))+
  .
  (line_comment (doc_comment) @_last)
  (#lua-match? @_first "^%s*```[a-zA-Z_][a-zA-Z0-9_]*%s*$")
  (#lua-match? @_last "^%s*```%s*")
  (#not-any-lua-match? @injection.content "^%s*```%s*")
  (#gsub! @injection.language "^.*```([a-zA-Z_][a-zA-Z0-9_]*)%s*$" "%1"))
````

I recommend putting this in your `after/` directory. For me, the relevant path
is `$XDG_CONFIG_HOME/nvim/after/queries/rust/injections.scm`. Don't forget to
put

```scheme
; extends
```

at the top of the file!

This should be enough to see highlights for code blocks, provided they have a
language tag. Unfortunately, code blocks without a tag are not recognized by
this query, and I'm not sure that it's possible to remedy that (see the
[Untagged Code Blocks](#untagged-code-blocks) section for more).

# The Details

In my opinion, tree-sitter queries are not very well-documented; sure, it's
straightforward to capture a node and highlight it with a group (you can find
plenty of examples of that by reading the highlight queries that come with
Neovim), but complex queries like the one above are scarce in the Neovim
documentation.

I'll go through each part of my capture query, in three sections:

1. Node matching
2. Predicates
3. Directives

## Node Matching

The node matching part of the query is this:

```scheme
((line_comment (doc_comment) @_first) @injection.language
  .
  ((line_comment (doc_comment) @injection.content))+
  .
  (line_comment (doc_comment) @_last))
```

What this does is match code things of the form

```rust
/// First (@_first) (@injection.language)
/// Stuff in the middle (@injection.content)
/// More stuff in the middle (@injection.content)
/// Last (@_last)
```

The `.` "anchor" node specifies the fixed-ness of the position of the sibiling
nodes. The `@_first` capture will match the _text_ of the comment (i.e. " First"
in the example I gave), while `@injection.language` will capture the leading
`///` as well as the text. The `+` at the end of the middle node query allows
multiple nodes to be captured under the group `@injection.content`. Finally,
`@_last` will capture the text of the last comment in the doc comment group.

Right now, this query matches all doc comments. We need to make sure it only
matches ones with code blocks in them.

## Predicates

The predicate part of my main query is:

````scheme
(#lua-match? @_first "^%s*```[a-zA-Z_][a-zA-Z0-9_]*%s*$")$
(#lua-match? @_last "^%s*```%s*")
(#not-any-lua-match? @injection.content "^%s*```%s*")
````

These are straightforward as long as you're familiar with regex. Let's take the
first predicate:

````scheme
(#lua-match? @_first "^%s*```[a-zA-Z_][a-zA-Z0-9_]*%s*$")
````

If `@_first` doesn't match the regex, **the whole capture will fail**. This is
the behavior we want; all predicates have to be true in order for a query to be
valid. Here are the details of the regex:

````text
^   %s*         ```        [a-zA-Z_][a-zA-Z0-9_]*  %s*          $
    whitespace  backticks  language tag            whitespace
````

So this predicate matches the beginning of a code block. Remember: `@_first`
doesn't include the leading slashes of the doc comment.

`@_last` has a similar predicate to match the end of the code block (triple
backticks). The `#not-any-lua-match?` predicate is a bit more complicated,
though. Here's an example of something that happens without this predicate:

````rust
/// ```rust             -            -
/// println!("hello");  | capture 1  |
/// ```                 -            |
///                                  |
/// Stuff here                       | uh oh (capture 3)
///                                  |
/// ```rust             -            |
/// println!("hello");  | capture 2  |
/// ```                 -            -
````

Can you spot what's happening? The query captures the first line as `@_first`,
and the last line as `@_last`, and puts everything in between in
`@injection.content`. The `#not-any-lua-match?` makes sure none of the nodes in
`@injection.content` have backticks, preventing the nested scenario
above.[^not-any]

## Directives

Directives in tree-sitter queries alter capture metadata. They don't affect the
query itself. There is only one directive in my query:

````scheme
(#gsub! @injection.language "^.*```([a-zA-Z_][a-zA-Z0-9_]*)%s*$" "%1")
````

Without this directive, `@injection.language` would be set to

````rust
/// ```rust
````

The `gsub` filters the leading slashes and backticks.

# Limitations

This query can't match code blocks without explicit language tags. If I removed
this restriction, there would be no way to handle cases like this:

````rust
/// ```
/// println!("hello");
/// ```
/// Middle
/// ```
/// println!("hello");
/// ```
````

The "Middle" doc comment would be matched, since there's no syntactic indication
of start and end. This led me to wondering: how do the Markdown tree-sitter
queries handle this? The answer is that **the parser does**. The Markdown
tree-sitter parser treats code sections as a dedicated node in the tree;
however, the Rust parser does not, forcing us to make a somewhat hacky solution.

# Wrap Up

I hope this post was useful! If there's any suggestions, comments, or
corrections you have, feel free to
[submit an issue](https://github.com/dzfrias/website/issues/new) or
[send me an email](mailto:mail@dzfrias.dev). It would be nice if the Rust
tree-sitter parser recognized code blocks like the Markdown parser does. After
all, even the standard Rust parser does this in order to run doctests. Sounds
like a good future PR!

Finally, another extension to this that might be a little easier would be to
syntax highlight `#[doc]` attributes.

[^caveat]: There's only one caveat, which I will mention later in the post.

[^not-any]:
    All predicates can be prefixed with `not` or `any` in order to change their
    behavior. Pretty neat!
