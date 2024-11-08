---
title: So how does email actually work?
description:
  A mini dive into the workings of the IMAP email protocol and the procedures of
  an email client.
date: 2024-11-04
---

In this post, I'm going to explore one of the fundamental technologies of the
Internet: **email**. Personally, I've always wondered how email clients work,
but I never knew where to start.

There's a lot to unpack:

- How do you manage multiple email accounts?
- _What_ is actually receiving the mail?
- How do all email clients receive the same information?
- How does sending mail work?

In this post, I'll be answering some of those questions. No experience with
network programming or anything related is required!

# The Basics

I'm going to start from the beginning: you receive an email.[^what] The first
thing to find out is _what_ received it, and where.

Let's say your email address is `hello@icloud.com`. The `@icloud.com` means it's
managed by iCloud Mail. iCloud Mail is what's called an **email server**. It
holds all the emails of **all** `@icloud.com` email addresses. It's this server
that contains the email that was sent to `hello@icloud.com` (and literally
everyone else's)![^single]

## Connecting

So now we know that our email is stored on a remote server that iCloud Mail sets
up. Like pretty much everything else, this server conforms to the
[TCP protocol](https://en.wikipedia.org/wiki/Transmission_Control_Protocol), so
we should be able to connect to it remotely. I'll show how to do so using
[OpenSSL](https://en.wikipedia.org/wiki/OpenSSL) and the command line.[^others]

```bash
$ openssl s_client -connect imap.mail.me.com:993
# A bunch of output telling us that the connection was successful (hopefully)
```

We're telling OpenSSL that we want to connect to the TCP server located at
`imap.mail.me.com:993`. This is the standard TCP/IP address that iCloud Mail
uses (it is not specific to me, in some way). That is, every **email client**
that wants to get email data from an iCloud account uses this TCP/IP address.

> Different email servers, like Gmail, have different TCP/IP addresses to
> connect to. For example, Gmail uses `imap.gmail.com:993`.

## Getting Information

Ok, so now we're connected to the email server. We need to send it messages to
request information about our emails. The question becomes: how? They key lies
in the TCP/IP address: `imap.mail.me.com:993`. The magic word is **IMAP**!

IMAP is a **protocol** that tells us two things:[^pop]

1. How to structure the messages to get the information we want
2. What the response will look like

Using our OpenSSL client, we can compose messages by typing in some stuff, and
we can press enter to send it.[^langs] But you'll likely get a response back
telling you that the message you sent was malformed in some way. That's because
it didn't conform to the IMAP protocol! Let's look at some messages that _do_
conform to the protocol.

### Logging In

In order to access any data, we need to log in to our email account to make sure
the email server knows who we are. The IMAP protocol tells us how to compose a
message so that the server knows that we want to log in:

```text
C: a1 LOGIN {email} {password}
a1 OK user {email} logged in
```

Here I'm using `C` to denote the client message (so if you're trying this at
home, omit the `C:`), and lines without `C` to denote server output.

If we send **that** message (substituting in our actual email and password),
we'll be logged in and should be able to access our emails by sending more
IMAP-compliant messages.

> If you want to try this at home using your own iCloud email account, your
> password _will not_ be your iCloud account password. You'll need to create an
> [app-specific password](https://support.apple.com/en-us/102654) and enter that
> in the message.
>
> Every email server has their own way to do passwords/authentication (I'm not
> using Gmail for this example because Google's authentication is enormously
> complicated for a blog post).

### Retrieving Emails

Now we're ready to look at some messages. The first thing we need to do is
select a **folder**. An IMAP folder contains emails. Examples of common folders
are:

- INBOX
- Trash
- Spam
- Drafts

This is how you select a folder:

```text
C: g21 SELECT INBOX
* 1 EXISTS
* 0 RECENT
* OK [UNSEEN 1]
* OK [UIDVALIDITY 1451405933]
* OK [UIDNEXT 2272]
* FLAGS (\Answered \Flagged \Draft \Deleted \Seen \Recent $MailFlagBit0 $MailFlagBit1 $MailFlagBit2 $Forwarded Redirected $NotJunk NotJunk)
* OK [PERMANENTFLAGS (\Answered \Flagged \Draft \Deleted \Seen \Recent $MailFlagBit0 $MailFlagBit1 $MailFlagBit2 $Forwarded Redirected $NotJunk NotJunk \*)]
g21 OK [READ-WRITE] SELECT completed (took 2 ms)
```

The main output we're looking for is the first line. It tells us that there's
one email in our INBOX folder. Let's take a look at this email:

```plain
C: f1 FETCH 1 RFC822.TEXT
* 1 FETCH (RFC822.TEXT {242}
--00000000000055129906262bbfde
Content-Type: text/plain; charset="UTF-8"

Hello, world!

--00000000000055129906262bbfde
Content-Type: text/html; charset="UTF-8"

<div dir="ltr">Hello, world!</div>

--00000000000055129906262bbfde--
)
f1 OK FETCH completed (took 153 ms)
```

Note that the output comes in two different forms: HTML and plain text.

The `FETCH` command is very versatile; it's the primary tool email clients use
to retrieve the contents of your emails.

# Summary

Here are they key takeaways from our exploration of email:

- The **domain** part of an email designates a remote server to manage that
  account
- An email client connects to email servers to retrieve information using a
  protocol
- The most widely used protocol for email servers is IMAP

In future posts, I'll take a dive into _sending_ emails using the
[SMTP protocol](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol). I
hope you enjoyed this post! If you found any problems or have any suggestions,
make sure to open an issue on this
[website's GitHub repository](https://github.com/dzfrias/website/issues/new).

## References

1. [IMAP Specification](https://www.ietf.org/rfc/rfc9051.html)
2. [Wikipedia](https://en.wikipedia.org/wiki/Email_client)
3. [Apple Support](https://support.apple.com/en-us/102525)
4. [atmail](https://www.atmail.com/blog/advanced-imap/)

I recommend reading through some of these sources to get a more thorough
understanding of the concepts in this blog post.

[^what]:
    You might be thinking: “what? That's not the beginning! What about the
    person who _sent_ the email?” Yes, you're right. But I'm just going to
    accept that the magical Internet wire electricity stuff happens, and the
    email is successfully sent _somewhere_. For now. An explanation of sending
    an email might come in a future post.

[^single]:
    This is a bit of an oversimplification, since iCloud Mail definitely isn't
    just _one single_ computer that has all the `@icloud.com` emails in the
    world. But we can conceptually and practically treat it like this is the
    case, because the implementation of the server is abstracted from us.

[^others]:
    `nc` (or [netcat](https://en.wikipedia.org/wiki/Netcat)) is another command
    line tool you may have heard of for connecting to remote TCP servers. iCloud
    Mail uses [TLS/SSL](https://en.wikipedia.org/wiki/Transport_Layer_Security)
    encryption on top of TCP, though, so it's easiest to use `openssl` to
    connect.

[^langs]:
    Remember: the OpenSSL command line tool isn't the _only_ way to communicate
    with the server. Your favorite programming language likely has a way to do
    it, too.

[^pop]:
    There are other protocols email servers use.
    [POP](https://en.wikipedia.org/wiki/Post_Office_Protocol) is another common
    one, albeit less present today. Most email servers communicate using IMAP.
