# This file is a "bootstrap" to start the mymcpp module as a single file.
# This is used by pyinstaller so that no weird "relative import" issues occur at runtime. 
# https://stackoverflow.com/a/60988394/8306962

import io
import sys
from mymcplus import mymc

# Because we build the application with `--noconsole` any attempts to print to console will cause an error like `NoneType object has no attribute write` because
# the streams used by `print()` will be null, so setup some stub streams here. https://stackoverflow.com/questions/75456775/pyinstaller-noconsole-gives-error-and-doesnt-work
stream = io.StringIO()
sys.stdout=stream
sys.stderr=stream

# Run the application as we would in `__main__.py`.
sys.exit(mymc.main(sys.argv))