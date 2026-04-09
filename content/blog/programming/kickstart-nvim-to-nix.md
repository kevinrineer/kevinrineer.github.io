+++
title = "Migrating Neovim workflow to Nix"
date = 2026-04-09
updated = 2026-04-09
transparent = true
[taxonomies]
categories = ["programming"]
tags = ["neovim", "nix"]
+++


# TL:DR

If you have changed only a small amount from kickstart, remove the Mason section in your `init.lua` or the respective lua file which has your `require("lazy").setup({` block.  

```bash
$ git --no-pager diff --staged
diff --git c/nvim/lua/lazySetup.lua i/nvim/lua/lazySetup.lua
index d2f0180..09af3fe 100644
--- c/nvim/lua/lazySetup.lua
+++ i/nvim/lua/lazySetup.lua
@@ -80,12 +80,6 @@ require("lazy").setup({
                -- Main LSP Configuration
                "neovim/nvim-lspconfig",
                dependencies = {
-                       -- Automatically install LSPs and related tools to stdpath for Neovim
-                       -- Mason must be loaded before its dependents so we need to set it up here.
-                       -- NOTE: `opts = {}` is the same as calling `require('mason').setup({})`
-                       { "williamboman/mason.nvim", opts = {} },
-                       "williamboman/mason-lspconfig.nvim",
-                       "WhoIsSethDaniel/mason-tool-installer.nvim",

                        -- Useful status updates for LSP.
                        -- NOTE: `opts = {}` is the same as calling `require('fidget').setup({})`
@@ -215,20 +209,6 @@ require("lazy").setup({
                        vim.list_extend(ensure_installed, {
                                "stylua", -- Used to format Lua code
                        })
-                       require("mason-tool-installer").setup({ ensure_installed = ensure_installed })
-
-                       require("mason-lspconfig").setup({
-                               handlers = {
-                                       function(server_name)
-                                               local server = servers[server_name] or {}
-                                               -- This handles overriding only values explicitly passed
-                                               -- by the server configuration above. Useful when disabling
-                                               -- certain features of an LSP (for example, turning off formatting for ts_ls)
-                                               server.capabilities = vim.tbl_deep_extend("force", {}, capabilities, server.capabilities or {})
-                                               require("lspconfig")[server_name].setup(server)
-                                       end,
-                               },
-                       })
                end,
        },
```

Then add the language servers to your system packages or user packages in your nixOS configuration.  
This would likely be `/etc/nixos/configuration.nix` if you've recently installed from the nixOS iso.  

# Why, oh why

This was all pain I brought upon myself.  
You see, I went with the lazier path with transitioning away from Emacs to Neovim by using a curated set of configurations from [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim).  
Kickstart nvim was really great for me when actually kickstarting my Neovim usage.  
However, Kickstart assumes an FHS compliant system when using a Linux system, where Kickstart's included Mason package manager expects the classic folder hierarchy like `/usr/bin`, `/usr/lib`, `/usr/include`, and so forth.  
NixOS also doesn't come with prety common binaries like `unzip`, which is another dependency of Mason.  

The "why" for this blog post's existence is that the ecosystem seems to lack a simple "transition/TODO" of how to go from using kickstart to using neovim with nix without fully being consumed by nix.  
Heck, it wasn't even clear to me why, upon initialization of the `nvim` process, I just saw the process hang for a while then emit `stylua failed to install` in a minibuffer and it took me a while to realize that it was a Mason issue from finding `:MasonLog` and seeing some language servers succeeding an install, like `rust-analyzer` and some failing like `stylua` (which was the one that failed without `unzip` and `wget` in the `$PATH`).  

Here's some things that I found that seem to assume that someone is already blessed with deep understanding of the nix ecosystem:
1. [kickstart.nix](https://github.com/nix-community/kickstart-nix.nvim)
2. [nixvim](https://github.com/nix-community/nixvim)
3. [nixos forum](https://discourse.nixos.org/t/neovim-kickstart-without-flakes-or-home-manager/64327/3)

As someone still stuggling with learning both nixos, the nix language, and the nix package manager, I found it overwhelming to read and, attempt to, evaluate the bulleted resources.  
If you read this and notice all sorts of vocabulary mismatches, please refer to the prior setence and be kind.  

# Bridging the gap
## How I am using NixOS right now.

I think it should be stated early that I am still in the process of managing my machines with a flake based setup.  
If you're reading this in 2026, flakes are *still* flagged as experimental.  
However, I am finding that they work to modularize my configurations so that I can share as much as I can between all the things I want managed by nix.  

I have a `flake.nix` in my dotfiles for which I run `sudo nixos-rebuild switch $HOME/dotfiles/nixos#HOSTTYPE` where HOSTYPE is one of three different outputs I am generating based on where I plan that configuration to be deployed:
1. nixtop - A Dell Latitude laptop which is becoming my main workstation
2. thekevdoghouse - an AMD+Nvidia workstation I built in 2020
3. wsl - [A community instance of nixOS for WSL](https://github.com/nix-community/NixOS-WSL) (which I use as my "work development environment")

Hopefully, this snippet does a pretty good job of explaining the structure to those who already understand building a nixOS system with flakes.
```bash
$ tree -L3 ~/dotfiles/nixos/
/home/kevin/dotfiles/nixos/
├── common.nix
├── flake.lock
├── flake.nix
├── hosts
│   ├── nixtop
│   │   ├── default.nix
│   │   └── hardware-configuration.nix
│   ├── thekevdoghouse
│   │   ├── default.nix
│   │   ├── disko-config.nix
│   │   └── hardware-configuration.nix
│   └── wsl
│       └── default.nix
├── modules
│   ├── dev.nix
│   ├── kde.nix
│   └── workstation.nix
└── README.org

6 directories, 13 files
```

If you're impressed with how much is there already, please don't be.  
I was heavily reliant on Gemini 3.0 fast as a shortcut to getting started.  
Plus, it took me multiple days to get to this state.  
Plus, I would not be able to reproduce this manually at my current understanding of the nix langauge.  
The syntax of the Nix language is pretty simple, but the ecosystem and libraries are both plethoric and deep in their many layers of abstraction.  

## What I've done so far
### Removing Mason

When I pulled from the main branch of kickstart.nvim, I didn't take notice of what commit I pulled from. So, this diff will show better what was pulled out than I can explain.

```bash
$ git --no-pager diff --staged
diff --git c/nvim/lua/lazySetup.lua i/nvim/lua/lazySetup.lua
index d2f0180..09af3fe 100644
--- c/nvim/lua/lazySetup.lua
+++ i/nvim/lua/lazySetup.lua
@@ -80,12 +80,6 @@ require("lazy").setup({
                -- Main LSP Configuration
                "neovim/nvim-lspconfig",
                dependencies = {
-                       -- Automatically install LSPs and related tools to stdpath for Neovim
-                       -- Mason must be loaded before its dependents so we need to set it up here.
-                       -- NOTE: `opts = {}` is the same as calling `require('mason').setup({})`
-                       { "williamboman/mason.nvim", opts = {} },
-                       "williamboman/mason-lspconfig.nvim",
-                       "WhoIsSethDaniel/mason-tool-installer.nvim",

                        -- Useful status updates for LSP.
                        -- NOTE: `opts = {}` is the same as calling `require('fidget').setup({})`
@@ -215,20 +209,6 @@ require("lazy").setup({
                        vim.list_extend(ensure_installed, {
                                "stylua", -- Used to format Lua code
                        })
-                       require("mason-tool-installer").setup({ ensure_installed = ensure_installed })
-
-                       require("mason-lspconfig").setup({
-                               handlers = {
-                                       function(server_name)
-                                               local server = servers[server_name] or {}
-                                               -- This handles overriding only values explicitly passed
-                                               -- by the server configuration above. Useful when disabling
-                                               -- certain features of an LSP (for example, turning off formatting for ts_ls)
-                                               server.capabilities = vim.tbl_deep_extend("force", {}, capabilities, server.capabilities or {})
-                                               require("lspconfig")[server_name].setup(server)
-                                       end,
-                               },
-                       })
                end,
        },
```

### Installing language servers with Nix

I've made the [lua-language-server](https://search.nixos.org/packages?channel=25.11&query=lua-language-server&show=lua-language-server) part of my `dev.nix` module, which has the following snippet pulling from nixpkgs' current stable branch (which is 25.11 as of this publication's date):

```bash
{ config, pkgs, ... }: {
        users.users.kevin.packages = with pkgs; [
                gcc
                gnumake
                neovim
                lua-language-server
                ripgrep
                fd
                fzf
                direnv
        ];
# other stuff squashed
}
```

Other than the lua language server, I'm primarily trying to define language servers and build chains in project specific `flake.nix` files and to use direnv (or `nix develop`) to "source" them.  
I think the `lua-language-server` is the only one that should always be in my `$PATH` because it is nice to have when modifying my neovim configurations, which I still do frequently enough.  
While writing this article, but before publishing, I had thought that nodejs was required for each langauge server, but it seems that at least neither `clangd` and `lua-language-server` require it, which is really nice.  

Here's an ugly snippet from a C project's `flake.nix` where I enable clangd with the `clang-tools` package from nixpkgs:25.11:

```
        inputs = {
                nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
        };
        outputs = { self, nixpkgs }:
                let
                        supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
                        forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
                in
                {
                        devShells = forAllSystems (system:
                                let
                                        pkgs = nixpkgs.legacyPackages.${system};
                                in
                                {
                                        default = pkgs.mkShell {
                                                packages = with pkgs; [
                                                        cmake
                                                        clang-tools
                                                        gdb
                                                        git
                                                        gnumake
                                                        readline
                                                        skopeo
                                                        pkgs."unity-test"
                                                ];
                                                shellHook = ''
                                                export C_INCLUDE_PATH="${pkgs.unity-test}/include/unity:${pkgs.readline}/include:$C_INCLUDE_PATH"
                                                export LIBRARY_PATH="${pkgs.unity-test}/lib:${pkgs.readline}/lib:$LIBRARY_PATH"
                                                '';
                                        };
                                });
# Quite a bit more unnecessary stuff cut off
```

### Replacing Mason's functionality

Mason not only installs servers, but also starts them upon opening a matching filetype.  

The extremely fortunate thing for me is that with neovim 0.11, its pretty easy to do this.  
I gave Gemini the docs at `:h lspconfig-nvim-0.11` and it was clear that the core of Neovim has made this quite a bit easier to handle:  

My LSP servers are defined with the servers table `local servers = {` like so:  
```
local servers = {
	clangd = {},
	-- gopls = {},
	-- pyright = {},
	rust_analyzer = {},
	lua_ls = {},
}
```

And all I added was this right after that block:  

```
diff --git i/nvim/lua/lazySetup.lua w/nvim/lua/lazySetup.lua
index f410fea..9ec3e59 100644
--- i/nvim/lua/lazySetup.lua
+++ w/nvim/lua/lazySetup.lua
@@ -205,6 +205,12 @@ require("lazy").setup({
                                },
                        }

+                       for server_name, server_opts in pairs(servers) do
+                               -- NOTE: In 0.11, vim.lsp.config() returns the existing config if it exists
+                               vim.lsp.config(server_name, server_opts)
+                               vim.lsp.enable(server_name)
+                       end
+
```

After making these changes, a `git -C ~/dotfiles/ add . && sudo nixos-rebuild switch $HOME/dotfiles/nixos#host && nvim` killed all the stylua issues and the LSP issues and the many many neovim freakouts that kept flooded the startup logs.  
Figuring out which part of my neovim config broke was not easy and I've marked it as another thing on my endless TODO lists: "figure out how to debug neovim config and if `:messages` is sufficient".  

# Wrapup

This was really difficult.  
I spent about 4 hours not sure what I was doing because Mason handled a huge portion of the LSP work and while I had read all the comments of kickstart in the past, it was long enough ago where I forgot enough to lost competence in managing its configuration.  

I still have many more hours of dotfile technical debt to squash, but I hope my session helps at least one potential reader.  
