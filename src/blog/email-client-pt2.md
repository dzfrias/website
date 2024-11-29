---
title: "SMTP 101: Sending Emails"
description:
  An exploration of the SMTP email protocol, with examples featuring iCloud
  Mail.
date: 2024-11-29
---

In this post, we're going to dive into a simple question that contains _a lot_
of complexity: **how does my email client send emails**? In
[a previous post](https://dzfrias.dev/blog/email-client-pt1/), I explained how
emails are _retrieved_, featuring a protocol called IMAP. Today, we're exploring
something called **SMTP** (Simple Mail Transfer Protocol), which involves
_sending_ emails.

SMTP is one of the all-time classic Internet protocols, dating back to 1980.
Beyond just sending emails, SMTP can teach you a lot about the workings of the
Internet!

# Exploration

Our journey starts when you (`you@icloud.com`) are trying to send an email to
your friend, `friend@gmail.com`. It might seem like this is a decentralized
process: that is, you can directly send your email to their machine, somehow.
For better and for worse, that's no longer the way to do things.[^advantages]
Instead, you need to pass off your email to a centralized **email server**,
which will **relay** your message to `friend@gmail.com`.

The server will take care of sending it to your friend, for you! It's a lot like
a post office.

## Connecting

The next thing we need to figure out is the location of this helpful email
server, so we can connect to it and give it our email. The key is in our email
address: `@icloud.com`. This means that iCloud Mail manages the server, so we
need to give our email to an iCloud mail server in order for it to be sent to
our friend.

[Apple Support](https://support.apple.com/en-us/102525) tells us that the
[FQDN](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) and port of
the iCloud Mail email server is `smtp.mail.me.com:587`.[^change]

For this demo, I'll use the [OpenSSL](https://en.wikipedia.org/wiki/OpenSSL)
command-line tool to connect to the server:

```bash
$ openssl s_client -connect smtp.mail.me.com:587 -starttls smtp -quiet -crlf
# Output about the connection
```

There are some arguments here that you might be unfamiliar with. The most
significant one, though, is `-starttls smtp`.[^args] To understand this, we'll
need to dive into **implicit** vs. **opportunistic** TLS.

### TLS Stuff

There are two ways to obtain a TLS connection:

1. Opportunistically
2. Implicitly

A server that supports
[opportunistic TLS](https://en.wikipedia.org/wiki/Opportunistic_TLS) upholds
that the connection it starts with is **cleartext** (not secure), but _can_ be
upgraded to a TLS connection using a special command. This command varies
depending on the protocol.

> To upgrade an HTTP connection (to an HTTPS one), for example, you can send an
> [upgrade header](https://en.wikipedia.org/wiki/HTTP/1.1_Upgrade_header)
> telling the server that you wish to initiate a TLS handshake.

Some servers don't care at all about cleartext connections, though, so they use
**implicit TLS**. This means that the TLS handshake is attempted when the
connection begins (_not_ upon user request).[^handshake]

Getting back to the `-starttls smtp` argument, it tells `openssl` that we want
to write the `STARTTLS` SMTP command to the server, which is by request (it does
not happen implicitly). So the server located at `smtp.mail.me.com` accepts
**opportunistic** TLS.[^imap]

## SMTP

With all that out of the way, we can start talking about **SMTP**! SMTP is the
protocol used to communicate the information of your email (i.e. contents,
recipient, CC, BCC, etc.) to the server. We send **SMTP commands** that detail
this information.

Now that we're connected, the first thing we need to do is greet the server:

```text
C: EHLO dzfrias.local
250-PIPELINING
250-SIZE 28319744
250-ETRN
250-AUTH LOGIN PLAIN ATOKEN ATOKEN2 WSTOKEN WETOKEN XOAUTH2
250-ENHANCEDSTATUSCODES
250-8BITMIME
250-DSN
250-SMTPUTF8
```

Lines beginning with `C:` denote my input, and lines without `C:` are server
output. `EHLO` is the greeting command, and you also pass the **name of the
computer** you're connecting from along with it (`dzfrias.local` for me).[^ehlo]

> If you want to find the name of _your_ computer, use the `hostname` command on
> the command line!

### Authorization

Now, we want to identify ourselves as `you@icloud.com`, or else the server won't
let us send any emails. The `250-AUTH` line of the greeting response tells us
what authentication methods we can use to log in. The one that we'll be using
for this demo is `PLAIN`, which is the simplest, and only involves sending our
username and password:[^auth]

```text
C: AUTH PLAIN
334
C: AHlvdUBpY2xvdWQuY29tAGVtYWlsLW1lLXlvdXItZmF2b3JpdGUtY29sb3I=
235 2.7.0 Authentication successful
```

That seemginly random string of characters is actually super important! I'll go
through what happened line by line:

1. I told the server I wanted to authenticate using the `PLAIN` method
2. The server said: “okay!”
3. I gave it the base64 encoding of my username and password
4. The server said: “looks good!”

> If you're trying this at home (and using iCloud Mail), you can get the base64
> encoding using the command line: `echo -n '\00username\00password' | base64`.
> The username is your email address, and the password is an
> [app-specific password](https://support.apple.com/en-us/102654).
>
> Different email servers authenticate differently!

That's enough to get us authenticated, so let's get to sending the email.

### Sending Our Email

We can use different SMTP commands to tell the server about the email we want to
send. For example:

```plain
C: MAIL FROM:<you@icloud.com>
250 2.1.0 0k
```

This tells the server that we're sending from `you@icloud.com`.[^spoofing] We
can also tell the server who the email is to and what it contains, using
`RCPT TO` and `DATA`, respectively:

```plain
C: RCPT TO:<friend@gmail.com>
250 2.1.5 0k
C: DATA
C: From: "You" <you@icloud.com>
C: To: "Friend" <friend@gmail.com>
C:
C: This is an extremely important message.
C: .
250 2.0.0 0k: queued as 343FD5003CE
```

Email sent! Note the two [MIME](https://en.wikipedia.org/wiki/MIME) headers we
included in the content of the email. These contain **crucial metadata** that'll
be packaged with our message.

You might be wondering what the `.` is at the end. After we send the `DATA`
command, the server gives us the ability to write as many lines as we want,
which is necessary to input a multi-line email. Since line breaks _usually_
denote the end of an input, the server needs some _other_ indicator for when our
input has ended. So instead, the server looks for a single dot on an empty line
to terminate our input. This technique is called **dot-stuffing**.

# Summary

Here's a quick, high-level summary of this demo:

- Sending emails involves passing off your message to an email server to be
  relayed
- The email server corresponds to your email provider
- The SMTP protocol is used to communicate with the server

I'll continue my email-client series in future posts, but I'll mostly focus on
the **implementation-side** of things for a client. For now, I hope you enjoyed
this post. If you have a problems or suggestions, feel free to
[send me an email](mailto:styx5242@gmail.com) or
[open an issue](https://github.com/dzfrias/website/issues/new) on this website's
[GitHub repository](https://github.com/dzfrias/website).

## References

1. [SMTP Specification](https://www.rfc-editor.org/rfc/rfc5321.html)
2. [TLS Recommendations](https://datatracker.ietf.org/doc/html/rfc8314#section-3)
3. [PLAIN Authentication](https://www.rfc-editor.org/rfc/rfc4616)
4. [Wikipedia](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol)
5. [Apple Support](https://support.apple.com/en-us/102525)

These sources were super helpful for understanding these concepts, so I
recommend reading them to deepen your understanding of the things I touched on
in this post.

[^advantages]:
    There are some **advantages** to this: in order to send emails directly, the
    receiver's machine would have to be listening for connections 24/7. It'd
    also be much harder to access emails from two different computers, since
    directly sending would imply that the emails are stored locally.

[^change]:
    Note that this will change depending on the email provider. Gmail, for
    example, uses `smtp.gmail.com:587`.

[^args]:
    All arguments are crucial, though! `-crlf` will make sure that any newlines
    we send are turned into CRLF characters. `-quiet` not only makes the output
    less verbose, but it also disables the interactive interpretation of the R
    and Q characters when typing into `openssl`. I don't fully understand what
    that means, but
    [this StackOverflow post](https://stackoverflow.com/a/77250517) explains it.
    Not passing it in will cause problems later.

[^handshake]:
    The nuances of TLS handshakes is beyond the scope of this post. Definitely
    future-post material. For now, just know that a TLS handshake is essential
    for upgrading a cleartext connection to a TLS connection.

[^imap]:
    If you read my IMAP post and are wondering why we didn't pass
    `-starttls smtp` to the IMAP server, it's because `imap.mail.me.com:993`
    supports implicit TLS connection. In general, the adoption of implicit TLS
    SMTP servers has been slow.

[^ehlo]:
    The greeting command _used_ to be `HELO`, but it's since been deprecated in
    favor of `EHLO` (short for extended-hello).

[^auth]:
    I encourage you to research the other authentication methods! `LOGIN`, for
    example, is very similar to `PLAIN`, but it's no longer recommended.

[^spoofing]:
    If you try using an email address other than the one you authenticated in
    with, you'll get an error. No email spoofing allowed!
