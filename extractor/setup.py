#
# This file is part of mymc+, based on mymc by Ross Ridge.
#
# mymc+ is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# mymc+ is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with mymc+.  If not, see <http://www.gnu.org/licenses/>.
#

from setuptools import setup

setup(
    name="ps2iodbextractor",
    version="1.0",
    description="A tool for extracting save icon assets for the PS2IODB project",
    author="Issung",
    license="GPLv3",
    clasifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Console",
        "Environment :: MacOS X :: Cocoa",
        "Environment :: Win32 (MS Windows)",
        "Environment :: X11 Applications :: GTK",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
        "Natural Language :: English",
        "Operating System :: Microsoft :: Windows",
        "Operating System :: MacOS",
        "Operating System :: POSIX :: Linux",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Topic :: Games/Entertainment",
        "Topic :: Multimedia :: Graphics :: 3D Rendering",
        "Topic :: Scientific/Engineering :: Interface Engine/Protocol Translator",
        "Topic :: System :: Emulators",
        "Topic :: System :: Archiving",
        "Topic :: System :: Archiving :: Backup",
        "Topic :: System :: Filesystems",
        "Topic :: Utilities"
    ],
    keywords="playstation ps2 mymc memory card save emulator",
    packages=["ps2iodbextractor", "ps2iodbextractor.gui", "ps2iodbextractor.save"],
    entry_points={
        "console_scripts": [
            "ps2iodbextractor = ps2iodbextractor.program:main"
        ]
    },
    python_requires=">=3.10.7",
    install_requires=[
        "Pillow==11.0.0",
    ],
    extras_require={
        "gui": [
            "wxPython==4.2.0",
            "types-wxpython==0.9.7", # https://pypi.org/project/types-wxpython/ For wxPython version 4.2.0
            "pyopengl==3.1.7",
        ]
    }
)
