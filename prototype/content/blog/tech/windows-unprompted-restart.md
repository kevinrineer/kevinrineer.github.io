+++
title = "Unprompted Restart: A Windows Installer 'Feature' That Needs to Die"
date = 2025-07-2025
+++

# Here's what happened today

So, I'm on my work computer (for which Windows is a must) and I see an application needs an update. Fine, I want my software to be as bug-free and up-to-date as possible, so I naively press "update" and continue my work.

UAC pops up as expected, because the software vendor's installer used `C:\Program Files`, because it relies on system components and libs. So, elevated perms are necessary for this software update. I'm logged into my non-privileged account, like a good boy, so I provide the user info for the local admin account and continue on my way. 

I'm casually working on some task while the, quite slow, installer updates in the background aaaaand I get logged out to just the text "Restarting". Fun.

An abrupt reboot with _no interactive prompt_, no "save your work" dialog – just an immediate, unceremonious "Restarting". There's no text other than that, so I am stuck with lost, unsaved, work and a single word that taunts me for tens of minutes, while I have to look awkwardly look like I'm doing things and not totally bamboozled, because I work in-office.

Frustrated, I check `eventvwr.msc` when I can get re-logged in, which confirms the sequence:

1. "Beginning a Windows Installer transaction: {UUID}. Client Process Id: {PID}."
2. "Application 'C:\Program Files\PRODUCTNAME\PRODUCTNAME.exe cannot be restarted. Application SID does not match Conductor SID" - Windows, you knew that... Right? You could've just... asked me to close it.
3. "Machine restart is required." - Then, notify the other SID?
4. "Product: PRODUCTNAME - Update 'PRODUCTNAME Updater' installed successfully."
5. "Windows Installer requires a system restart. Type of System Restart: 1. Reason for Restart: 1."
6. "The Windows Installer initiated a system restart to complete or continue the configuration of 'PRODUCTNAME'."

*NOTE:* All of these log levels are tagged as "information". There is not a single "warning" nor an "error".


# The Problem with the "Logic"

Technically, I understand why this happens. When an application is elevated via UAC, a new process is spawned in an administrative security context, separate from the standard user's interactive session. This is a good thing. 

But like, the whole workflow is nonsense. The Windows Installer could know that this process was spawned from a non-privileged context and send some kind of message to the non-privileged parent. IPC mechanisms exist for this, but have no ability to do thair job.

Plus, I'm still not sure why the system even needed a restart. Gemini 2.5 Flash gives me these:
> Strict File Locking on Executables and Loaded DLLs. When a .exe file is executed or a .dll file is loaded by a process, Windows places a very strong, exclusive lock on that file on disk. This lock prevents any other process (including the installer) from modifying, deleting, or even renaming that file while it's in use.
Well, the process wasn't active. Unless it was sent to the background, the software was closed.

I'm also lead to believe that:
> Backward Compatibility with FAT: While NTFS is vastly more advanced than FAT (File Allocation Table), its design had to accommodate the expectations built up from FAT, which had no concept of inodes and strict file locking.

And:
> From the perspective of the Windows Installer and application developers, a full system reboot is the cleanest slate. It guarantees that all processes are gone, all file handles are released, and the updated files can be correctly placed.
Sure, as with everything Windows the fix is "just restart the whole OS. We have no idea how to handle manage the state of a running system". `RstrtMgr.dll` exists to attempt to restart an exe or a service, but it has no teeth (see above SID mismatch).

So really, I don't get it. I just don't understand why Windows is this way. ABI is god. Worship it, mortals.

# I'm a Linux-on-the-desktop lover

This is where I shill for Linux and rant. I use Linux at home as my daily driver (Fedora Atomic - Aurora). I have never experienced a forced, unprompted restart on Linux *for anything*. When updating software, there is no breach of user control, no violating the principle of least surprise, and, most importanly, no "WTF just happened". 

The Linux packaging ecosystem right now is so nice that I have been using `unattended-upgrades` on debian systems and `dnf-automatic` for rpm-based systems. Each of those have configurations about when to automatically reboot (such as "never", if desired). The motd will tell me if a system restart is required if it hasn't been rebooted, but I've been running "reboot at 04:00 AM" for 2 years as my rule for servers and I have not yet seen an issue. For my home desktop, Aurora just pulls the latest image down every so often and I just have to remember to reboot. It's so dreadfully easy!

In my strongly held opionion, this isn't a minor gripe with Windows; it's a fundamental flaw in Windows' handling of critical system events in a mixed-privilege environment where you are punished for following the principle of least privilege. The Windows Installer (or the whole system supporting it) needs to grow up into the 20th century. There /must/ be a mechanism to communicate a pending system restart to all active user sessions, even if the restart command originated from an isolated process. I'd take a "the machine will undergo a forced restart in 5 minutes" OS notification over the current status quo of nothing.

Its no friggin' surprise that the average Windows user tends to not update their software. Each software update is a butthole clencher.

Rant over. Signing off.
