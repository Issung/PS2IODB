import os
import wx

# FileDropTarget https://docs.wxpython.org/wx.FileDropTarget.html extension to allow for dragging files onto the gui window.
class SaveFileDropTarget(wx.FileDropTarget):
    FILE_EXTENSIONS = ['.ps2', '.cbs', '.psu', '.psv', '.max', '.sps', '.xps']

    def __init__(self, window, callback):
        wx.FileDropTarget.__init__(self)
        self.window = window
        self.callback = callback

    def OnDropFiles(self, x, y, filenames):
        # We have to use wx.CallAfter() so that we don't block the GUI thread.
        # If we block the GUI thread then the operating system's "drag graphic" will remain until the dialog is closed, drawing
        # over the top of the dialog.
        wx.CallAfter(self.process_files_drop, filenames)
        return True
        
    def process_files_drop(self, filenames):
        if any(self.get_extension(filename) == '.ps2' for filename in filenames) and len(filenames) > 1:
            self.error_dialog(f"Files with the extension '.ps2' are memory cards, only 1 can be loaded at a time.")
            return

        invalid_extensions = []
        for filename in filenames:
            # Process each dropped file
            print(f"File dropped: {filename}")
            extension = self.get_extension(filename)
            if (extension not in self.FILE_EXTENSIONS):
                invalid_extensions.append(extension)
            else:
                self.callback(filename)

        valid_extensions_string = ', '.join([f"'{valid_extension}'" for valid_extension in self.FILE_EXTENSIONS])
        if len(invalid_extensions) == 1:
            self.error_dialog(f"File with extension '{extension}' cannot be imported.\nValid extensions are {valid_extensions_string}.")
        elif len(invalid_extensions) > 1:
            invalid_extensions_string = ', '.join([f"'{invalid_extension}'" for invalid_extension in invalid_extensions])
            self.error_dialog(f"Files with extensions {invalid_extensions_string} could not be imported.\nValid extensions are {valid_extensions_string}.")

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