+++
title = "Cleaning /tmp on WSL NixOS"
date = 2026-04-13
updated = 2026-04-13
transparent = true
[taxonomies]
categories = ["tech"]
tags = ["nix", "wsl", "unix"]
+++


# TL:DR

I am using systemd as a reaper for my `/tmp/` directory because I decided not to mount it as a tmpfs.

# Problem Statement

Disk. Its expensive! Its shrinking! What are we going to do?

If you haven't noticed in 2026, storage prices are growing at a rate that most cannot manage.  
The maintainers of WSL stand by the, reasonable, argument that the maintainers of the distributions and their WSL images - which [are simply a packaged root filesystem](https://unix.stackexchange.com/questions/714463/what-is-involved-in-a-wsl-distribution) - should be in charge of making a decision on what to do about the underlying filesystem.  
This includes parts of the filesystem hierarchy which are meant for ephemeral data.  
However the backing VHDX of the root filesystem is not ephemeral in any sense.  
Rather, it will expand unless shrunk by the user or by a process within the VM.  

On a standard OS installation, you might not fret about if a few GB lives on a local drive or in RAM.  
The tradeoff between storing temporary files in RAM vs on a drive may not be important to the user installing their Linux of choice onto a laptop or desktop.  
However, on a Windows workstation with limited memory and disk space, that distinction can be pretty important.  
Harking back to the underlying VHDX, it may be the case that a WSL VM never does clean that space (if mounted as part of the ext4 filesystem) or that WSL and Windows fight for RAM (WSL balloons RAM).

# How Linux distributions typically manage /tmp

A subset of `man 7 hier` contains the following:

>   /tmp   This  directory  contains  temporary files which may be deleted with no notice, such as by a regular job or at system boot up.

As can be seen, there's nothing specific in the Filesystem Hierarchy Standard about how to manage the `/tmp/` directory.  
It isn't even clear that some Linux distributions manage /tmp via a virtual memory filesystem (see `man 5 tmpfs`).  

This might be confusing to someone new to Linux who reads the manual pages and sees "/tmp" and thinks "oh yes, tmpfs is a filesystem for temporary files and there is a place for temporary files" or that `/run/` is usually in tmpfs but `/var/run` which might a symlink to `/run/` while `/var/` itself is certainly not a tmpfs because then `/var/log/` would reside in RAM!  

Not to mention that different distributions have their own means of managing this bit of the filesystem.  
As far as WSL goes specifically, the maintainers of openSUSE-Tumbleweed, Fedora-43, archlinux, and others prefer to mount the `/tmp/` directory as a tmpfs.  
Meanwhile the default `Ubuntu` that most new-to-wsl users will experience is a `/tmp/` directory that gets cleaned up periodically and is mounted as an ext4 filesystem, which is stored in the distribution's corresponding `.vhdx` in `%localappdata%\wsl\{UUID}\ext4.vhdx`.  

There are some interesting observations that come from this:

1. Users of Ubuntu's default WSL instance will not have their backing storage cleaned until their Ubuntu's `systemd-tmpfiles-clean.service` runs, which will only run if the corresponding timer runs, *which only runs if Ubuntu is booted again*.
2. A user's choice of distribution in WSL actually could make an impact on their host's performance as well as that of the VM, which is otherwise not obvious.
3. If someone is crazy and wants to put a maximally configured distribution on WSL like Gentoo, NixOS, or a non systemd distribution, they may need to manually configure a reaper of old files in `/tmp/` (e.g. `tmpreaper`). Distributions with systemd seem to either use tmpfs mounts or systemd's tmpreaper.

# NixOS in WSL

`man 5 tmpfiles.d` shows the following locations where `systemd-tmpfiles` might read related config:

> /etc/tmpfiles.d/*.conf
> /run/tmpfiles.d/*.conf
> /usr/local/lib/tmpfiles.d/*.conf
> /usr/lib/tmpfiles.d/*.conf
> 
> ~/.config/user-tmpfiles.d/*.conf
> $XDG_RUNTIME_DIR/user-tmpfiles.d/*.conf
> ~/.local/share/user-tmpfiles.d/*.conf
> ...
> /usr/local/share/user-tmpfiles.d/*.conf
> /usr/share/user-tmpfiles.d/*.conf

Fortunately someone else already did the hard work and the only thing I needed to add was the following:

```bash
$ git diff HEAD~..HEAD
diff --git a/nixos/hosts/wsl/default.nix b/nixos/hosts/wsl/default.nix
index 62b7414..d48feac 100644
--- a/nixos/hosts/wsl/default.nix
+++ b/nixos/hosts/wsl/default.nix
@@ -3,8 +3,14 @@
                ../../common.nix # Global base settings
                ../../modules/dev.nix
        ];
        wsl.defaultUser = "kevin";
+       boot.tmp.cleanOnBoot = true;
+
+       systemd.tmpfiles.rules = [
+               "q /tmp 1777 root root 1d"
+       ];
 }
```

Specifically, the snippet shows that I want to start from a clean slate every time I boot the NixOS VM and that, if I leave the computer on for longer than a day, let `systemd-tmpfiles` clean up files older than 1d.  

Fortunately, the module system of NixOS and the massive community effort behind nixpkgs made it so that I didn't have to install a tmpreaper or write my own systemd service from scratch.  
I found some juicy bits in `https://github.com/NixOS/nixpkgs/blob/master/nixos/modules/system/boot/tmp.nix` which happen to be here on my nix store: `/nix/store/1pxjimwxwbiqaqbnpidv1yzi75b7civa-nixos-25.11/nixos`.  
This module handles the creation of the systemd rule, and ensures that the service and timer are running, etc.  

The key finding with this whole process was that you aren't limited to just searching for packages on search.nixos.org. You also have the /options endpoint [search.nixos.org/options](https://search.nixos.org/options) find `boot.tmp.cleanOnBoot` or `boot.tmp.useTmpfs` or generally just explore the many options already available!!

This was absolutely not clear to me after having read zero-to-nix and makes it so much easier to find out how to do things.  

I don't know if there's anything I should conclude this post with other than that WSL is a great abstraction that I'm really thankful for. I'm also really thankful to the huge Nix community for making modules that can be so easily shared between use-cases.
