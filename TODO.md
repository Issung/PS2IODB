The end goal of this project is to:
* Create a tool that allows people to easily view and extract the icons.
* Create an open archive of all PS2 icon models that can be viewed within the browser.

For this we need to be able to extract:
* The model geometry.
* Animation data.
* Texture data.

# Memory Card tool (MYMC):
1. Understand/document the icon visual data format.
    * Understanding is now much greater, after converting c++ code to python in gui.py. Need to refactor and write down some documentation somewhere. 
    * Make a pattern for ImHex or too complex?
2. ~~Make a way to view different icon modes in mymc (normal, copy, delete).~~
3. Fix errors relating to 'too small' in mymcplus that don't occur in original mymc.
    * ~~Load issue was occuring for Frequency & FF10, they had texture type '6'.~~
      This was fixed by changing __load_texture to do the uncompressed branch for value 6 as well as 7.
    * ~~Jak and Daxter is now having a problem with 'Data length is smaller than expected vertex data size'.~~
    * Katamari Damaci is causing an error when being imported: 'struct.error: required argument is not an integer'.
    * Ico is also having issues sporting a texture_type of 3. 'Data length is smaller than expected compressed texture header size.'.
    * A bunch of issues seem to be happening from ovewritten files from things like Gameshark, it seems Gameshark don't write theirs correctly.
4. ~~Find a way to extract that data to a format that can contain it (likely .FBX).~~
    * We are currently exporting to .obj & .png, are other formats more optimal?
5. Find a way to publish the tool that is cross-platform and allows people to do it easily.
6. Improve tool usability and fix bugs relating to specific titles.

# Open DB Site:
1. Find a way to display that data within the browser and make it:
    * ~~Textured.~~
    * ~~Animated.~~
        * With proper timing/tweening.
    * ~~Rotateable/Zoomable/Pannable~~.
2. Get list of all PlayStation 2 titles.
3. Create storage format for people to contribute to and for site to access.
4. ~~Create guide on how to contribute.~~
    * Guides need images to improve readability.
5. Design website look/layout.
6. ~~Create the website.~~
7. Generate publicity so the community can help build the archive.