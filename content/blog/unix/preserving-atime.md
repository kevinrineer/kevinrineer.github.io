+++
title = "Preserving access time when you need to modify it"
date = 2026-07-20
updated = 2026-07-20
transparent = true
[taxonomies]
categories = ["systemadministration"]
tags = ["posix", "linux", "unix"]
+++

# OK What are we talking about here?

Often, when you are troubleshooting an issue with a filesystem, you want to use metadata about the files to get a better understanding of the system as a whole.
Filesystem access times are metadata that each inode contains.

# So, what's the problem?

Every so often, I run commands that I think are "metadata specific".
The specific command I ran this time was `file(1)` because I wanted to confirm that the file I was looking at was indeed what I thought it was.
For reference, the file name and path was a bit like this: `html/Temp/Black Mirror - Nosedive.mkv`.
This was a file I discovered as one of many rather large files while diagnosing the reason for filesystem's low remaining storage capacity.

When I'm administering a system, I want to maintain user privacy as best I can.
In so doing, there is no way that I'm going to download the file to my device and open it locally.
There's also operational security benefits to not downloading unknown files, but that's another matter.
Also, its pretty darned important to maintain the integrity of the filesystem metadata for auditability purposes.
As such, the need arises to use the file's metadata to the best of my abilities during troubleshooting and be "data unaware" so to speak.

`stat(1)` from `corutils` is great for displaying the file metadata.
It reads the filesystem's inode table, which has great metadata such as:
- access time
- modification time
- birth (creation) time
- SELinux attributes
- block size
- uid/gid of the owner
- and enough that you should actually read the manpage for stat to see how much metadata is in the inode table


Unfortunately, when using `stat --printf="%F\n"` to format stat just to show "file type" the program only shows what type of file it is (in the sense of file/directory/socket/pipe).
It does not and should not be content aware.

## Its a trap!

See, this content aware thing is tricky because part of a file's metadata is actually stored as part of the file:

```bash
$ xxd ./html/Temp/Black\ Mirror\ -\ Nosedive.mkv | head -n 10
00000000: 1a45 dfa3 a342 8681 0142 f781 0142 f281  .E...B...B...B..
00000010: 0442 f381 0842 8288 6d61 7472 6f73 6b61  .B...B..matroska
00000020: 4287 8104 4285 8102 1853 8067 0100 0000  B...B....S.g....
00000030: 5d12 5c03 114d 9b74 af4d bb8c 53ab 8415  ].\..M.t.M..S...
00000040: 49a9 6653 ac82 1003 4dbb 8c53 ab84 1654  I.fS....M..S...T
00000050: ae6b 53ac 8210 834d bb8e 53ab 841c 53bb  .kS....M..S...S.
00000060: 6b53 ac84 5d10 6261 ec4f cc00 0000 0000  kS..].ba.O......
00000070: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00000080: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00000090: 0000 0000 0000 0000 0000 0000 0000 0000  ................
```

The first segment of data in almost any file are magic numbers (a.k.a file signatures)](https://en.wikipedia.org/wiki/List_of_file_signatures).
One rather infamous magic number would be the ELF header for an executable file `7F 45 4C 46`.
As can be read from the xxd example, the file in question was indeed a [matroska media container](https://en.wikipedia.org/wiki/Matroska), so it was probably aptly named and also a worthy candidate for removal - one does not just have a production webserver also hosting pirated content.

You absoltely want to know and read these magic numbers in order to be really confident that you can just remove the files.
The `file` command does just that, with the unfortunate side-effect of also modifying the access time.
You see, in order to read the bytes of a file, you actually do need to access it.

## Its a trap, but you can handle it!

I've got a nifty little shell function that can be used an alias for `check magic` that I'm going to call `cm`.
Please note, that I don't have access to  Non-Mac BSD systems to verify their core system utilities work with this shell funciton.
I won't guarantee correctness of any kind; it is provided as is. Consider it MIT licensed.

```bash
cm() {
    target="${1}"
    
    [ -e "$target" ] || return 1

    if [ "$(uname -s)" = "Linux" ]; then
        # GNU / Linux syntax
        atime=$(stat -c "%X" "$target") || return 1
        orig_posix_time=$(date -d "@$atime" "+%Y%m%d%H%M.%S")
    else
        # macOS flavored BSD syntax
        atime=$(stat -f "%a" "$target") || return 1
        orig_posix_time=$(date -j -f "%s" "$atime" "+%Y%m%d%H%M.%S")
    fi

    file "$target"
	new_atime=$(stat -c "%X" "$target") || return 1
	new_posix_time=$(date -d "@$new_atime" "+%Y%m%d%H%M.%S")
	orig_posix_time=$orig_posix_time

    # POSIX touch with standard timestamp syntax (YYYYMMDDhhmm.ss)
    touch -a -t "$orig_posix_time" "$target"
}
```

Let's first run it on a local file that hasn't been accessed in a while as an example:

```bash
$ file=$(find $HOME -maxdepth 6 ! -newerat "2026-01-01" -type f | head -n 1)
$ set -x && cm "${file}" && set +x
+ cm /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
+ target=/home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
+ '[' -e /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md ']'
++ uname -s
+ '[' Linux = Linux ']'
++ stat -c %X /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
+ atime=1761630736
++ date -d @1761630736 +%Y%m%d%H%M.%S
+ orig_posix_time=202510272252.16
+ file /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
/home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md: HTML document, Unicode text, UTF-8 text
++ stat -c %X /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
+ new_atime=1784569872
++ date -d @1784569872 +%Y%m%d%H%M.%S
+ new_posix_time=202607201051.12
+ orig_posix_time=202510272252.16
+ touch -a -t 202510272252.16 /home/kevin/.local/share/zed/node/node-v24.11.0-linux-x64/CHANGELOG.md
+ set +x
```

# Wrapup

This post is mostly for me to refer back to in a couple of years when I forget about what I did this morning. 
If you took anything out of it, that's great!

If you want a deeper dive into filesystem metadata, inode tables, etc, please make that clear via e-mail.
It ain't hard to guess what my e-mail is.
I'm not on any socials other than LinkedIn for the curse of feeling that it is necessary.

À plus.