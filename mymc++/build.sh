# Script to build MYMC++ to a single executable file.
# It is possible you get a "virus or potentially unwanted software error", just disable Windows Defender real time protection temporarily.
# Temporary files are stored in the "build" folder.
# A single executable file will be created in the "dist" folder.

pyinstaller \
    --noconsole \
    --onefile \
    --icon="icon.ico" \
    --name 'MYMC++' \
    ./bootstrap.py