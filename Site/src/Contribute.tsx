import { Link } from "react-router-dom";
import './Contribute.scss';

const Contribute: React.FC = () => {
    return (
        <div id="Contribute">
            <div className="container-fluid" style={{ height: "100vh", maxHeight: 800 }}>
                <div className="row">
                    <div className="col">
                        <h1>PS2 Icon Open Database</h1>
                        <h2>How to Contribute</h2>
                        <hr/>
                        <h3>Donate</h3>
                        <p>
                            If you wish to help the site but don't have the technology or technical know-how to contribute icons then donations are welcome.<br/>
                            The site & tools take time to maintain and hosting isn't free. Just a few dollars goes a long way, thanks for reading.<br/>
                            <Link to="#" className="btn btn-primary">Ko-Fi</Link>
                            <Link to="#" className="btn btn-primary">PayPal</Link>
                            <Link to="#" className="btn btn-primary">GitHub Sponsor</Link>
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
                            <li><Link to="https://www.thetechgame.com/Downloads/cid=310/playstation-2-game-saves.html">PS2-Home</Link></li>
                            <li>Other various sources found via <Link to="https://www.google.com/search?q=ps2+game+save+files">Google search</Link></li>
                        </ul>
                        <p>Our tool MYMC++ can be used to import these save files and then icon assets can be extracted easily. Steps:</p>
                        <ol>
                            <li>Download MYMC++ tool.</li>
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

                        <a id="iconextractionmanual" href="#iconextractionmanual">
                            <h4>Icon Extraction: Manually Creating Saves with PCSX2</h4>
                        </a>
                        <p>For some less popular games pre-existing save files may not exist on the internet, in this case you need to emulate the game to create a save file manually, then extract icon assets from that file. Steps: </p>
                        <ol>
                            <li>Download MYMC++ tool.</li>
                        </ol>

                        <a id="iconuploading" href="#iconuploading">
                            <h4>Icon Uploading: GitHub PR</h4>
                        </a>
                        <p>Now that you have extracted icon assets from a memory card using the previous guides, this is the step where you contribute the assets to the PS2IODB.</p>
                        <ol>
                            <li>Create a fork of the GitHub repository.</li>
                        </ol>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contribute;
