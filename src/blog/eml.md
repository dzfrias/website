---
title: Issues with the EML Function
description:
  Apparent major correctness issues I have found with the much-hyped EML paper
  preprint.
date: 2026-06-02
---

I have recently been made aware of [a paper](https://arxiv.org/pdf/2603.21852v2)
that describes a single bivariate function that, when composed with itself, can
recreate all elementary functions.[^nand] It is described like this:

$$
\text{eml}(x, y) = \text{exp}(x) - \ln(y)
$$

Both inputs $x$ and $y$ are defined on $\mathbb{C}$ and the principle branch of
the logarithm is used.[^branch] Using this function, we can easily recover
exponentiation:

$$
e^x = \text{eml}(x, 1)
$$

and the logarithm on the principle branch:

$$
\ln(x) = \text{eml}(1, \text{eml}(\text{eml}(1, x), 1))
$$

The derivation of $+$, $/$, $\arcsin$, and the identity function all follow from
this process. The paper claims applications to scientific computing software
like Wolfram's Mathematica and to machine learning (which has led it to catching
the attention of many people in the ML world).

I'm not enough of an expert in the areas of the EML function's applications to
comment on the implications of it if it were fully sound. This post will go
through a major issue I found with the construction and I will explain it in a
way that is hopefully understandable to people without a knowledge of complex
analysis.

# Background

To understand why the EML function has problems, we first should talk about the
complex logarithm. If we think about the real-valued logarithm, there are many
properties that mathematicians like. Namely, we have

$$
\ln(e^x) = x
$$

where $x \in \mathbb{R}$. It is natural to want a function that can do this in
the complex plane, $\mathbb{C}$, i.e.

$$
\ln(e^z) = z
$$

where $z \in \mathbb{C}$. Unfortunately, such a function **does not exist** for
_all_ $z \in \mathbb{C}$. To see why, consider the complex number

$$
z = e^{i\theta}
$$

where $\theta \in \mathbb{R}$ is some angle. If you recall Euler's formula:

$$
e^{i\theta} = \cos(\theta) + i\sin(\theta)
$$

So $z$ represents a value on the unit circle rotated $\theta$ radians around the
origin. Now let $z' = e^{i(\theta + 2\pi)}$. We can see this from Euler's
formula:

$$
\begin{align}
z' &= \cos(\theta + 2\pi) + i\sin(\theta + 2\pi) \\
&= \cos(\theta) + i\sin(\theta) \\
&= z
\end{align}
$$

This is the core of why a "universal" complex logarithm does not exist.

$$
z' = z \implies \ln(e^{i(\theta + 2\pi)}) = \ln(e^{i\theta}) \implies i(\theta + 2\pi) = i\theta
$$

Which is clearly impossible.

## The Solution

In order to still have some sort of logarithm for complex numbers,
mathematicians instead construct "local" logarithms. Their construction is
somewhat complicated, but the core idea is that if we restrict the angle
$\theta$ in $z = e^{i\theta}$, we can achieve the behavior we
want.[^simplification]

For example, if we restrict $|\theta| < \pi$, we can no longer run into the
issue described before because our domain has been restricted. These "local"
logarithms are called **branches of the logarithm**.

The branch of the logarithm that restricts $|\theta| < \pi$ is called the
**principle branch**. In summary,

$$
\ln(e^{i\theta}) = i\theta \quad \text{provided} \,\, |\theta| < \pi
$$

and where $\ln$ denotes the principle branch of the logarithm. We can find other
branches of the logarithm that restrict $\theta$ to be between different values,
not just between $-\pi$ and $\pi$ (this range is called the **principle
range**).

# The Issue with EML

I mentioned earlier that EML is defined like this:

$$
\text{eml}(x, y) = \text{exp}(x) - \ln(y)
$$

and $\ln$ denotes the principle branch of the logarithm. With our new knowledge
of how the complex logarithm works, we know that $\ln$ is only a "proper"
logarithm if the input is in the principle range.

To illustrate that this is a problem for the $\text{eml}$ function, consider
this Python code:

```python
import cmath

def eml(x, y):
    return cmath.exp(x) - cmath.log(y)

print(eml(1, cmath.exp(complex(0, cmath.pi / 2))))
print(eml(1, cmath.exp(complex(0, (cmath.pi / 2) + 2 * cmath.pi))))
```

You should see roughly the same complex number printed. This is because
$\frac{\pi}{2} + 2\pi$ is wrapped to $\frac{\pi}{2}$ due to the domain
restriction [I mentioned before](#the-solution). This causes all sorts of
problems. Consider

```python
def ln(x):
    return eml(1, eml(eml(1, x), 1))

def e(x):
    return eml(x, 1)

def identity(x):
    return ln(e(x))
```

This _should_ be the identity function. But now try a non-trivial input:

```python
print(identity(complex(1, 4)))
```

This is _not_ the identity function! There are many other constructions in the
paper that fail because of this behavior.

# Wrap Up

I hope this post gave you a more informed understanding of $\text{eml}$, and
maybe even sparked your curiousity in complex analysis. This issue went
unadressed in the paper. If there's anything that could've been explained
better, feel free to reach out via
[GitHub issue](https://github.com/dzfrias/website/issues/new) or
[email](mailto:mail@dzfrias.dev).

## ¬NAND

I also have seen a lot of comparison between NAND and EML online. I don't think
this is totally accurate: EML as a construction already involves evaluating the
complex exponential and the complex logarithm. NAND can be expressed as a simple
truth table.

This opinion is more philosophical than mathematical, but I still don't think
the comparison is fair because evaluating $\text{eml}(x, y)$ is a lot more
computationally difficult than most of the functions that it creates.

[^nand]:
    Many have made the comparison between this function and the NAND logical
    gate. I don't think this comparision is very accurate, though. More on that
    [later](#¬nand).

[^branch]:
    Do not be worried if you don't understand what this means! This post is
    meant for people without knowledge of things like the complex logarithm.

[^simplification]:
    This is obviously a massive simplification of how "local" logarithms are
    defined. If you want a deeper mathematical explanation, I recommend Stein's
    Complex Analysis chapter 3.
