---
title: Build a Lexer with Automatic Semicolon Insertion in Rust
description:
  A walkthrough on how to build your own lexer with automatic semicolon
  insertion!
date: 2023-07-22
---

If you're looking to write a programming language, it's very likely that you'll
need a **lexer**. Lexers are immensely helpful in the parsing process, and can
even allow you to have (fancy) semicolon-less syntax. However, building a lexer
can be a bit confusing, especially one with automatic semicolon insertion. In
this post, you'll learn how to write your own lexer with the following features:

- Basic token handling
- [Go-style automatic semicolon insertion](https://go.dev/ref/spec#Semicolons)
- Insignificant whitespace

This post also assumes you have _some familiarity_ with Rust; you won't have to
have a deep knowledge or familiarity of the language, just your way around the
syntax.

# Getting Started

If you know nothing about lexers, they essentially take your program's raw
string input and turn it into a **stream of tokens**. A token represents a
single unit in your syntax. Lexers are helpful for writing parsers, as the
parsers don't have to work with strings anymore, instead receiving well-defined
pieces of your program.

Here are some examples of what lexers would do with your input:

```text
"i + x" becomes Token::Ident("i"), Token::Plus, Token::Ident("x")
"x = y" becomes Token::Ident("x"), Token::Assign, Token::Ident("y")
```

## Defining our Token Type

First, we should define what our possible tokens should be. In this post, we
will cover only a small subset of what is realistic in a general-purpose
programming language, but you'll hopefully have enough knowledge to extend the
lexer as you wish!

```rust
#[derive(Debug, PartialEq)]
pub enum Token {
    Illegal(char),
    // Denotes when our input ends
    EOF,

    // In programming languages, identifiers are usually used for variable names
    Ident(String),
    Assign,
    Plus,
    Minus,
    Bang,
    Asterisk,
    Slash,

    // <
    Langle,
    // >
    Rangle,
    Eq,
    NotEq,
    // >=
    Ge,
    // <=
    Le,

    // Semicolons ARE in the language, just not usually written by the programmer
    Semicolon,
    Comma,

    Lparen,
    Rparen,
    Lbrace,
    Rbrace,

    // The only keyword in our language. This can easily be extended!
    Return,
}
```

These are the tokens that make up the language's syntax!

## Defining our Lexer

I'll start by explaining what our lexer will actually do. Our lexer is basically
an iterator that yields `Token`s. It has a single public method, `next_token()`,
that advances the iterator and returns a single `Token`.

To accomplish this, our lexer essentially has a pointer to a place in our input.
When `next_token()` is called, the lexer returns what it pointed to and then
advances to the start of the next token.

```rust
// Asumming an input of "+ =="

// ===INITIAL STATE===

// input: + ==
// lexer: ^

assert_eq!(Token::Plus, lexer.next_token())

// ===NEW STATE===

// input: + ==
// lexer:   ^

assert_eq!(Token::Eq, lexer.next_token())

// ===NEW STATE===
//
// input: + ==
// lexer:     ^
```

We'll start by writing the basic layout of our Lexer struct.

```rust
#[derive(Debug)]
pub struct Lexer<'a> {
    input: Chars<'a>,
    current: char,
}
```

First off, our lexer is generic over the lifetime `'a`, as a result of `Chars`.
`Chars` is an iterator that yields `char`s, and is tied to our program's input
(`&'a str`). Much like how our lexer yields `Token`s, `Chars` yields `char`s.

We also have `current`, which is the current character that our lexer's pointer
points to.

With this foundation, hopefully you now know what our lexer does! We'll get
started with some of the fundamental methods we'll need to get it operational.

## Fundamental Methods

Let's first write a constructor for our lexer.

```rust
impl<'a> Lexer<'a> {
    pub fn new(input: &'a str) -> Self {
      let mut lexer = Self {
          input: input.chars(),
          current: '\\0',
      };
      lexer.read_char();
      lexer
    }
}
```

It takes an `&'a str`, for our program's input. We create our `Chars` based on
this input, and feed it to our lexer. We also give it a _placeholder_ `current`
(the null terminator). Then, we call `read_char` to replace the placeholder we
just initialized! Wait. We haven't even defined `read_char` yet...

`read_char` is the heart of our lexer; all it does is advance our pointer by one
character. That's it.

```rust
fn read_char(&mut self) {
    self.current = self.input.next().unwrap_or('\\0');
}
```

The conceptual "pointer" of our lexer is actually `Chars` (which is an
iterator)! You may also be wondering about the `unwrap_or` call!

`self.input.next()` only returns `None` when our input ends. In this case, we
replace it with our null terminator so we don't have to handle it in
`read_char`. Handling the end of our input is generally something our parser
does, so this will be bubbled up in the form of `Token::EOF` when `next_token`
is called.

# A Basic "Next Token" Method

Now we can define the only public method we'll need on our lexer! For a
refresher, `Lexer::next_token()` should advance our pointer until a valid token
is found, and then return it.

Let's get a basic definition out of the way. Nothing fancy, just the super
simple tokens!

```rust
pub fn next_token(&mut self) -> Token {
    let token = match self.current {
        '+' => Token::Plus,
        '-' => Token::Minus,
        '/' => Token::Slash,
        '*' => Token::Asterisk,
        '(' => Token::Lparen,
        '{' => Token::Lbrace,
        ',' => Token::Comma,
        ';' => Token::Semicolon,
        '\\0' => Token::EOF,

        c => Token::Illegal(c),
    };

    self.read_char();
    token
}
```

I'm going to hold off on the closing counterparts of `(` and `{`, as those will
be candidates for our semicolon insertion. Anyway, these tokens provide a simple
implementation of the behavior visualized when we
[defined the lexer](#defining-our-lexer). Lets write a test!

```rust
#[test]
fn lexes_basic_tokens() {
    let mut lexer = Lexer::new("(,{+-*/#");
    let expecteds = [
        Token::Lparen,
        Token::Comma,
        Token::Lbrace,
        Token::Plus,
        Token::Minus,
        Token::Asterisk,
        Token::Slash,
        Token::Illegal('#'),
        Token::EOF
    ];
    for t in expecteds {
        assert_eq!(t, lexer.next_token());
    }
}
```

# A Peek Buffer

Okay, now we need to handle more complicated stuff... Let's try tokenizing `!=`.
The problem with our current setup is that our lexer can't distinguish a
`Token::Bang` and a `Token::NotEq` in `next_token()`. We need some sort of
"peek". When our lexer encounters a `!`, it needs to peek at the next character
and see if it's an `=`. If it is, we consume the peeked character and return
`Token::NotEq`.

A possible to solution to this problem is a "peek buffer". When we call our
`peek()` method, the lexer should advance our pointer, and store its result in
the buffer. Then, the next time we call `read_char()`, it will try to first
consume a character from the peek buffer before advancing our `Chars` pointer
again.

Let's get into how we'd represent this with code.

```diff
#[derive(Debug)]
pub struct Lexer<'a> {
    input: Chars<'a>,
    current: char,
+    peek_buffer: VecDeque<char>,
}
```

We want our peek buffer to be a queue, as the behavior described above is a
first-in-first-out system. Let's add it to our constructor, too.

```diff
let mut lexer = Self {
    input: input.chars(),
    current: '\\0',
+    peek_buffer: VecDeque::new(),
};
```

Now, let's make our `peek` method! Here, we should advance `Chars` and push the
result to `peek_buffer`.

```rust
fn peek(&mut self) -> char {
    if let Some(c) = self.peek_buffer.front() {
        *c
    } else {
        let next = self.input.next().unwrap_or('\\0');
        self.peek_buffer.push_back(next);
        next
    }
}
```

If our peek buffer already has something in it, we should just return that
character, as we want to be able to call `peek()` an arbitrary number of times
and always get the same result back.

Now, we must make a small modification to `read_char()`. We need to consume our
peek buffer before we advance `Chars`!

```diff
+if let Some(ch) = self.peek_buffer.pop_front() {
+    self.current = ch;
+    return;
+}
self.current = self.input.next().unwrap_or('\\0');
```

At this point, we should have a working `peek()` method! Let's tokenize `!=`!
I'll write a method, `try_peek_eq`, that takes two `Token`s.

If the peeked character is an `=`, we return the first argument. If not, we
return the second one. `self.try_peek_eq(Token::NotEq, Token::Bang)` will return
`Token::Bang` if the peeked character is **not** `=`, and `NotEq` if it is.

```rust
fn try_peek_eq(&mut self, matched: Token, not_matched: Token) -> Token {
    if self.peek() == '=' {
        self.read_char();
        matched
    } else {
        not_matched
    }
}
```

Finally, we can put it all together into `next_token`!

```diff
    '\\0' => Token::EOF,

+   '!' => self.try_peek_eq(Token::NotEq, Token::Bang),
};
```

We'll also need this for `<=`, `>=`, and the like, so I'll add those in really
quick.

```diff
    '\\0' => Token::EOF,

    '!' => self.try_peek_eq(Token::NotEq, Token::Bang),
+    '=' => self.try_peek_eq(Token::Eq, Token::Assign),
+    '<' => self.try_peek_eq(Token::Le, Token::Langle),
+    '>' => self.try_peek_eq(Token::Ge, Token::Rangle),
};
```

Great! Let's write a test for those, too.

```rust
#[test]
fn lexes_complex_tokens() {
    let mut lexer = Lexer::new("!=<>=");
    let expecteds = [
        Token::NotEq,
        Token::Langle,
        Token::Ge,
        Token::EOF
    ];
    for t in expecteds {
        assert_eq!(t, lexer.next_token());
    }
}
```

Passed! With that, we can move on to another part of our lexer!

# Reading Identifiers

Our lexer also has to be able read identifiers. For example, when we input
`hello` to our lexer, it should give us `Token::Ident("hello")`.

Let's start by adding a case in the `next_token` method!

```diff
+ch if ch == '_' || ch.is_alphabetic() => {
+    let ident = self.read_ident();
+    return match ident.as_str() {
+        "return" => Token::Return,
+        _ => Token::Ident(ident),
+    };
+}
```

We know that whenever we encounter an alphabetic (or `_`) character, our lexer
has either reached an identifier or a keyword. In that case, we call the
`read_ident()` method. This method advances our lexer until the end of the
identifier is found, returning it in a `String`. Then, we do some simple
matching to produce the final token!

It is important to note the `return` here. Our `next_token()` method advances
our lexer by one right before returning (at the very bottom of the method). By
returning early from the `match` arm, we _circumvent_ this advancement. If we
didn't, we'd lose a character, because `read_ident()` already advances our lexer
to the next character after the identifier.

Speaking of `read_ident()`, we should probably define that!

```rust
fn read_ident(&mut self) -> String {
    let mut ident = String::new();
    while self.current.is_alphabetic() || self.current == '_' || self.current.is_ascii_digit() {
        ident.push(self.current);
        self.read_char();
    }
    ident
}
```

The implementation is nothing special, so I won't bore you the details. With
that out of the way, we can get to handling whitespace!

# Whitespace

For this post, we'll be ignoring whitespace completely for the sake of brevity.
In full lexers, it's usually good to not _completely_ ignore them, if only
because our tokens should usually have location spans attached to them.

Anyway, to achieve whitespace insignificance, we need a single method:

```rust
fn skip_whitespace(&mut self) {
    while self.current.is_ascii_whitespace() {
        self.read_char();
    }
}
```

Pretty simple! And we'll only need it in one place (for now)!

```diff
pub fn next_token(&mut self) -> Token {
+    self.skip_whitespace();

    let token = match self.current {
```

Now, whenever we call `next_token()` all whitespace is skipped!

And with that...... Congrats! You've built a basic lexer! At this point, I'd say
the lexer has enough to extend it with your own features and tokens! Let's write
some celebratory tests and move on to the next big challenge: automatic
semicolon insertion.

```rust
#[test]
fn lexer_skips_whitespace() {
    let mut lexer = Lexer::new(
        ",    ; ==
            !",
    );
    let expecteds = [
        Token::Comma,
        Token::Semicolon,
        Token::Eq,
        Token::Bang,
        Token::EOF
    ];
    for t in expecteds {
        assert_eq!(t, lexer.next_token());
    }
}
```

Passed!

# Automatic Semicolon Insertion

With our current lexer setup, adding automatic semicolon insertion should be
pretty simple! We'll be following in the footsteps of the
[Go language](https://go.dev) and their
[semicolon specification](https://go.dev/ref/spec#Semicolons). If you're not
familiar with it, Go has a very simple rule in their lexer:

A semicolon is inserted if the last token in a line is an:

1. Identifier
2. Literal
3. One of: `break`, `continue`, `fallthrough`, or `return`
4. One of the operators/punctuation: `++`, `--`, `)`, `]`, `}`

For our current token set, our lexer needs to insert a semicolon after it finds
an:

1. Identifier
2. `return`
3. `)` or `}`

First, let's define what we need to do in order to actually "insert" a
semicolon.

After reading one of the three things listed above, we'll see if our lexer's
current character is a newline. If so, we'll add a semicolon to the front of our
peek buffer. Since we'll have a semicolon at the front, our `read_char` will
consume that instead of more input! This isn't actually "inserting" anything,
more just queueing it into our token stream!

Let's define a method, `try_insert_semicolon()` that we can call whenever we
_might_ have a semicolon that needs to be inserted.

```rust
fn try_insert_semicolon(&mut self) {
    // Skip whitespace before possible semicolon
    while self.current.is_ascii_whitespace() && self.current != '\\n' {
        self.read_char();
    }
    // Also handle edge case of the null byte being last
    if matches!(self.current, '\\n' | '\\0') {
        self.peek_buffer.push_front(';');
    }
}
```

We first skip any whitespace that might precede our possible semicolon. We do
this to allow semicolons inserted in a line with trailing whitespace. The rest
is pretty simple!

With the `try_insert_semicolon()` method in place, we can call it where needed!
Let's start with identifiers.

```diff
ch if ch == '_' || ch.is_alphabetic() => {
    let ident = self.read_ident();
+    self.try_insert_semicolon();
    return match ident.as_str() {
```

Nice and simple! This handles both case one and two of our insertion rules. Now,
we can move on to `}` and `)`.

```diff
+')' => {
+    self.read_char();
+    self.try_insert_semicolon();
+    Token::Rparen
+}
+'}' => {
+    self.read_char();
+    self.try_insert_semicolon();
+    Token::Rbrace
+}

'!' => self.try_peek_eq(Token::NotEq, Token::Bang),
```

To get these to work, we need to advance our lexer by one (past the `)` or `}`),
which will set us up to use `try_insert_semicolon()`, a consequence of the way
we wrote the method.

As you might've expected by now, we're gonna write a test for this behavior!

```rust
#[test]
fn lexer_inserts_semicolons() {
    let mut lexer = Lexer::new(
        "ident
    return
    function()
    {-}",
    );
    let expecteds = [
        Token::Ident("ident".to_owned()),
        Token::Semicolon,
        Token::Return,
        Token::Semicolon,
        Token::Ident("function".to_owned()),
        Token::Lparen,
        Token::Rparen,
        Token::Semicolon,
        Token::Lbrace,
        Token::Minus,
        Token::Rbrace,
        Token::Semicolon,
        Token::EOF,
    ];
    for t in expecteds {
        assert_eq!(t, lexer.next_token());
    }
}
```

Great! Whew! We're done!

# Wrapping Up

If you've read this far, I hope you enjoyed and found use from this post.
Although the lexer defined in this tutorial is definitely _not_ complete, my
hope is that it's not too hard to extend it.

The roots of this post lie in Thorsten Ball's excellent book,
[Writing an Interpreter in Go](https://interpreterbook.com/). The design of the
lexer featured in this post is largely similar to that of the book's, with the
main addition being the semicolon insertion. I highly recommend the book for any
future programming language endeavors you might find yourself on; it's short,
easy to grasp, and leaves with you with just enough information for you to add
your own features!

As always, if there are any issues in the post, please don't hesitate to submit
an [issue on GitHub](https://github.com/dzfrias/blog/issues/new)!
