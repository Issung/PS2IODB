import { Link } from "react-router-dom";
import './TextPage.scss'
import Footer from "../components/Footer";

const Faq: React.FC = () => {
    return (
        <>
            <title>FAQ</title>
            <div id="Faq">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xl-8">
                            <Link to="/">← Home</Link>
                            <h1>PS2 Icon Open Database</h1>
                                <h2>Frequently Asked Questions</h2>
                            <hr/>
                            <h4>What is this website?</h4>
                            <p>
                                Video games for the Playstation 2 home console all had unique icons that were placed on the memory card with save data, these icons had distinct 3D models, textures, animations and even lighting!<br/>
                                This website is a community driven database that aims to archive all of the unique save icon assets from all PlayStation 2 titles.<br/>
                            </p>

                            <h4>Is this website official?</h4>
                            <p>
                                No, this website is not affiliated with Sony or any of the game developers. Contributions and uploads are made by fans in our spare time.
                            </p>

                            <h4>How do I use this website?</h4>
                            <p>
                                At the <Link to="/">Home Page</Link> scroll downwards to find multiple techniques to search the PlayStation 2 library.<br/>
                                Once here, there is 3 ways to browse the library.
                            </p>
                            <ol>
                                <li>
                                    <h6>Alphabetical</h6>
                                    <p>
                                        This technique allows you to simply browse the PlayStation 2 library via alphabetic sorting of the titles.<br/>
                                        Some titles with unique names will show under close-match characters, for example <i>.hack//frägment</i> will show under <i>H</i>, or <i>Ōkami</i> under <i>O</i>.<br/>
                                        Titles that start with non-english characters or numbers will be listed under <i>#</i>.
                                    </p>
                                </li>
                                <li>
                                    <h6>Category</h6>
                                    <p>
                                        With this technique you can sort the library by its contribution status (whether it has been contributed yet or is still missing), or
                                        by how many unique states the icons have, some icons only have 1 state, while others may have 2 or 3 for the copy/delete UIstates.
                                    </p>
                                </li>
                                <li>
                                    <h6>Free Text Search</h6>
                                    <p>
                                        With this method you can enter any search terms in a text box to search all titles.<br/>
                                    </p>
                                </li>
                            </ol>
                            <p>
                                Once you have found the title you wish to view, if it has been uploaded you may click it to go to the interactive 3D model viewer.<br/>
                                If the title you wish to view has not been uploaded you can contribute it yourself!
                            </p>

                            <h4>Structure</h4>
                            <p>
                                The structure of the icons and contributions can be a little tricky to understand, here is the basics:
                                <ul>
                                    <li>There are many <i>Titles</i>, either <i>Applications</i> or <i>Games</i>.</li>
                                    <li>Each <i>Title</i> can have 1 or more <i>Icons</i>. Different <i>Icons</i> can come from different regions, or differences in the game state, like chosen characters or difficulty.</li>
                                    <li>Each <i>Icon</i> has 1 to 3 unique <i>States</i>. <i>States</i> are the differences in the PS2 BIOS when the icon is idle, or in the copy / delete states. Each Icon's <i>Unique State Count</i> is shown next to it in a blue circle.</li>
                                </ul>
                            </p>

                            <h4>Can I use the icons in Blender?</h4>
                            <p>
                                Yes! The icon models are standard OBJ files with a PNG texture, but animations are stored in a format made for this website that Blender can't read on its own.
                                The PS2IODB Blender add-on adds support for importing icons downloaded from this site complete with their animation, and can also export your own models to a PS2 memory card to view on a real PS2 or in an emulator.
                            </p>
                            {/* Muted and playsInline are required for browsers (iOS Safari especially) to autoplay. */}
                            <video
                                src="/images/blender-demo.webm"
                                width={1036}
                                height={712}
                                style={{ width: '100%', height: 'auto', marginBottom: '1rem' }}
                                autoPlay
                                loop
                                muted
                                playsInline
                                aria-label="An icon imported with the PS2IODB add-on playing its animation in Blender"
                            />
                            <p>
                                The current version is <b>{__BLENDER_ADDON_VERSION__}</b> and requires Blender 4.2 or newer.
                                See <a href="https://github.com/Issung/PS2IODB/blob/main/blender/CHANGELOG.md">what's changed</a>, or browse its <a href="https://github.com/Issung/PS2IODB/tree/main/blender">source code</a>.
                            </p>
                            <ol>
                                <li>
                                    <h6>Installing (with automatic update notifications)</h6>
                                    <p>
                                        This website is a Blender extension repository, so Blender can install the add-on and tell you when a new version is out.
                                    </p>
                                    <ol>
                                        <li>In Blender go to <i>Edit → Preferences → Get Extensions</i>. If asked, allow online access.</li>
                                        <li>Open the <i>Repositories</i> menu in the top right, click <i>+</i> and choose <i>Add Remote Repository</i>.</li>
                                        <li>Enter the URL <code>{__BLENDER_ADDON_INDEX_URL__}</code>, tick <i>Check for Updates on Startup</i> and click <i>Create</i>.</li>
                                        <li>Search for <i>PS2IODB</i> and click <i>Install</i>.</li>
                                    </ol>
                                    <p>
                                        When a new version is released Blender shows a notice in its status bar, and you can update from the same page.
                                    </p>
                                </li>
                                <li>
                                    <h6>Installing manually</h6>
                                    <p>
                                        Alternatively, <a href={__BLENDER_ADDON_ZIP__} download>download the add-on</a> and drag the zip into Blender's window (there's no need to extract it).
                                        You won't be told about updates, so check back here for new versions. Blender shows the installed version under <i>Edit → Preferences → Add-ons</i>.
                                    </p>
                                </li>
                                <li>
                                    <h6>Importing an icon</h6>
                                    <p>
                                        On an icon's page, use the download button to save its zip. In Blender choose <i>File → Import → PS2IODB Icon (.zip/.obj)</i> and select the zip.<br/>
                                        Each icon is imported with its texture, vertex colours and normals. Its animation is imported as shape keys that blend exactly like the PS2 plays them, and the scene is set to 60 fps, the PS2's animation rate.
                                        Icons with a different copy or delete state import those too. Switch between the states with the <i>Preview</i> buttons in the <i>PS2 Icon</i> tab of the 3D Viewport's sidebar (press <i>N</i>), which also sets the timeline to that state's animation loop.
                                    </p>
                                </li>
                                <li>
                                    <h6>Exporting to a memory card</h6>
                                    <p>
                                        Open the <i>PS2 Icon</i> tab in the 3D Viewport's sidebar (press <i>N</i>). Set the save's title and folder name, the mesh to show for each state, and the background and lighting if you like, then click <i>Export Memory Card</i>.
                                        This creates a new 8MB <i>.ps2</i> memory card image containing a save with your icon.
                                    </p>
                                    <ul>
                                        <li>In PCSX2, put the card in a memory card slot, then copy the save onto your own card from the PS2 browser.</li>
                                        <li>On a real PS2, load the card on an SD card based memory card such as the SD2PSX or MemCard PRO2.</li>
                                    </ul>
                                    <p>
                                        Model your icon standing on the origin, facing Blender's front view, and within 8 units of the origin. Use a single 128x128 texture (others are resized).
                                        Animate it with shape keys, or for armature or modifier animation, choose <i>Bake</i> when exporting.
                                    </p>
                                </li>
                            </ol>

                            <h4>How can I help/contribute?</h4>
                            <p>
                                See the <Link to="/contribute">How to Contribute</Link> page for guides on different ways to contribute.<br/>
                                Contributions outside of icon uploads can also be made, improvements to the website or memory card management tool are welcome in pull requests!
                            </p>

                            <h4>Who can I contact for more info?</h4>
                            <p>If your inquiry relates to a problem consider creating a GitHub issue, else e-mail the site founder Issun for <a href="mailto: issun@sonofgoran.com">issun@sonofgoran.com</a> for all other inqueries.</p>

                            <h4>How can I issue a takedown request / DMCA?</h4>
                            <p>Send an email to <a href="mailto: issun@sonofgoran.com">issun@sonofgoran.com</a> detailing your request.</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer className="col-xl-8" />
        </>
    );
};

export default Faq;