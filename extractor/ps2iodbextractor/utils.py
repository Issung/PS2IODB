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

import sys

def zero_terminate(s: bytes) -> bytes:
    """Truncate a string at the first NUL ('\0') character, if any."""

    i = s.find(b'\0')
    if i == -1:
        return s
    return s[:i]

def printerr(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)