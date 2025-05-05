import datetime
import sys

class LogCapture:
    """A class to capture stdout and stderr writes with log level and timestamp."""
    _instance = None

    @staticmethod
    def get_instance():
        """Get the singleton instance of the log capture."""
        if LogCapture._instance is None:
            LogCapture._instance = LogCapture()
        return LogCapture._instance

    def __init__(self):
        self.logs = []

    def write(self, message: str, level="INFO"):
        """Write a message to the log with a level and timestamp."""
        if message.strip():  # Ignore empty messages
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] [{level}] {message.strip()}"
            self.logs.append(log_entry)

            # __stdout/err__ contain the original values from program start. They may not be populated (in the case of the GUI app).
            # If they are set (e.g. when debugging) then print to them as well as storing the logs in this capturer.
            if sys.__stdout__ is not None and level == "INFO":
                sys.__stdout__.write(log_entry + "\n")
            elif sys.__stderr__ is not None and level == "ERROR":
                sys.__stderr__.write(log_entry + "\n")

    def flush(self):
        """Flush method for compatibility with sys.stdout and sys.stderr."""
        pass

    def get_logs(self):
        """Get all captured logs as a single string."""
        return "\n".join(self.logs)

    def clear_logs(self):
        """Clear all captured logs."""
        self.logs = []