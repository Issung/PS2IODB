import { Link } from "react-router-dom";
import './Contribute.scss';
import './TextPage.scss'
import Footer from "../components/Footer";

const Contribute: React.FC = () => {
    return (
        <>
            <div id="Contribute">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xl-8">
                            <Link to="/">← Home</Link>
                            <h1>PS2 Icon Open Database</h1>
                            <h2>How to Contribute</h2>
                            <hr/>
                            <h3>Donate</h3>
                            <p>
                                If you wish to help the site but don't have the technology or technical know-how to contribute icons then donations are welcome.<br/>
                                The site & tools take time to maintain and hosting isn't free. Just a few dollars goes a long way, thanks for reading.<br/>
                                {/* TODO: Add proper links / widgets. */}
                                <Link to="https://ko-fi.com/issung" target="_blank" className="btn btn-primary">Ko-fi</Link>
                                <Link to="https://www.paypal.com/paypalme/Issung" target="_blank" className="btn btn-primary">PayPal</Link>
                                <Link to="https://github.com/sponsors/Issung" target="_blank" className="btn btn-primary">GitHub Sponsor</Link>
                            </p>
                            <hr/>
                            <h3>Contributing Icons</h3>
                            <p>This guide details how to extract save icons from save games, either with pre-made save files or by creating a save manually.</p>

                            <a id="iconextractionexisting" href="#iconextractionexisting">
                                <h4>Icon Extraction: Pre-existing Save Files</h4>
                            </a>
                            <p>Around the internet many pre-existing save files are shared on forums such as:</p>
                            <ul>
                                <li><Link to="https://gamefaqs.gamespot.com/">GameFAQs</Link></li>
                                <li><Link to="https://www.ps2-home.com/forum/viewforum.php?f=70">PS2-Home</Link></li>
                                <li><Link to="https://www.thetechgame.com/Downloads/cid=310/playstation-2-game-saves.html">The Tech Game</Link></li>
                                <li>Other various sources found via <Link to="https://www.google.com/search?q=ps2+game+save+files">Google search</Link></li>
                            </ul>
                            <p>Our MYMC++ tool can be used to import these save files and then icon assets can be extracted easily. Steps:</p>
                            <ol>
                                <li><Link to="https://mega.nz/file/gUMinaCS#c9eu8cAxM22MwWWK6T8Ofzi2tSI-crj3jEeFo2m72Cs" target="_blank">Download MYMC++</Link> tool.</li>
                                <li>Download the pre-existing save file.</li>
                                <li>Open MYMC++ and create a new memory card or open an existing one.</li>
                                <li>
                                    Import the downloaded save file(s) by either:
                                </li>
                                <ul>
                                    <li>Going to File → Import and navigate to the downloaded save file(s).</li>
                                    <li>Dragging & Dropping the downloaded save file(s) onto the MYMC++ window.</li>
                                </ul>
                                <li>Once importing is complete right click on game you wish to export icon assets from.</li>
                                <li>Enter a name for a new folder for the exported assets to be grouped under.</li>
                                <li>Go to the MYMC++ directory and find the icon_exports folder, your exported assets will be within.</li>
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
                                <li>Open <Link to="https://mega.nz/file/gUMinaCS#c9eu8cAxM22MwWWK6T8Ofzi2tSI-crj3jEeFo2m72Cs" target="_blank">the MYMC++ tool</Link> and open the desired memory card, the typical location is <code>%UserProfile%\Documents\PCSX2\memcards</code>.</li>
                                <li>Find the desired title, right click it and chose the <i>Export Icons</i> option, enter a name for a new folder for all assets to be grouped under.</li>
                                <li>Go to the MYMC++ directory and find the icon_exports folder, your exported assets will be within.</li>
                            </ol>

                            <a id="iconuploading" href="#iconuploading">
                                <h4>Icon Uploading: GitHub PR</h4>
                            </a>
                            <p>Now that you have extracted icon assets from a memory card using the previous guides, this is the step where you contribute the assets to the PS2IODB.</p>
                            <p>When uploading an icon the Git flow looks like this:</p>
                            <img src="http://placekitten.com/300/200" alt="Git contribution diagram"/> {/* TODO: Add legit diagram showing fork to pull request flow. */}
                            <br/>
                            <br/>

                            <p>The steps are as follows:</p>
                            <ol>
                                <li>Create a fork of the GitHub repository.</li> {/* TODO: Link to the repository with the correct URL. */}
                                <li>Clone your forked repository to your machine.</li>
                                <li>Copy the exported icon folder to the /////// folder, where the rest are.</li>  {/* TODO: Put correct folder name. */}
                                <li>In <code>GameList.tsx</code> find the title you are contributing, add a string parameter of the folder name you just added, and a number for the unique amount of icons.</li> {/* TODO: Give path for the file. */}
                                <li>With your Git client stage your changes and make a commit with a helpful message, then push.</li>
                                <li>Now you can create a pull request to merge the changes in your fork with the official repo.</li> {/* TODO: 'Create PR' in repo link. */}
                                <li>After this is done the maintainers will inspect your changes and possibly request fixes or just accept them straight away.</li>
                                <li>That's all you need to do! Thank you for contributing!</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            <Footer className="col-xl-8" />
        </>
    );
};

export default Contribute;
