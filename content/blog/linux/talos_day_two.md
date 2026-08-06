+++
title = "Talos Linux Status Report: Day 2"
description = "Pain but learning"
date = 2026-08-06
updated = 2026-08-06
transparent = true
[taxonomies]
categories = ["linux"]
tags = ["kubernetes", "containers", "linux", "sysadmin"]
+++

If you'd like to read day 1, it is [here](../talos-first-timer).
Astute readers will realize that day 1 and day 2 were multiple days apart.
Funny how that works for personal projects.

# Day 2

## Installing the tailscale operator.

Reading the previous post, one might have come to the conclusion that I figured out the best way to bake tailscale into the base image of this talos cluster.
I didn't, really.

Since I found the Tailscale YouTube channel's [video about the operator](https://youtu.be/3VpOYn_GfAY?si=ADtRRfitk7lrTk_c), the path of least resistance and actually progress became to do what Alex did.
To be as clear as an alpine lake, I thought it was too much of a bother to bake anything into the installation image.
So, I happily followed along and installed the Tailscale operator and it worked painlessly.

I don't have anything else to say about that experience.
It was really simple.

## Upgrading talos

Again to be lake clear to you, dear reader, I actually hadn't put any work into testing out this Talos cluster on my hardware up until I spent my day patching some Linux kernel vulnerabilities at my day job and thought "well, I should do that at home too".

Let me yap a bit, please.
I'll try to make it worth it.

Keeping your systems secure can be quite a demanding task.
This is true for any system with any amount of software.
For one, you have to remain informed of recent vulnarabilities.
Just as well, you normally need to schedule patch rollouts - and if it is really bad, schedule downtime.

The traditional model for working with operating systems is that the vendor (Microsoft, Apple, Redhat, Oracle, or the open-source community) is in charge of bundling all of the patches together and usually releases sets of patches based on their severity.
Lower severity bugs are usually shipped at regular scheduled, where high impact bugs (often those that are Least Privilege Escalation to the highest authority on the system) are pushed out ASAP.

I went from Talos v1.13.7 -> v1.13.8 and on the github releases I can find what version the Linux kernel was upgraded to and can probably thus figure out what CVEs have been mitigated or fully patched.
On the github releases page, I can see that the Linux kernel was upgraded from 6.18.39 -> 6.18.42.
The release of v1.13.7 -> v1.13.8 was a two week release.

I've got some thoughts.

## 1. I didn't know where the changes were coming from.

Listed in the changelog is a set of commits as well as the component upgrades.
The Linux kernel is one such component that is listed in the release notes.
Yet, I don't see which commit made a change to that component in the release notes.

The talos config is agreeing with the release and I'm starting to realize that I should have some sort of "query all" wrapper to query all the nodes in the cluster:
```bash
$ for node in 172.20.10.1 172.20.10.2 172.20.10.3 172.20.10.4; do talosctl -e bulbasaur -n $node read /proc/version; done
Linux version 6.18.42-talos (root@buildkitsandbox) (clang version 22.1.2, LLD 22.1.2) #1 SMP PREEMPT_DYNAMIC Mon Aug  3 19:21:11 UTC 2026
Linux version 6.18.42-talos (root@buildkitsandbox) (clang version 22.1.2, LLD 22.1.2) #1 SMP PREEMPT_DYNAMIC Mon Aug  3 19:21:11 UTC 2026
Linux version 6.18.42-talos (root@buildkitsandbox) (clang version 22.1.2, LLD 22.1.2) #1 SMP PREEMPT_DYNAMIC Mon Aug  3 19:21:11 UTC 2026
Linux version 6.18.42-talos (root@buildkitsandbox) (clang version 22.1.2, LLD 22.1.2) #1 SMP PREEMPT_DYNAMIC Mon Aug  3 19:21:11 UTC 2026
```

So, spelunking into the history I saw these:
```bash
$ cd (mktemp -d) && git clone https://www.github.com/siderolabs/talos && cd talos
$ $ git log --pretty=oneline --since "2026-07-23" --until "2026-08-06" --grep "bump kernel"
945d1cdab48b6386defff30ab142725da82c3565 feat: bump kernel to 6.18.41
2c657c2243706462d54731624547bc77ba184b35 feat: bump kernel to 6.18.40
```

And inspecting showed some Go stuff I'm not familiar with where you specify the build with a Makefile...
```bash
PKGS_PREFIX ?= ghcr.io/siderolabs
PKGS ?= v1.14.0-alpha.0-121-g4c14c73
```

Which lead me to discover that they package up all sorts of images on the GitHub Container Registry (ghcr.io).

## 2. Container auditing is so weird!

It looks to me that the Talos developers start from a scratch image and build up layers based on the core system utilities on [this repo](https://github.com/siderolabs/pkgs) (which is amazing).

That repo lists 89 artifacts that were published to their ghcr, which is certainly not something I'm used to seeing outside of the Chainguard, Fedora Atomic, and Alpine projects do.
I think its really super cool.

However... I don't know how to generate an SBOM or validate what CVEs I'm patched against in this paradigm.
I'm particularly used to checking against the distribution's package manager against a CVE ID (e.g. `dnf check-update --cve CVE-20XX-12345`).
I am fond of such method because I know, for a darn fact, that there's significant resources behind the packaging, shipping, and maintenance of the metadata for the package managers as well as backported patches themselves.
I trust it so much, that I prefer `dnf-automatic` to install `--security` tagged packages on a regular timer and to just send me an e-mail of when it did so I can plan a reboot (for kernel updates).

*Side note, it really grinds my gears when I see systems administrators brag about 3 digits of uptime on their system clocks.*

I don't particularly like using LLMs, but for this particular question I am so out of my depth that I asked [the population within it](https://www.youtube.com/watch?v=_lkRRoJgDXM): "How do I generate an SBOM and verify which CVEs are patched for the recent image build of Talos Linux" and it outputted:

> To inspect the exact software inventory and patched CVEs for a Talos Linux release, you can extract the published SBOM attached to the container images or generate one directly using tools like Syft, then scan it with Grype or Trivy.

## 3. So I got some homework to do

I'm out of my depth here and have no experience with these tools (and certainly don't have them installed), so I'll have to read up on what the [OpenSSF recommends](https://openssf.org/blog/2025/06/05/choosing-an-sbom-generation-tool/) as homework from today's work.

This kind of homework is fine, but woah nelly is this so different from what I'm used to.
So, to bridge the gap *right now* I'm going to switch from running commands like

```bash
$ lsmod
$ modinfo <module>
$
```

Into doing:

```bash
$ talosctl read /proc/modules > modules.res
$ talosctl read /proc/cmdline
$ talosctl read /proc/config.gz | zcat > config.res
```

At least, for the time being that is.
Because, hey.
I'm not yet out of the mindset of running commands a system.
