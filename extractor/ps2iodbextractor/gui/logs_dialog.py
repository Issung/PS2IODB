import wx

from ps2iodbextractor.log_capture import LogCapture

class LogsDialog(wx.Dialog):
    def __init__(self, parent):
        super().__init__(parent, title="Application Logs", size=(600, 400), style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER)

        # Create a text control to display logs
        self.log_text = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY | wx.HSCROLL)

        # Load logs into the text control
        self.load_logs()

        # Add a refresh button and a close button
        refresh_button = wx.Button(self, label="Refresh")
        refresh_button.Bind(wx.EVT_BUTTON, self.on_refresh)

        close_button = wx.Button(self, wx.ID_OK, "Close")
        close_button.Bind(wx.EVT_BUTTON, self.on_close)

        # Layout
        button_sizer = wx.BoxSizer(wx.HORIZONTAL)
        button_sizer.Add(refresh_button, 0, wx.ALL, 5)
        button_sizer.Add(close_button, 0, wx.ALL, 5)

        sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(self.log_text, 1, wx.EXPAND | wx.ALL, 10)
        sizer.Add(button_sizer, 0, wx.ALIGN_CENTER | wx.ALL, 10)
        self.SetSizer(sizer)

    def load_logs(self):
        """Load logs into the text control."""
        log_capture = LogCapture.get_instance()
        self.log_text.SetValue(log_capture.get_logs())

    def on_refresh(self, event):
        """Refresh the logs."""
        self.load_logs()

    def on_close(self, event):
        """Close the dialog."""
        self.Destroy()