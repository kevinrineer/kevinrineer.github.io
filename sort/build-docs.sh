#!/bin/bash
set -e

# Convert Org to man page
pandoc kevinrineer.org -s -t man -o kevinrineer.1

# Convert Org to Texinfo
pandoc kevinrineer.org -s -t texinfo -o kevinrineer.texi
makeinfo kevinrineer.texi
