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

"""Graphical user-interface for mymc+."""

import os
import platform
import subprocess
import sys
import traceback
from ps2iodbextractor.gui.about_dialog import AboutDialog
from ps2iodbextractor.gui.version_history_dialog import VersionHistoryDialog
from .. import iconexport

# Work around a problem with mixing wx and py2exe
if os.name == "nt" and hasattr(sys, "setdefaultencoding"):
    sys.setdefaultencoding("mbcs")
import wx

from .. import ps2mc
from ..save import ps2save
from .icon_window import IconWindow
from .dirlist_control import DirListControl
from .savefiledroptarget import SaveFileDropTarget
from . import utils

class GuiConfig(wx.Config):
    """A class for holding the persistant configuration state."""

    memcard_dir = "Memory Card Directory"
    savefile_dir = "Save File Directory"
    ascii = "ASCII Descriptions"

    def __init__(self):
        wx.Config.__init__(self, "mymc+", style = wx.CONFIG_USE_LOCAL_FILE)

    def get_memcard_dir(self, default = None):
        return self.Read(GuiConfig.memcard_dir, default)

    def set_memcard_dir(self, value):
        return self.Write(GuiConfig.memcard_dir, value)

    def get_savefile_dir(self, default = None):
        return self.Read(GuiConfig.savefile_dir, default)

    def set_savefile_dir(self, value):
        return self.Write(GuiConfig.savefile_dir, value)

    def get_ascii(self, default = False):
        return bool(self.ReadInt(GuiConfig.ascii, int(bool(default))))

    def set_ascii(self, value):
        return self.WriteInt(GuiConfig.ascii, int(bool(value)))


def add_tool(toolbar, id, label, standard_art, ico):
    bmp = wx.NullBitmap

    if standard_art is not None:
        bmp = wx.ArtProvider.GetBitmap(standard_art, wx.ART_TOOLBAR)

    if bmp == wx.NullBitmap:
        tbsize = toolbar.GetToolBitmapSize()
        bmp = utils.get_png_resource_bmp(ico, tbsize)

    return toolbar.AddTool(id, label, bmp, shortHelp = label)


class GuiFrame(wx.Frame):
    """The main top level window."""

    ID_CMD_EXIT = wx.ID_EXIT
    ID_CMD_NEW = wx.ID_NEW
    ID_CMD_OPEN = wx.ID_OPEN
    ID_CMD_EXPORT = 103
    ID_CMD_IMPORT = 104
    ID_CMD_DELETE = wx.ID_DELETE
    ID_CMD_ASCII = 106

    ID_CMD_EXPORT_ICONS = 107
    ID_CMD_OPEN_EXPORT_ASSETS_FOLDER = 108

    ID_HELP_ABOUT = 300
    ID_HELP_VERSION_HISTORY = 301

    def message_box(self, message, caption = "mymcplus", style = wx.OK,
            x = -1, y = -1):
        return wx.MessageBox(message, caption, style, self, x, y)

    def error_box(self, msg):
        return self.message_box(msg, "Error", wx.OK | wx.ICON_ERROR)

    def mc_error(self, value, filename = None):
        """Display a message box for EnvironmentError exeception."""

        if filename == None:
            filename = getattr(value, "filename")
        if filename == None:
            filename = self.mcname
        if filename == None:
            filename = "???"

        strerror = getattr(value, "strerror", None)
        if strerror == None:
            strerror = "unknown error"

        return self.error_box(filename + ": " + strerror)

    def __init__(self, parent, title, mcname = None):
        self.f = None
        self.mc = None
        self.mcname = None
        self.icon_win = None

        size = (800, 400)
        wx.Frame.__init__(self, parent, wx.ID_ANY, title, size = size)
        file_drop_target = SaveFileDropTarget(self, self.evt_cmd_dragdrop)
        self.SetDropTarget(file_drop_target)

        self.Bind(wx.EVT_CLOSE, self.evt_close)

        self.config = GuiConfig()
        self.title = title

        self.SetIcon(wx.Icon(utils.get_png_resource_bmp("icon.png")))

        self.Bind(wx.EVT_MENU, self.evt_cmd_exit, id=self.ID_CMD_EXIT)
        self.Bind(wx.EVT_MENU, self.evt_cmd_new, id=self.ID_CMD_NEW)
        self.Bind(wx.EVT_MENU, self.evt_cmd_open, id=self.ID_CMD_OPEN)
        self.Bind(wx.EVT_MENU, self.evt_cmd_import, id=self.ID_CMD_IMPORT)
        self.Bind(wx.EVT_MENU, self.evt_cmd_export, id=self.ID_CMD_EXPORT)
        self.Bind(wx.EVT_MENU, self.evt_cmd_export_icons, id=self.ID_CMD_EXPORT_ICONS)
        self.Bind(wx.EVT_MENU, self.evt_open_export_folder, id=self.ID_CMD_OPEN_EXPORT_ASSETS_FOLDER)
        self.Bind(wx.EVT_MENU, self.evt_cmd_delete, id=self.ID_CMD_DELETE)
        self.Bind(wx.EVT_MENU, self.evt_cmd_ascii, id=self.ID_CMD_ASCII)

        self.Bind(wx.EVT_MENU, self.evt_help_about, id=self.ID_HELP_ABOUT)
        self.Bind(wx.EVT_MENU, self.evt_help_version_history, id=self.ID_HELP_VERSION_HISTORY)

        filemenu = wx.Menu()
        filemenu.Append(self.ID_CMD_NEW, "&New...\tCTRL+N", "Create a new PS2 memory card image.")
        filemenu.Append(self.ID_CMD_OPEN, "&Open...\tCTRL+O", "Opens an existing PS2 memory card image.")
        filemenu.AppendSeparator()
        self.import_menu_item = filemenu.Append(self.ID_CMD_IMPORT, "&Import...\tCTRL+I", "Import a save file into this image.")
        self.export_menu_item = filemenu.Append(self.ID_CMD_EXPORT, "&Export...\tCTRL+E", "Export a save file from this image.")
        self.delete_menu_item = filemenu.Append(self.ID_CMD_DELETE, "&Delete\tDEL", "Delete selected save files from this image.")
        filemenu.AppendSeparator()
        self.export_icon_assets_menu_item = filemenu.Append(self.ID_CMD_EXPORT_ICONS, "Export Icon Assets\tCTRL+A", "Export all icon assets for the selected save file.")
        self.open_eported_assets_menu_item = filemenu.Append(self.ID_CMD_OPEN_EXPORT_ASSETS_FOLDER, "Open Exported Assets Folder", "Open folder containing exported assets.")
        filemenu.AppendSeparator()
        filemenu.Append(self.ID_CMD_EXIT, "E&xit\tALT+F4")

        optionmenu = wx.Menu()
        self.ascii_menu_item = optionmenu.AppendCheckItem(self.ID_CMD_ASCII, "&ASCII Descriptions", "Show descriptions in ASCII instead of Shift-JIS")

        helpmenu = wx.Menu()
        helpmenu.Append(self.ID_HELP_ABOUT, "About", "View information about PS2IODB Extractor")
        helpmenu.Append(self.ID_HELP_VERSION_HISTORY, "Version History", "View change notes for the current & previous versions")

        self.Bind(wx.EVT_MENU_OPEN, self.evt_menu_open)

        self.CreateToolBar(wx.TB_HORIZONTAL)
        self.toolbar = toolbar = self.GetToolBar()
        tbsize = (32, 32)
        toolbar.SetToolBitmapSize(tbsize)
        add_tool(toolbar, self.ID_CMD_OPEN, "Open", wx.ART_FILE_OPEN, "open.png")
        toolbar.AddSeparator()
        add_tool(toolbar, self.ID_CMD_IMPORT, "Import", None, "import.png")
        add_tool(toolbar, self.ID_CMD_EXPORT, "Export", None, "export.png")
        toolbar.Realize()

        self.statusbar = self.CreateStatusBar(2, style=wx.STB_SIZEGRIP)
        self.statusbar.SetStatusWidths([-2, -1])

        panel = wx.Panel(self, wx.ID_ANY, (0, 0))
        sizer = wx.BoxSizer(wx.HORIZONTAL)
        sizer.Add(panel, wx.EXPAND, wx.EXPAND)
        self.SetSizer(sizer)

        splitter_window = wx.SplitterWindow(panel, style=wx.SP_LIVE_UPDATE)
        splitter_window.SetSashGravity(0.5)

        self.item_context_menu = wx.Menu()
        self.item_context_menu.Append(self.ID_CMD_DELETE, "Delete\tDEL")
        self.item_context_menu.Append(self.ID_CMD_EXPORT_ICONS, "Export Icon Assets\tCTRL+A")

        self.dirlist = DirListControl(splitter_window,
                                      self.evt_dirlist_item_focused,
                                      self.evt_dirlist_select,
                                      self.evt_dirlist_rightclick,
                                      self.config)

        if mcname is not None:
            self.open_mc(mcname)
        else:
            self.refresh()

        panel_sizer = wx.BoxSizer(wx.HORIZONTAL)
        panel_sizer.Add(splitter_window, wx.EXPAND, wx.EXPAND)
        panel.SetSizer(panel_sizer)

        info_win = wx.Window(splitter_window)
        icon_win = IconWindow(info_win, self)
        if icon_win.failed:
            info_win.Destroy()
            info_win = None
            icon_win = None
        self.info_win = info_win
        self.icon_win = icon_win

        if icon_win is None:
            self.info1 = None
            self.info2 = None
            splitter_window.Initialize(self.dirlist)
        else:
            self.icon_menu = icon_menu = wx.Menu()
            icon_win.append_menu_options(self, icon_menu)
            optionmenu.AppendSubMenu(icon_menu, "Icon Window")
            title_style = wx.ALIGN_RIGHT | wx.ST_NO_AUTORESIZE

            self.info1 = wx.StaticText(info_win, -1, "", style=title_style)
            self.info2 = wx.StaticText(info_win, -1, "", style=title_style)
            # self.info3 = wx.StaticText(panel, -1, "")

            info_sizer = wx.BoxSizer(wx.VERTICAL)
            info_sizer.Add(self.info1, 0, wx.EXPAND | wx.LEFT | wx.RIGHT, border=4)
            info_sizer.Add(self.info2, 0, wx.EXPAND | wx.LEFT | wx.RIGHT, border=4)
            # info_sizer.Add(self.info3, 0, wx.EXPAND)
            info_sizer.AddSpacer(5)
            info_sizer.Add(icon_win, 1, wx.EXPAND)
            info_win.SetSizer(info_sizer)

            splitter_window.SplitVertically(self.dirlist, info_win, int(self.Size.Width * 0.7))

        menubar = wx.MenuBar()
        menubar.Append(filemenu, "&File")
        menubar.Append(optionmenu, "&Options")
        menubar.Append(helpmenu, "Help")
        self.SetMenuBar(menubar)

        self.Show(True)

    def _close_mc(self):
        if self.mc != None:
            try:
                self.mc.close()
            except EnvironmentError as value:
                self.mc_error(value)
            self.mc = None
        if self.f != None:
            try:
                self.f.close()
            except EnvironmentError as value:
                self.mc_error(value)
            self.f = None
        self.mcname = None

    def refresh(self):
        try:
            self.dirlist.update(self.mc)
        except EnvironmentError as value:
            self.mc_error(value)
            self._close_mc()
            self.dirlist.update(None)

        mc = self.mc

        self.toolbar.EnableTool(self.ID_CMD_IMPORT, mc != None)
        self.toolbar.EnableTool(self.ID_CMD_EXPORT, False)

        if mc == None:
            status = "No memory card image"
        else:
            free = mc.get_free_space() // 1024
            limit = mc.get_allocatable_space() // 1024
            status = "%dK of %dK free" % (free, limit)
        self.statusbar.SetStatusText(status, 1)

    def open_mc(self, filename):
        self._close_mc()
        self.statusbar.SetStatusText("", 1)
        if self.icon_win != None:
            self.icon_win.load_icon(None, None, None, None)

        f = None
        try:
            f = open(filename, "r+b")
            mc = ps2mc.ps2mc(f)
        except EnvironmentError as value:
            if f != None:
                f.close()
            self.mc_error(value, filename)
            self.SetTitle(self.title)
            self.refresh()
            return

        self.f = f
        self.mc = mc
        self.mcname = filename
        self.SetTitle(filename + " - " + self.title)
        self.refresh()

    def evt_menu_open(self, event):
        self.import_menu_item.Enable(self.mc is not None)
        selected = self.mc is not None and len(self.dirlist.selected) > 0
        self.export_menu_item.Enable(selected)
        self.delete_menu_item.Enable(selected)
        self.export_icon_assets_menu_item.Enable(selected)
        self.ascii_menu_item.Check(self.config.get_ascii())
        if self.icon_win is not None:
            self.icon_win.update_menu(self.icon_menu)


    def evt_dirlist_item_focused(self, event):
        if self.icon_win is None:
            return

        i = event.GetData()
        entry = self.dirlist.dirtable[i]
        self.info1.SetLabel(entry.title[0])
        self.info2.SetLabel(entry.title[1])

        icon_sys = entry.icon_sys
        mc = self.mc

        if mc is None or icon_sys is None:
            self.icon_win.load_icon(None, None, None, None)
            return
        
        icon_data_normal = self.load_icon_data(entry, icon_sys, "normal")
        icon_data_copy = self.load_icon_data(entry, icon_sys, "copy")
        icon_data_delete = self.load_icon_data(entry, icon_sys, "delete")

        self.icon_win.load_icon(icon_sys, icon_data_normal, icon_data_copy, icon_data_delete)

    def load_icon_data(self, entry, icon_sys, type):
        if type == "normal":
            icon_name = icon_sys.icon_file_normal
        elif type == "copy":
            icon_name = icon_sys.icon_file_copy
        elif type == "delete":
            icon_name = icon_sys.icon_file_delete
        else:
            raise Exception(f"Unknown icon type {type}")
    
        try:
            self.mc.chdir("/" + entry.dirent[8].decode("ascii"))
            f = self.mc.open(icon_name, "rb")
            try:
                data = f.read()
                return data
            finally:
                f.close()
        except EnvironmentError as value:
            print("icon failed to load", value)
            return None

    def evt_dirlist_select(self, event):
        self.toolbar.EnableTool(self.ID_CMD_IMPORT, self.mc != None)
        self.toolbar.EnableTool(self.ID_CMD_EXPORT,
                    len(self.dirlist.selected) > 0)

    def evt_dirlist_rightclick(self, event):
        self.PopupMenu(self.item_context_menu)

    def evt_cmd_new(self, event = None):
        """Create new memory card UI event"""
        path = wx.FileSelector("Choose location for new memory card file",
                     self.config.get_memcard_dir(""),
                     "NewCard.ps2", "ps2", "*.ps2",
                     wx.FD_SAVE | wx.FD_OVERWRITE_PROMPT,
                     self)
        
        # If not cancelled (not an empty string)
        if path.strip():
            stream = open(path, "x+b")
            params = ps2mc.ps2mc_format_params(True,
                ps2mc.PS2MC_STANDARD_PAGE_SIZE,
                ps2mc.PS2MC_STANDARD_PAGES_PER_ERASE_BLOCK,
                ps2mc.PS2MC_STANDARD_PAGES_PER_CARD)
            newcard = ps2mc.ps2mc(stream, False, params)
            newcard.close()
            stream.close()

            self.open_mc(path)

    def evt_cmd_open(self, event = None):
        fn = wx.FileSelector("Open Memory Card Image",
                     self.config.get_memcard_dir(""),
                     "Mcd001.ps2", "ps2", "*.ps2",
                     wx.FD_FILE_MUST_EXIST | wx.FD_OPEN,
                     self)
        if fn == "":
            return
        self.open_mc(fn)
        if self.mc != None:
            dirname = os.path.dirname(fn)
            if os.path.isabs(dirname):
                self.config.set_memcard_dir(dirname)

    def evt_cmd_export(self, event):
        mc = self.mc
        if mc == None:
            return

        selected = self.dirlist.selected
        dirtable = self.dirlist.dirtable
        sfiles = []
        for i in selected:
            dirname = dirtable[i].dirent[8].decode("ascii")
            try:
                sf = mc.export_save_file("/" + dirname)
                longname = ps2save.make_longname(dirname, sf)
                sfiles.append((dirname, sf, longname))
            except EnvironmentError as value:
                self.mc_error(value. dirname)

        if len(sfiles) == 0:
            return

        dir = self.config.get_savefile_dir("")
        if len(selected) == 1:
            (dirname, sf, longname) = sfiles[0]
            fn = wx.FileSelector("Export " + dirname,
                         dir, longname, "psu",
                         "EMS save file (.psu)|*.psu"
                         "|MAXDrive save file (.max)"
                         "|*.max",
                         (wx.FD_OVERWRITE_PROMPT
                          | wx.FD_SAVE),
                         self)
            if fn == "":
                return
            try:
                f = open(fn, "wb")
                try:
                    format = ps2save.format_for_filename(fn)
                    format.save(sf, f)
                finally:
                    f.close()
            except EnvironmentError as value:
                self.mc_error(value, fn)
                return

            dir = os.path.dirname(fn)
            if os.path.isabs(dir):
                self.config.set_savefile_dir(dir)

            self.message_box("Exported " + fn + " successfully.")
            return

        dir = wx.DirSelector("Export Save Files", dir, parent = self)
        if dir == "":
            return
        count = 0
        for (dirname, sf, longname) in sfiles:
            fn = os.path.join(dir, longname) + ".psu"
            try:
                f = open(fn, "wb")
                sf.save_ems(f)
                f.close()
                count += 1
            except EnvironmentError as value:
                self.mc_error(value, fn)
        if count > 0:
            if os.path.isabs(dir):
                self.config.set_savefile_dir(dir)
            self.message_box("Exported %d file(s) successfully."
                     % count)


    def _do_import(self, path):
        sf = ps2save.PS2SaveFile()
        file_stream = open(path, "rb")
        filename = str.split(path, '\\')[-1]
        busy_info_flags = wx.BusyInfoFlags()
        busy_info_flags.Parent(self)
        busy_info_flags.Text(f"Importing {filename}... This can take a while for larger saves.")
        busy_info = wx.BusyInfo(busy_info_flags)
        try:
            format = ps2save.poll_format(file_stream)
            file_stream.seek(0)
            if format is not None:
                format.load(sf, file_stream)
                if not self.mc.import_save_file(sf, True):
                    del busy_info
                    self.error_box(path + ": Save file already present.")
            else:
                self.error_box(path + ": Save file format not recognized.")
                return
        finally:
            file_stream.close()
            del busy_info

    def evt_cmd_import(self, event):
        if self.mc == None:
            return

        dir = self.config.get_savefile_dir("")
        fd = wx.FileDialog(self, "Import Save File", dir,
                   wildcard = ("PS2 save files"
                           " (.cbs;.psu;.psv;.max;.sps;.xps)"
                           "|*.cbs;*.psu;.psv;*.max;*.sps;*.xps"
                           "|All files|*.*"),
                   style = (wx.FD_OPEN | wx.FD_MULTIPLE
                        | wx.FD_FILE_MUST_EXIST))
        if fd == None:
            return
        r = fd.ShowModal()
        if r == wx.ID_CANCEL:
            return

        success = None
        for fn in fd.GetPaths():
            try:
                self._do_import(fn)
                success = fn
            except EnvironmentError as value:
                self.mc_error(value, fn)

        if success != None:
            dir = os.path.dirname(success)
            if os.path.isabs(dir):
                self.config.set_savefile_dir(dir)
        self.refresh()

    def evt_cmd_delete(self, event):
        mc = self.mc
        if mc == None:
            return

        selected = self.dirlist.selected
        dirtable = self.dirlist.dirtable

        dirnames = [dirtable[i].dirent[8].decode("ascii") for i in selected]

        if len(selected) == 1:
            title = dirtable[list(selected)[0]].title
            s = dirnames[0] + " (" + utils.single_title(title) + ")"
        else:
            s = ", ".join(dirnames)
            if len(s) > 200:
                s = s[:200] + "..."

        r = self.message_box(f"Are you sure you want to delete {s}?", "Delete Save File Confirmation", wx.YES_NO)

        if r != wx.YES:
            return

        for dn in dirnames:
            try:
                mc.rmdir("/" + dn)
            except EnvironmentError as value:
                self.mc_error(value, dn)

        mc.check()
        self.refresh()

    def evt_cmd_ascii(self, event):
        self.config.set_ascii(not self.config.get_ascii())
        self.refresh()

    def evt_help_about(self, event):
        dialog = AboutDialog(self)
        dialog.ShowModal()
        dialog.Destroy()

    def evt_help_version_history(self, event):
        dialog = VersionHistoryDialog(self)
        dialog.ShowModal()
        dialog.Destroy()

    def evt_cmd_export_icons(self, event):
        selected_directory_index = next(iter(self.dirlist.selected))    # self.dirlist.selected is a set so we just iterate the first item to get the first selection.
        selected_directory_name = self.dirlist.dirtable[selected_directory_index].dirent[8].decode()   # copied from dirlist_control.cmp_dir_name().
        iconsys = self.icon_win._icon_sys
        title = iconsys.get_title_joined("unicode")

        dialog = wx.TextEntryDialog(self, "Enter name for new folder for icons to be extracted to:", "PS2IODB Extractor", f"{selected_directory_name} {title}")
        if dialog.ShowModal() != wx.ID_OK:
            return
        entered_text = dialog.GetValue()
        dialog.Destroy()

        if not os.path.exists(f"{iconexport.ICON_ASSETS_FOLDER}/{entered_text}"):
            os.makedirs(f"{iconexport.ICON_ASSETS_FOLDER}/{entered_text}")

        try: 
            # Place names of the icon files into a dictionary, removing duplicates.
            icon_dict = {
                iconsys.icon_file_normal: self.icon_win._icon_normal,
                iconsys.icon_file_copy: self.icon_win._icon_copy,
                iconsys.icon_file_delete: self.icon_win._icon_delete,
            }
            iconexport.export_iconsys(f"{iconexport.ICON_ASSETS_FOLDER}/{entered_text}/", selected_directory_name, iconsys, icon_dict)
        except Exception as e:
            dialog = wx.MessageDialog(
                self,
                f"An error occured trying to export icons.\n\n'{str(e)}'\n\n{traceback.format_exc()}Please consider opening an issue on GitHub with the memory card file attached.",
                "Icon Export Error",
                wx.OK | wx.ICON_ERROR
            )
            dialog.ShowModal()
            dialog.Destroy()

    def evt_open_export_folder(self, event):
        # Cross-platform open file explorer https://stackoverflow.com/a/16204023/8306962
        if platform.system() == "Windows":
            os.startfile(iconexport.ICON_ASSETS_FOLDER)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", iconexport.ICON_ASSETS_FOLDER])
        else:
            subprocess.Popen(["xdg-open", iconexport.ICON_ASSETS_FOLDER])

    def evt_cmd_exit(self, event):
        self.Close(True)

    def evt_close(self, event):
        self._close_mc()
        self.Destroy()

    def evt_cmd_dragdrop(self, path):
        extension = os.path.splitext(path)[1]
        if extension == ".ps2":
            if self.mc == None:
                # If no memorycard open currently just open the dragged one immediately.
                self.open_mc(path)
            else:
                # If there is a memory card currently open confirm the action before loading.
                confirm_dialog = wx.MessageDialog(self, f"Do you want to close this memory card and open '{path}'?", "PS2IODB Extractor", wx.YES_NO | wx.ICON_QUESTION)
                confirm = confirm_dialog.ShowModal()
                confirm_dialog.Destroy()
                if (confirm == wx.ID_YES):
                    self.open_mc(path)
        else:
            if self.mc == None:
                dialog = wx.MessageDialog(self.window,  f"A memory card must be open before importing saves.", "Save Import Error", wx.OK | wx.ICON_ERROR | wx.STAY_ON_TOP)
                dialog.ShowModal()
                dialog.Destroy()
            else:
                self._do_import(path)
        self.refresh()

def run(filename = None):
    """Display a GUI for working with memory card images."""

    wx_app = wx.App()
    frame = GuiFrame(None, "PS2IODB Extractor", filename)
    return wx_app.MainLoop()

if __name__ == "__main__":
    import gc
    gc.set_debug(gc.DEBUG_LEAK)

    run("test.ps2")

    gc.collect()
    for o in gc.garbage:
        print()
        print(o)
        if type(o) == ps2mc.ps2mc_file:
            for m in dir(o):
                print(m, getattr(o, m))