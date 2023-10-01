# Script to build MYMC++ to a single executable file.
# It is possible you get a "virus or potentially unwanted software error", just disable Windows Defender real time protection temporarily.
# This will output an executable to "dist" folder.

# If --noconsole is used then whenever python tries to write to the console the app will crash, 

pyinstaller \
    --noconsole \
    --onefile \
    --name 'MYMC++' \
    ./runme.py