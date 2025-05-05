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
        self.listeners = []  # List of event listeners

    def write(self, message: str, level="INFO"):
        """Write a message to the log with a level and timestamp."""
        if message.strip():  # Ignore empty messages
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] [{level}] {message.strip()}"
            self.logs.append(log_entry)

            # Notify all listeners about the new log
            self.notify_listeners(log_entry)

            # Print the log to the original console
            if sys.__stdout__ is not None and level == "INFO":
                sys.__stdout__.write(log_entry + "\n")
            elif sys.__stderr__ is not None and level == "ERROR":
                sys.__stderr__.write(log_entry + "\n")

    def notify_listeners(self, log_entry):
        """Notify all registered listeners about a new log."""
        for listener in self.listeners:
            listener(log_entry)

    def add_listener(self, listener):
        """Add a listener to be notified of new logs."""
        self.listeners.append(listener)

    def remove_listener(self, listener):
        """Remove a listener."""
        self.listeners.remove(listener)

    def flush(self):
        """Flush method for compatibility with sys.stdout and sys.stderr."""
        pass

    def get_logs(self):
        """Get all captured logs as a single string."""
        return "\n".join(self.logs)

    def clear_logs(self):
        """Clear all captured logs."""
        self.logs = []