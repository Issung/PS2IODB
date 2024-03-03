import { Link } from 'react-router-dom';
import './Footer.scss';

interface FooterProps {
    /** Additional class names, defaults to "col". Use to make footer row match content column for different pages. */
    className?: string;
}

const Footer = (props: FooterProps) => {
    return (
        <div id="Footer" className="container-fluid">
            <div className="container">
                <div className="row justify-content-center">
                    <div className={props.className ?? "col"}>
                        <Link to="/" title="Home">PlayStation2™ Icons Open Database</Link>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default Footer;