import { Link } from "react-router-dom";
import './Contribute.scss';
import './TextPage.scss'
import Footer from "../components/Footer";

const Contribute = () => {
    return (
        <>
            <title>Contribute</title>
            <div id="Contribute">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xl-8">
                            <Link to="/">← Home</Link>
                            <h1>PS2 Icon Open Database</h1>
                            <h2>How to Contribute</h2>
                            <hr/>
                            <a id="donate" href="#donate">
                                <h3>Donate</h3>
                            </a>
                            <p>
                                If you wish to help the site but don't have the technology or technical know-how to contribute icons then donations are welcome.<br/>
                                The site & tools take time to maintain and hosting isn't free. Just a few dollars goes a long way.<br/>
                                <a target="_blank" href="https://ko-fi.com/issung" className="btn btn-primary">Ko-fi</a>
                                <a target="_blank" href="https://www.paypal.com/paypalme/Issung" className="btn btn-primary">PayPal</a>
                                <a target="_blank" href="https://github.com/sponsors/Issung" className="btn btn-primary">GitHub Sponsor</a>
                            </p>
                            
                            <hr/>

                            <a id="downloadextractor" href="#downloadextractor">
                                <h4>PS2IODB Extractor</h4>
                            </a>
                            <p>The PS2IODB Extractor tool can be accessed at <Link to="/extractor">ps2iodb.com/extractor</Link>. It has all the functionality you need to extract save icon assets to be able to contribute them to the site.</p>
                            <details>
                                <summary>Previous Versions</summary>
                                <p>
                                    <p>Previously the tool was a desktop application built with Python. It only really worked (not very well) on Windows.</p>
                                    <p>
                                        Still, the previous versions are useful to test for regressions in functionality such as icons exports no longer working.<br/>
                                        Please report regressions via GitHub or in Discord.
                                    </p>
                                </p>
                                <ul>
                                    <li>
                                        Version 0.1.3:
                                        <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1.3/PS2IODB.Extractor.v0.1.3.Windows.exe">Windows</a>
                                        -
                                        <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1.3/PS2IODB.Extractor.v0.1.3.Linux.zip">Linux</a>
                                    </li>
                                    <li>
                                        Version 0.1.2: 
                                        <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1.2/PS2IODB.Extractor.v0.1.2.exe">Windows</a>
                                         - 
                                        <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1.2-linux-beta/PS2IODB-Extractor.zip">Linux</a>
                                    </li>
                                    <li>
                                        Version 0.1.1: <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1.1/MYMC++.v0.1.1.exe">Windows</a>
                                    </li>
                                    <li>
                                        Version 0.1: <a href="https://github.com/Issung/PS2IODB-Extractor-Releases/releases/download/v0.1/MYMC++.v0.1.exe">Windows</a>
                                    </li>
                                </ul>
                            </details>

                            <hr/>

                            <a id="contributingicons" href="#contributingicons">
                                <h3>Contributing Icons</h3>
                            </a>
                            <p>This guide details how to extract save icons from save games, either with pre-made save files or by creating a save manually.</p>

                            <a id="iconextractionexisting" href="#iconextractionexisting">
                                <h4>Icon Extraction: Pre-existing Save Files</h4>
                            </a>
                            <p>Around the internet many pre-existing save files are shared on forums such as:</p>
                            <ul>
                                <li><a target="_blank" href="https://gamefaqs.gamespot.com/">GameFAQs</a></li>
                                <li><a target="_blank" href="https://www.ps2-home.com/forum/viewforum.php?f=70">PS2-Home</a></li>
                                <li><a target="_blank" href="https://www.thetechgame.com/Downloads/cid=310/playstation-2-game-saves.html">The Tech Game</a></li>
                                <li>Other various sources found via <a target="_blank" href="https://www.google.com/search?q=ps2+game+save+files">Google search</a></li>
                            </ul>
                            <p>The PS2IODB Extractor tool can be used to import these save files and then icon assets can be extracted easily. Steps:</p>
                            <ol>
                                <li>Download the pre-existing save file.</li>
                                <li>Open PS2IODB Extractor and create a new memory card or open an existing one.</li>
                                <li>Import the downloaded save file(s) by either:</li>
                                <ul>
                                    <li>Going to File → Import and navigate to the downloaded save file(s).</li>
                                    <li>Dragging & Dropping the downloaded save file(s) onto the PS2IODB Extractor window.</li>
                                </ul>
                                <li>Once importing is complete right click on game you wish to export icon assets from.</li>
                                <li>Enter a name for a new folder for the exported assets to be grouped under.</li>
                                <li>Go to the PS2IODB Extractor directory and find the icon_exports folder, your exported assets will be within.</li>
                            </ol>
                            <p>A short video of the process can be viewed here:</p>
                            <iframe 
                                width="560" 
                                height="315" 
                                src="https://www.youtube.com/embed/wbZ59tpBIZ4?si=12EvAUgmiDxooeNd" 
                                title="YouTube video player" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                                style={{marginBottom: '15px'}}>
                            </iframe>

                            <a id="iconextractionmanual" href="#iconextractionmanual">
                                <h4>Icon Extraction: Manually Creating Saves with PCSX2</h4>
                            </a>
                            <p>For some less popular games pre-existing save files may not exist on the internet, in this case you need to emulate the game to create a save file manually, then extract icon assets from that file. Steps: </p>
                            <ol>
                                <li>Using PCSX2 play the title you desire to extract save icons from up until a point where save data is created on a memory card.</li>
                                <li>Open PS2IODB Extractor and open the desired memory card, the typical location is <code>%UserProfile%\Documents\PCSX2\memcards</code>.</li>
                                <li>Find the desired title, right click it and chose the <i>Export Icons</i> option, enter a name for a new folder for all assets to be grouped under.</li>
                                <li>Go to the PS2IODB Extractor directory and find the icon_exports folder, your exported assets will be within.</li>
                            </ol>

                            <a id="uploading" href="#uploading">
                                <h4>Uploading Contributions</h4>
                            </a>
                            <p>Now that you have extracted icon assets from a memory card using the previous guides, you can now send the icons to be uploaded to the site.</p>
                            <ul>
                                <li>Most people upload their contributions to the <code>#icon-uploads</code> channel in the <a target="_blank" href="https://discord.gg/SWsuNvWnKw">PS2IODB Discord server</a>.</li>
                                <li>If you don't want to join the Discord just send your icons zip to Issung via E-Mail at <a href="mailto:issun@sonofgoran.com">issun@sonofgoran.com</a>.</li>
                            </ul>

                            <a id="guidelines" href="#guidelines">
                                <h4>Contribution Guidelines</h4>
                            </a>
                            <ul>
                                <li>Make sure to save your time by not uploading things that are already contributed / do not need re-contributing.</li>
                                <li>The PS2 library is massive and many games have regional differences please title each icon clearly, or add a note explaining things.</li>
                                <li>For games that have multiple icons it is useful to know what conditions cause each case. If you don't know that's OK, just let us know, and hopefully someone later will inform us.</li>
                                <li>Some icons are known to have issues exporting, these are useful to have for improving the extractor tool. Please send the PS2 memcard file either in the <code>#broken-icons</code> channel in the Discord or E-Mail to Issung.</li>
                                <li>If it is your first time contributing let us know what name you want to be credited as, and if you want us to link your name to any social media / website!</li>
                                <li>Name icons with URL slug appropriate names following existing patterns to help Issung (the admin) add contributions easily.</li>
                            </ul>

                            <h5>Slug Examples</h5>
                            <p>
                                The <i>slug</i> is is part of the URL to navigate to a specific icon, for example: <a href="https://ps2iodb.com/icon/devilmaycry3" target="_blank">ps2iodb.com/icon/devilmaycry3</a>.
                            </p>
                            <p>
                                The site admin has to add all icons to the index by hand, so well-named (informative an matching existing patterns) help optimise this process.
                            </p>

                            <p>Look at existing icons on the site for inspiration. Here are some examples:</p>
                            <ul className="slug-examples">
                                <li><code>finalfantasyx</code></li>
                                <li><code>tekken5</code></li>
                                <li>
                                    Some titles have different icons for different regions:
                                    <ul>
                                        <li><code>taikodrummaster-jp</code></li>
                                        <li><code>taikodrummaster-na</code></li>
                                    </ul>
                                </li>
                                <li>
                                    Some titles have different icons for different revisions:
                                    <ul>
                                        <li><code>dragonballzbudokai3</code></li>
                                        <li><code>dragonballzbudokai3-grestesthitsversion</code></li>
                                    </ul>
                                </li>
                                <li>
                                    Some titles have different icons for different conditions:
                                    <ul>
                                        <li><code>ghirensambitionaxis-earthcampaign</code></li>
                                        <li><code>ghirensambitionaxis-zeoncampaign</code></li>
                                    </ul>
                                </li>
                                <li>
                                    Some titles separate data for profiles,  settings or different modes like so:
                                    <ul>
                                        <li><code>xg3extremegracing-savedata</code></li>
                                        <li><code>xg3extremegracing-settings</code></li>
                                    </ul>
                                </li>
                            </ul>

                            <p className="help-note">
                                The entire index (all titles & slugs) can be viewed <a target="_blank" href="https://github.com/Issung/PS2IODB/blob/main/website/src/model/Titles.ts">here</a>.
                            </p>


                            {/*<a id="iconuploading" href="#iconuploading">
                                <h4>Icon Uploading: GitHub PR</h4>
                            </a>
                            <p>Now that you have extracted icon assets from a memory card using the previous guides, this is the step where you contribute the assets to the PS2IODB.</p>
                            <p>When uploading an icon the Git flow looks like this:</p>
                            <img src="http://placekitten.com/300/200" alt="Git contribution diagram"/> {// TODO: Add legit diagram showing fork to pull request flow.
                            <br/>
                            <br/>

                            <p>The steps are as follows:</p>
                            <ol>
                                <li>Create a fork of the GitHub repository.</li> // TODO: Link to the repository with the correct URL.
                                <li>Clone your forked repository to your machine.</li>
                                <li>Copy the exported icon folder to the /////// folder, where the rest are.</li>  // TODO: Put correct folder name.
                                <li>In <code>GameList.tsx</code> find the title you are contributing, add a string parameter of the folder name you just added, and a number for the unique amount of icons.</li> // TODO: Give path for the file.
                                <li>With your Git client stage your changes and make a commit with a helpful message, then push.</li>
                                <li>Now you can create a pull request to merge the changes in your fork with the official repo.</li> // TODO: 'Create PR' in repo link.
                                <li>After this is done the maintainers will inspect your changes and possibly request fixes or just accept them straight away.</li>
                                <li>That's all you need to do! Thank you for contributing!</li>
                            </ol>*/}
                        </div>
                    </div>
                </div>
            </div>
            <Footer className="col-xl-8" />
        </>
    );
};

export default Contribute;
