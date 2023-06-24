# PS2IconSys

Original website: https://www.ghulbus-inc.de/projects/ps2iconsys/index.html

This folder contains the c++ sourcecode of the PS2IconSys project by Ghulbus Inc, updated to work with Visual Studio 2022 (from ~2008).
This is a tool written in C++ that understands the icon.sys folder and can convert the ps2 icons to and from .obj files.
It also supports extracting the textures for the icons to .tga files.

It seems to be missing support for animations, though the viewer seems to display some info about frames and timings, but does not play the icons.
Also obviously obj files do not support animation data.

This tool was cross-referenced with the mymc python code to bring great benefit to understanding of the icon asset storage format.