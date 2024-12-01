#!/bin/bash
# Script to build PS2IODB Extractor to a single executable file.
# It is possible you get a "virus or potentially unwanted software error", just disable Windows Defender real time protection temporarily.
# Temporary files are stored in the "build" folder.
# A single executable file will be created in the "dist" folder.

# Install UPX with `scoop install main/upx` and pyinstller will use it for compression; ~43mb down to 29.

pyinstaller \
    --noconsole \
    --onefile \
    --icon="icon.ico" \
    --name 'PS2IODB Extractor' \
    ./bootstrap.py
