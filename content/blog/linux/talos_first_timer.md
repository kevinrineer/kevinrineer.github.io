+++
title = "Talos Linux Status Report: Day 1"
date = 2026-07-25
updated = 2026-08-06
transparent = true
[taxonomies]
categories = ["linux"]
tags = ["kubernetes", "containers", "linux", "sysadmin"]
+++

I’m standing up my home computing infrastructure setup across a couple different paradigms-NixOS, an immutable Fedora Cosmic-Atomic desktop via `bootc`, and an immutable, bare-metal Talos Linux Kubernetes cluster.
Of these, I think Talos is the most interesting to write about, because it resembles quite the culmination of devops.

Talos is sold as the tool that "makes Kubernetes easy." On paper, an immutable, API-driven, minimal OS with no SSH or shell sounds like a declarative dream. In practice on Day 1? I’m finding out that getting a cluster to your desired state feels like a constant game of applying imperative state sequentially using `*.patch.yaml` files.
Sidero Labs has a [Talos for Linux Admins](https://docs.siderolabs.com/talos/v1.13/learn-more/talos-for-linux-admins) guide meant to ease the transition, but in my experience it just adds friction I didn't have.

I'm not giving up on it yet, but here are my Day 1 observations, noting some quirks, papercuts, and struggles along the way.

## 0. Before we start

### My background
- I have been doing Linux systems administration for a somewhat short while compared to what some might expect (3 years of on-the-job experience and a decent amount of experience outside traditional employment)
- I'm pretty confident that I understand single-node systems well and the core tenants of what containers are.
- I primarily configure machines with Ansible during employed hours, so I have already built a strong bias against Ansible.
- I have been experimenting with OCI based distributions and NixOS.

### My stuff

Just to make it a bit more clear, I have 4 mini-PCs where the hostnames for them are related to the IP allocation for them provided by my openWRT router.
The theme is Pokemon:

- `bulbasaur` (#001) → `172.20.10.1/24`
- `ivysaur` (#002) → `172.20.10.2/24`
- `venusaur` (#003) → `172.20.10.3/24`

This Class B subnet (`172.20.10.0/24`) gives plenty of headroom and I really don't think this range should collide with any subnets created by virtual network interfaces. Currently, static leases are reserved at the OpenWrt router level.
I don't have enough devices for VLANs to make sense (openWRT is a client of the ISP router).

### Talos initial observations

Taking inspiration from [Ally Piechowski's blog](https://piechowski.io/post/git-commands-before-reading-code/) I thought to do some looking at the repo state:

```bash
$ git busfactor | head -n 10
   276  Andrey Smirnov
   114  Noel Georgi
    70  Mateusz Urbanek
    30  Maja Bojarska
    16  Mickaël Canévet
    10  Orzelius
     5  Dmitrii Sharshakov
     5  Erwan Leboucher
     5  Utku Ozdemir
     3  Edward Sammut Alessi
$ git lifetime-busfactor | head -n 10
  2849  Andrey Smirnov
  1105  Andrew Rynhard
   587  Noel Georgi
   243  Spencer Smith
   176  Artem Chernyshev
   172  Dmitriy Matrenichev
   159  Brad Beam
   129  Mateusz Urbanek
   113  Alexey Palazhchenko
    92  Utku Ozdemir
$ git hotspots | head -n 10
    233 hack/release.toml
    180 Makefile
    169 pkg/machinery/constants/constants.go
    148 go.mod
    132 go.sum
    113 pkg/machinery/gendata/data/pkgs
     93 pkg/machinery/config/schemas/config.schema.json
     75 .github/workflows/ci.yaml
     73 .kres.yaml
     56 website/content/v1.14/schemas/config.schema.json
$ git firefight
bd2d6242a fix: revert coredns to 1.14.2
dee139aef feat: revert update CoreDNS to 1.14.3
f19eef78b fix: revert add extraArgs from service-account-issuer
6821225b6 fix: revert use append instead of prepend in service-account-issuer
e9a30bf9a test: revert add direct connectivity CA rotation test
34e107e1b docs: fix broken link
3472d6e79 fix: revert "chore: use new mount/v3 package in efivarfs"
e8f1ec1c5 docs: fix broken create qemu command v1.11 docs
$
```

Seems like an active, mature project that currently isn't going through a feature explosion, which is nice to see.
Sidenote, I do wish there was a shirt that said "you can never run from DNS".

## 1. Getting Started
Talos has a [Kickstart Guide](https://docs.siderolabs.com/talos/v1.13/getting-started/getting-started) with a Youtube video thumbnail that has the text "15 minutes". Hoo boy, do I wish it were that simple and quick.

The docs assume a decent level of familiarity with Homebrew (at least `linuxbrew` if you're running Linux).
Fortunately as of writing, there are two listed maintainers for `talosctl` using Nix, so that wasn't an issue for me, because I really don't want to track the versioning of this static binary myself.
I started this journey on Windows and was also pleasantly surprised to see that `talosctl` was available via `winget`.
The binaries seem to be built and deployed in CI as part of what seems to be a [Go monorepo](https://github.com/siderolabs/talos) maintained by Siderolabs.

### Can't just get started: Managing Secrets with SOPS and SSH-to-Age

By default, generated Talos configurations (`controlplane.yaml`, `worker.yaml`, `talosconfig`) contain unencrypted cryptographic keys and cluster secrets.
I prefer to do most things that are primarily text driven, even in the "Getting Started" phase, under version control, especially for ease of reverting back to known good states.

Instead of keeping plain secrets out of version control entirely or trying to figure out how difficult it would be to inject environment managed secrets into the various yaml files, I opted to encrypt the configs in-place using **SOPS** paired with `age` keys derived directly from my local SSH key.
For those who haven't used [SOPS](https://github.com/getsops/sops) before, it effectively parses `yaml`,`json`,`ini` (and maybe more) files and encrypts the values for the atching keys using a decent suite of encryption primatives.

I won't teach you how to use sops here [Michael Stapelberg has you covered though](https://michael.stapelberg.ch/posts/2025-08-24-secret-management-with-sops-nix/).
I will show how I'm managing my configurations for clarity:

My infra repo loosely looks like the following:  

```bash
$ tree -L 1
.
├── nixos
├── README.org
└── talos

3 directories, 1 file
$ tree -L 1 talos/
talos/
├── controlplane.yaml
├── multi-home-controlplane.patch.yaml
├── multi-home-worker.patch.yaml
├── tailscale.patch.yaml
├── talosconfig.yaml
└── worker.yaml

1 directory, 6 files
$
```

And I encrypt/decrypt the files whenever I want to make and save changes.
```bash
# Encrypt all cluster configs before committing
for file in talos/*.yaml; do sops encrypt --in-place $file; done

# Decrypting for local maintenance
for file in talos/*.yaml; do sops decrypt --ignore-mac --in-place $file; done
```

As of writing, I don't know why `sops v3.13.2` complains about the file's MAC signature.
I double checked my environment variables, and it should be using the age key so I don't know 🤷.
Anyway that's a distraction.
Let's get back to Talos.
```bash
$ sops encrypt --in-place worker-example.yaml && sops decrypt worker-example.yaml
MAC mismatch. File has BCE88C8638548B531C7FE1AB8BFA48554B32D2BE421C332B583193874ECA8160C0D67CCEEC03CDC3BDFBDC4F64DF329E1EAF5C43854E6B048733A4EC809C335A, computed FA41E2AF6DB75E4AC0CB1D4BA02DC8C3A7686868336F79A9C5BAD7628E42D2BB8E8701F9DE22EAAAAF41C81C7ACA572EB94F352B0AFC5BF907C7E31B971C206F
```


## 1. Getting Started, actually

> Step 1: Download the Talos Linux image. Get the latest ISO for your architecture from our Image factory.
While using their Image factory, I noticed a listed extension for tailscale. "Neat" I though, as I was thinking about remote management already. This will bite me in the butt later 😀. 

The talos docs recommend that you use one controller node.
This is probably why the [Talos for Linux Admins](https://docs.siderolabs.com/talos/v1.13/learn-more/talos-for-linux-admins) page has the following:

> In addition to learning the Talos command equivalents, there are a few concepts you’ll rely on frequently.
> Maintenance node: When a node is in maintenance mode, meaning it has booted but has not yet received a machine configuration, commands must be run with the --insecure flag. Not all commands are available in this mode. Refer to the —insecure flag ...

The docs were accurate; I did get quite familiar with the maintenance mode and fresh installations.

### Installations: the good
Let's start with the review about the good side of installations here.  
As said in 0., my targets were 4 mini-PCs.
Specifically, these are a mixture of HP ProDesk SFFs and Lenovo ThinkCentre M80q gen 3s.

From what Alex mentions on the Tailscale Youtube channel [Tailscale Youtube channel](https://youtu.be/3VpOYn_GfAY?si=ADtRRfitk7lrTk_c), the tailscale installer does some nifty `kexec(8)` things to be able to handle installation.
Had I watched Alex's video before I started, I would have known not to be so enamored by the following sentence.
Siderolabs has a catalog of system extensions in their Image Factory that pre-configure things that might be quite important for a production cluster.
The Image Factory was quite easy to use and, as mentioned, I added the tailscale extension as well as a nut client to the image.

Also, installation was pretty much as instantaneous as you could get.
Plug in an ISO, and you're up in running in less than a minute. Really.

### Installations: the rough
In the Getting Started docs, you query the Talos API to check which disks the Talos live image is able to find.
Oddly, it did not find the U.2 SATA drives on my HP ProDesk and without a shell, I didn't know the easiest way to get why at the time.
Didn't matter much, because I installed to a 2.5" SATA HDD in the `Bulbasaur` Mini PC.
I'd like to say it was as simple as installing it to the SATA HDD each time, but I got a teeny bit lazy and didn't unplug the installer drive from some of the other nodes as I was installing.

Wouldn't you know it, the kernel felt like it was nice time to name `/dev/sda` for the USB stick sometimes and `/dev/sda` for the HDDs other times.
This kernel behavior was known to me in advance, but the docs seem to make it clear that you should refer to this simple drive letter scheme for the block devices rather than `blkid(8)` or partition UUIDs.
Now, this wouldn't really be much of a problem had I decided to just to one control node, but I didn't want to have my testing be so far removed from what production might look like for my homelab.
I foolishly decided to stray from the blessed docs path early on and opted for a 3 controller to 1 worker split.
So, I foolishly ran `talosctl apply-config --insecure --nodes $CONTROL_PLANE_IP --file controlplane.yaml` for each of `bulbasaur`, `ivysaur`, and `venusaur`.

You wouldn't think that was so bad, except
1. When you generate the config, the docs want to use the `/dev/sda` drive letter schema. At this stage, (Step 6 in Getting Started, by the way), you have to make a decision you aren't capable of making
  - do you fork the `controlplane.yaml` and make per-node edits to ensure that the install drive is done by the unique serial number of the drive via `/dev/disk/by-id/<WWID>`?
  - do you follow the docs and let your multiple control nodes all use `/dev/sda` as the installation drive?
  - do you follow the docs even more and abandon the idea of multiple control nodes?
2. The docs oddly say `note the disk ID` to use in the next step, which is odd because `sda` and `/dev/sda` is such a small difference that the confusion isn't warrranted
3. The next step in the docs after **generate configurations** is **apply configuration**. Its not "**here's interesting parts of the configurations**, because they are important and some configurations can break things".

The end result for me was that Talos wasn't installed to disk... well the right disk.
I lost the ISO twice due to the kernel choosing `/dev/sda` at will and my lack of attention for leaving the boot drive in during install, which is a habit I've built up since you normally wait until the end of installation before a distribution's installer says "safe to eject USB".
Oh well, Talos Linux isn't your normal Linux.

## 2. Let's break things and debug them!

Remember how I mentioned that I baked tailscale into the image? There is documentation about [multihoming](https://docs.siderolabs.com/talos/v1.13/networking/multihoming), but this didn't come to mind as something that would have caused me agony from the jump.

See, things actually went smoothly because I was able to get through the rest of Getting Started.
For those with more experience than I, you'd think that things would have broken this early, but for some reason, the ISO I had downloaded didn't actually have any of the extensions baked in.
So, I decided to try again with the Image Factory and perform an in-place upgrade:

```bash
$ for poke in bulbasaur ivysaur venusaur squirtle; do talosctl -e bulbasaur -n $poke upgrade --image factory.talos.dev/metal-installer/e36ff7dd5f7832b65c69c4937cd88010a2e4413fa61a24ee96f2d3201068cb1b:v1.13.7; done
bulbasaur: pulled image factory.talos.dev/metal-installer/e36ff7dd5f7832b65c69c4937cd88010a2e4413fa61a24ee96f2d3201068cb1b@sha256:4e0b687c7585dd95dc00d5a455e1e1698db431554ac6df55289d5bd1493df0a3
bulbasaur: upgrade completed
bulbasaur: node drained
◲ watching nodes: [bulbasaur]
◲ watching nodes: [bulbasaur]
◲ watching nodes: [bulbasaur]
◲ watching nodes: [bulbasaur]
bulbasaur: node uncordoned
ivysaur: pulled image factory.talos.dev/metal-installer/e36ff7dd5f7832b65c69c4937cd88010a2e4413fa61a24ee96f2d3201068cb1b@sha256:4e0b687c7585dd95dc00d5a455e1e1698db431554ac6df55289d5bd1493df0a3
ivysaur: upgrade completed
ivysaur: node drained
◰ watching nodes: [ivysaur]
    * ivysaur: error: reboot sequence completed
◳ watching nodes: [ivysaur]
    * ivysaur: error: reboot sequence completed
^CSignal received, aborting, press Ctrl+C once again to abort immediately...
error pulling upgrade image: error from node venusaur: rpc error: code = Canceled desc = context canceled
^CSignal received, aborting, press Ctrl+C once again to abort immediately...
error during upgrade: error from node squirtle: rpc error: code = Canceled desc = context canceled
```

Oh no.

I wish I had thought to take screenshots before writing this post - I couldn't get the text onto my clipboard from the talos cli dashboard because the text was re-drawing on the terminal too quickly for me to even get a highlight.
It suffices to say that the nodes were going down one by one and I had lost `bulbasaur` before I knew what struck her down.

Fortunately, by the time `ivysaur` was pulling the new image down, I had realized `bulbasaur`'s quietude was not a good thing and SIGINTed the process. `ivysaur`, too, was poisoned by this multihoming issue.

> When a machine has multiple IPv4 or IPv6 addresses, it is important to control which addresses Talos components use for communication. Without explicit configuration, services like etcd or the kubelet may select different addresses across reboots or workloads, leading to unstable networking. A point to note is that the machines may become multihomed via privileged workloads.
> The etcd cluster needs to establish a mesh of connections among the members. It is done using the so-called advertised address - each node learns the others’ addresses as they are advertised. It is crucial that these IP addresses are stable, i.e., that each node always advertises the same IP address. Moreover, it is beneficial to control them to establish the correct routes between the members and, e.g., avoid congested paths. In Talos, these addresses are controlled using the cluster.etcd.advertisedSubnets configuration key.

I had not realized I needed to patch the machine configuration to limit the advertised subnets to only that subnet which I had planned for my LAN.
So, the tailscale tun/tap network interface became known to `etcd` and somehow took priority over the physical interface.
Had I SSH access to these nodes, I would have quickly SSHed into the tailscale IP and read the syslog.
However, Talos is not your average Linux.
So, the health of my cluster was quite down until I finally realized I need to set multi-homing for baked images or follow the Tailscale Youtube channel's guide.

As of writing, this hasn't been fully fixed because I haven't made the decision to bake Tailscale in or to use a Tailscale Kubernetes operator.
I'm leaning on the latter, but I don't know what that is yet.

## Quirks/Papercuts from having used Talos for a day
I also wanted to point out some non-breaking quirks that I just find lacking with the `talosctl` utility:

1. When targeting a list of nodes, you cannot use a range of IP addresses. It must be comma separated. In production, are people really typing out 1,2,3,4,5,6,7,8,9..somehundreds? Or are they doing in-shell expansions for their node lists...?
```bash
# Target specific nodes (comma-separated; range expansion like 1-3 is not supported)
talosctl stats -e bulbasaur -n bulbasaur,squirtle
```
2. When making changes to the nodes, my initial impression is that you write a bunch of different patch files. With all of the changes written in yaml, this feels like a recipe for pain. I don't find yaml easy to read and reason about - same with Python; Indentation is not a clear semantic marker. Even with editor extensions to add vertical lines to indentation, when you have pages of it, its hard to go back up the hierarchy (or at least I haven't figured out `yaml-mode` on emacs well enough just yet)
3. Shell completion is order dependent:
```bash
# Works with shell completion:
talosctl subcommand [flags]

# Breaks shell completion:
talosctl [flags] subcommand
talosctl -e venusaur -n venusaur dashboard
```
4. Likewise, it seems bash completion after some subcommands is not in place and you have to know partially what your next completion starts with. In other words, you cannot rely on completions to learn about new flags or subcommands via exploration.
```bash
    $ talosctl patch m <tab> # Nothing
    $ talosctl health <tab>
.git/             nixos/            README.org        secrets.enc.yaml  .sops.yaml        talos/
```
