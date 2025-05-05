import wx
from ps2iodbextractor.log_capture import LogCapture

class LogsDialog(wx.Dialog):
    def __init__(self, parent):
        super().__init__(parent, title="PS2IODB Extractor Logs", size=(800, 400), style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER)

        # Create a text control to display logs
        self.log_text = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY | wx.HSCROLL)

        # Layout
        sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(self.log_text, 1, wx.EXPAND | wx.ALL, 10)
        self.SetSizer(sizer)

        # Subscribe to log events
        self.log_capture = LogCapture.get_instance()
        self.log_capture.add_listener(self.on_new_log)

        # Load initial logs
        self.log_text.SetValue(self.log_capture.get_logs())

    def on_new_log(self, log_entry):
        # Append the new log entry to the text control
        self.log_text.AppendText(log_entry + "\n")

    def on_close(self, event):
        self.log_capture.remove_listener(self.on_new_log)
        self.Destroy()