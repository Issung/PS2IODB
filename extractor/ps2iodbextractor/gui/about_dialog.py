import wx
import wx.lib.agw.hyperlink as hl

class AboutDialog(wx.Dialog):
    def __init__(self, parent):
        super(AboutDialog, self).__init__(parent, title="About", size=(400, 220))

        panel = wx.Panel(self)
        sizer = wx.BoxSizer(wx.VERTICAL)

        label = wx.StaticText(panel, label="PS2IODB Extractor is a PlayStation 2 memory card manager with the ability to export save icon assets to support the PlayStation 2 Icons Open Database (PS2IODB) project.")
        label.Wrap(300)
        sizer.Add(label, 0, wx.ALL | wx.CENTER, 10)

        hyperlink = hl.HyperLinkCtrl(panel, -1, "PS2IODB.com", URL="https://ps2iodb.com/")
        sizer.Add(hyperlink, 0, wx.ALL | wx.CENTER, 10)

        label = wx.StaticText(panel, label="PS2IODB Extractor is a fork of MYMC+ by thestr4ng3r, which is a fork of the original MYMC by Ross Ridge.")
        label.Wrap(300)
        sizer.Add(label, 0, wx.ALL | wx.CENTER, 10)

        panel.SetSizer(sizer)