# Script to build MYMC++ to a single executable file.
# It is possible you get a "virus or potentially unwanted software error", just disable Windows Defender real time protection temporarily.
# Temporary files are stored in the "build" folder.
# A single executable file will be created in the "dist" folder.

# If --noconsole is used then whenever python tries to write to the console the app will crash, 

pyinstaller \
    --noconsole \
    --onefile \
    --name 'MYMC++' \
    ./runme.py