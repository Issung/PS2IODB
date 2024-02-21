import { Link } from "react-router-dom";
import './TextPage.scss'
import Footer from "../components/Footer";

const Faq: React.FC = () => {
    return (
        <>
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

                            <h4>Is website official?</h4>
                            <p>
                                No, this website is fan-made. Contributions & uploads are made by fans.
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
                                        by how many unique icons the title has, some titles only have 1 icon, while others may have 2 or 3 for the copy/delete UI states.
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