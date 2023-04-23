# PS2SaveIconResearch
Research on PS2 save icon formats and model display.
The end goal of this research is to:
* Create a tool that allows people to easily view and extract the icons.
* Create an archive of all PS2 icon models that can be viewed within the browser.

For this we need to be able to extract:
* The model geometry.
* Animation data.
* Texture data.

# TODO List:
1. ~~Make a way to view different icon modes (normal, copy, delete).~~
    * Send all 3 to the icon_window and added context menu radio items to select the type.
2. Fix errors relating to 'too small' in mymcplus that don't occur in original mymc.
    * Load issue was occuring for Frequency & FF10, they had texture type '6'.
      This was fixed by changing __load_texture to do the uncompressed branch for value 6 as well as 7.
    * Jak and Daxter is now having a problem with 'Data length is smaller than expected vertex data size'.
    * Katamari Damaci is causing an error when being imported: 'struct.error: required argument is not an integer'.
    * Ico is also having issues sporting a texture_type of 3. 'Data length is smaller than expected compressed texture header size.'.
    * A bunch of issues seem to be happening from ovewritten files from things like Gameshark, it seems Gameshark don't write theirs correctly.
3. Understand/document the icon visual data format.
4. Find a way to extract that data to a format that can contain it (likely .FBX).
5. Find a way to publish a tool that does this that is cross-platform and allows people to do it easily.
6. Find a way to display that data within the browser and make it:
    * Textured.
    * Animated.
    * Rotateable/Zoomable.
7. Design website look/layout.
8. Create the website.
9. Generate publicity so the community can help build the archive.

PS2 Icon Format v0.5 PDF.
Trying to get access to the 
Hi there, on your website there is this page: https://www.ps2savetools.com/documents/ps2-icon-format-v05/
It has a link to a PDF describing the PS2 icon format, but the link leads to an IP and doesn't load: http://35.176.43.5/ps2icon-0.5.pdf
I would very much like to see this PDF as it likely has invaluable information that I require for a project of mine.
It is possible to update the link on the site or to send the PDF to me directly? It would be much appreciated, thank you in advance. 😁

https://www.ps2savetools.com/contact-us/?contact-form-id=473&contact-form-sent=3210&contact-form-hash=c4c087c25aa1c1eed9967eb8150e3b1f6d5b9a89&_wpnonce=d0c528eebc#contact-form-473