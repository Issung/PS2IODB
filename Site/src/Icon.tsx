import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const Icon: React.FC = () => {
    // Get icon code from the url
    const { iconcode } = useParams();
    const [exists, setExists] = useState('...');
    const [body, setBody] = useState('');

    // On load...
    useEffect(() => {
        // The 'icons' folder goes inside the 'Site/public' folder.
        var url = `http://localhost:3000/icons/${iconcode}/manifest.json`;
        fetch(url)
            .then(response => {
                response
                    .text()
                    .then(text => {
                        if (text.startsWith('{')) {
                            // The silly React server will return the index on random paths and be a 200 so verify that the text doesn't start with the html prefix.
                            //setExists((response.status.toString()[0] == '2' && !text.startsWith('<!DOCTYPE html>')) ? 'exists!' : 'does not exist.');
                            setExists('exists!')
                            setBody(text);

                            var manifest = JSON.parse(text);
                            console.log(manifest);
                        }
                        else {
                            setExists('does not exist.')
                        }
                    });
            });

        fetch(url);
    }, []);

    return(
        <div>
            <p>'{iconcode}' {exists}</p>
            <br/>
            <p>{body}</p>
        </div>
    );
};

export default Icon;