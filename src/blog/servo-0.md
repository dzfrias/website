---
title: "Forays into Servo #0"
description: My first report on my work on the Servo project!
date: 2026-10-09
---

My first experience with browser engines was [Ladybird](https://ladybird.org),
which I contributed quite a few PRs (around 80) to in the summer of 2024. Coming
around to fall of this year, I felt the drive to get back into web browser
hacking. The only issue was that Ladybird is
[no longer accepting non-team contributions](https://ladybird.org/posts/changing-how-we-develop-ladybird/).[^announcement]

Although I was disappointed at the news, in retrospect, I'm happy that I looked
for other projects to work on. Namely, [Servo](https://servo.org)! As a bonus,
Servo has an amazing open source community that I will talk about throughout the
post.

This post serves as my first progress report on my work, keeping the spirit of
my [original Ladybird posts](/blog/ladybird-wasm-0)!

# First Issue

Unlike with how my work in Ladybird started, I **did not** begin work on Servo
with a clear goal in mind. Fortunately, the Servo maintainers frequently update
a list of
[good first issues](https://github.com/servo/servo/issues?q=is%3Aissue+state%3Aopen+label%3AE-candidate-for-mentoring)
and triage pretty much every issue that is opened.[^oss]

I ended up finding something that I thought would be relatively easy to tackle:
giving focus to text control elements when the `.select()` method is called
([#47753](https://github.com/servo/servo/issues/47753)). For example:

```html
<!doctype html>
<textarea id="Z">Testing</textarea>
<button id="Y">Click here</button>
<script>
  Y.onclick = () => Z.select();
</script>
```

Clicking the button _should_ select all text in the `<textarea>`, along with
giving it focus. The [PR](https://github.com/servo/servo/pull/48475) I wrote to
implement this behavior was pretty simple.

However, I ran into failing tests as soon as submitted my PR. Like many
browsers, Servo uses the
[WPT test suite](https://github.com/web-platform-tests/wpt) to test compliance
with Web standards. The failing WPT test looked something like this:

```html
<!doctype html>
<textarea id="Z">Testing</textarea>
<script>
  Z.addEventListener("keydown", () => {
    Z.style.display = "none";
  });
  Z.select();
  sendKey("a");
  assert(Z.value == "Testing");
</script>
```

Essentially, this test tries to ensure that setting a `<textarea>` display to
`none` makes it unwritable, even when it is hidden during a `keydown` event
listener.

This test was passing before, so why is it failing with my change? The problem
is that `Z.select()` is now focusing the element, whereas before it wasn't. So
before, `sendKey("a")` wasn't actually sending anything to the `<textarea>`,
which means that the test wasn't actually testing anything.

So my first PR to Servo uncovered a different issue, one that turned out to be
slightly more complicated.

# Text Editing

This new discovery led me to start exploring how text controls work in Servo. I
eventually opened another PR to fix the bug I had found:
[#48165](https://github.com/servo/servo/pull/48165).

Getting both my original and induced PR was a bit of an arduous process, as I
had to rebase my changes onto a large-ish refactor for text controls. But the
benefit was that I got a solid understanding of how text editing in Servo
works![^text]

This led me to a number of text-related contributions:

1. No longer allowing copy/cut in `<input type="password">`
   ([#48404](https://github.com/servo/servo/pull/48404))
2. Implementing the `beforeinput` event
   ([#48519](https://github.com/servo/servo/pull/48519))
3. Move handling composition ([IME](https://en.wikipedia.org/wiki/Input_method)
   events) into `EditingAction`
   ([#48690](https://github.com/servo/servo/pull/48690))
4. Implementing CMD-delete for macOS
   ([#48781](https://github.com/servo/servo/pull/48781))
5. Writing tools to unit test composition events
   ([#48825](https://github.com/servo/servo/pull/48825))

These PRs were a lot of fun to write. Particular highlights for me were PRs
numbered 3 and 5. Composition events and IME handling in general in Servo is far
from complete. There are all sorts of fun problems to solve here. For example:
Servo is designed to be
[emebeddable](https://book.servo.org/embedding/overview.html). What is an
appropriate interface so that an embedder of Servo can communicate that IME
events are happening? IMEs are inherently very platform-specific, so this is a
difficult abstraction to make in practice.

My focus now, for the time being, will be to **improve Servo's IME handling**.
Although it's difficult for me to test alone, since IME behavior varies wildly
from OS to OS, there are certainly many improvements that I can make. My next
post in this series will likely be on these improvements.

# Servo's Community

Servo has one of the most approachable open source communities that I've worked
in. There are immediately obvious things, such as the issue triaging that I
mentioned earlier. But beyond the surface, Servo's maintainers have more robust
ways for new contributors to get comfortable with the codebase, owing to
[the Zulip](https://servo.zulipchat.com).

Servo's Zulip is very active and I found it to be a goldmine for understanding
Servo. Even in conversations that I didn't contribute to (which is most), just
reading various people's projects and issues was immensely helpful.

In addition, maintainer [Martin Robinson](https://github.com/mrobinson) holds
weekly office hours! I've attended one office hours session so far, and got to
ask some valuable questions.

I can't stress enough how smooth it felt to go from small bug fixes to larger,
slightly more consequential PRs. For this reason, I believe that Servo is a
great example of how productive and inclusive open source can be.

# Conclusion

Working on Servo has been a joy so far. I hope to continue with these updates as
I work on the codebase! In particular, I am working on designing an appropriate
abstraction for embedder to `WebView` communication about IME events.

If you enjoyed this post, or have any feedback, please send me an email at
[mail@dzfrias.dev](mailto:mail@dzfrias.dev).

[^announcement]:
    This announcement actually disappointed me quite a bit. I will probably
    write a post in the near future about it.

[^oss]:
    I have personally never worked on a project where every issue is triaged!
    Although it clearly takes a lot of effort (in particular, I've noticed that
    the maintainer [jdm](https://github.com/jdm) spends a lot of time doing
    this), the payoff is that it is actually _very_ accessible to get started on
    writing code for Servo!

[^text]:
    It's a bit ironic that, unintentionally, I've landed back into a set of
    problems related to text... although in a new context
    [than before](/blog/xxutf).
