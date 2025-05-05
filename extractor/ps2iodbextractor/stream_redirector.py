
from ps2iodbextractor.log_capture import LogCapture

class LogStreamRedirector:
    def __init__(self, level: str):
        self.log_capturer = LogCapture.get_instance()
        self.level = level

    def write(self, message: str):
        self.log_capturer.write(message, level=self.level)

    def flush(self):
        pass  # Required for compatibility with sys.stdout and sys.stderr