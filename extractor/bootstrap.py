# This file is a "bootstrap" to start the mymcpp module as a single file.
# This is used by pyinstaller so that no weird "relative import" issues occur at runtime. 
# https://stackoverflow.com/a/60988394/8306962

import sys
from ps2iodbextractor import program
from ps2iodbextractor.stream_redirector import LogStreamRedirector

# Redirect stdout and stderr to the log capture
sys.stdout = LogStreamRedirector("INFO")
sys.stderr = LogStreamRedirector("ERROR")

# Run the application
sys.exit(program.main(sys.argv))