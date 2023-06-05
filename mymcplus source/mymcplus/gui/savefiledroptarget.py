import os
import wx

# FileDropTarget https://docs.wxpython.org/wx.FileDropTarget.html extension to allow for dragging files onto the gui window.
class SaveFileDropTarget(wx.FileDropTarget):
    FILE_EXTENSIONS = ['.ps2', '.cbs', '.psu', '.psv', '.max', '.sps', '.xps']

    def __init__(self, window, callback):
        wx.FileDropTarget.__init__(self)
        self.window = window
        self.callback = callback

    #def OnDragOver(self, x, y, defaultResult):
    #    return defaultResult

    def OnDropFiles(self, x, y, filenames):
        # We have to use wx.CallAfter() so that we don't block the GUI thread.
        # If we block the GUI thread then the operating system's "drag graphic" will remain until the dialog is closed, drawing
        # over the top of the dialog.
        wx.CallAfter(self.process_files_drop, filenames)
        return True
        
    def process_files_drop(self, filenames):
        for filename in filenames:
            # Process each dropped file
            print(f"File dropped: {filename}")
            extension = self.get_extension(filename)
            self.window.SetCursor(wx.NullCursor)
            if (extension not in self.FILE_EXTENSIONS):
                self.error_dialog(f"File with extension '{extension}' cannot be imported.")
            else:
                self.callback(filename)
        return True


    def error_dialog(self, message):
        dialog = wx.MessageDialog(
            self.window, 
            f"An error occured trying to import.\n\n{message}", 
            "Save Import Error", 
            wx.OK | wx.ICON_ERROR | wx.STAY_ON_TOP)
        dialog.ShowModal()
        dialog.Destroy()

    def get_extension(self, path):
        return os.path.splitext(path)[1]