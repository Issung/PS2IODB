import wx

class VersionHistoryDialog(wx.Dialog):
    def __init__(self, *args, **kw):
        super(VersionHistoryDialog, self).__init__(*args, **kw, size=(500, 500))
        
        panel = wx.Panel(self)
        vbox = wx.BoxSizer(wx.VERTICAL)
        
        label = wx.StaticText(panel, label="Version History")
        vbox.Add(label, flag=wx.ALIGN_CENTER | wx.TOP | wx.BOTTOM, border=10)
        
        self.text_box = wx.TextCtrl(panel, style=wx.TE_MULTILINE | wx.TE_READONLY | wx.TE_RICH | wx.VSCROLL, size=(400, 500))
        
        version_history = """\
Version 0.1.1:
- Disable alpha/opacity in icon 3D models.
- Use all-white texture for models with no texture data (they typically use vertex colors only).
- Change compressed texture constants with those from Ross Ridge's code.
- Output traceback in export error message for better debugging.

Version 0.1:
- Initial fork from MYMC+.
- Add function to view other icon models for normal, copy & delete states.
- Add function to export icon assets in format for the PS2IODB project.
- Add ability to create new memory card file.
- Allow program to open without forcing user to open a memory card file.
- Add keyboard shortcuts for common operations.
"""
        
        self.text_box.SetValue(version_history)
        
        vbox.Add(self.text_box, proportion=1, flag=wx.EXPAND | wx.ALL, border=10)
        
        panel.SetSizer(vbox)
