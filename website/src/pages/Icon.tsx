import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ModelView } from "../components/ModelView/ModelView";
import { ModelLoader } from "../components/ModelView/ModelLoader";
import { UrlModelLoader } from "../components/ModelView/UrlModelLoader";
import { Icon as IconModel } from "../model/Icon";
import { IconSys } from "../model/IconSys";
import { Titles } from "../model/Titles";
import { SessionStorageKeys } from '../utils/Consts';
import './Icon.scss';

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains a ModelView component that manages its own controls.
 * This page handles:
 * - Navigation (back button, keyboard shortcuts)
 * - Title and contributor display
 * - Download functionality
 */
const Icon = () => {
    const navigate = useNavigate();
    const { iconcode } = useParams();

    const [icon, setIcon] = useState<IconModel | undefined>();
    const title = useMemo(() => {
        if (icon) {
            return icon.title!.name == icon.name ? icon.name : `${icon.title!.name} (${icon.name})`
        }
        return '';
    }, [icon]);

    // Download state
    const [downloadStatus, setDownloadStatus] = useState<string>();

    // Loader state
    const [loader, setLoader] = useState<ModelLoader | undefined>();

    // Load icon metadata from Titles
    useEffect(() => {
        const foundIcon = Titles.flatMap(g => g.icons).find(i => i.code == iconcode);
        setIcon(foundIcon);
    }, [iconcode]);

    // Update document title
    useEffect(() => {
        if (icon) {
            document.title = title;
        }
    }, [icon, title]);

    // Keyboard navigation
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    function back() {
        if (sessionStorage.getItem(SessionStorageKeys.HasViewedHomePage) === "true") {
            navigate(-1);
        } else {
            navigate('/');
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' || event.key == 'Backspace') {
            back();
        }
    }

    // Download functionality
    async function download() {
        setDownloadStatus('Loading...');
        try {
            await downloadImpl();
            setDownloadStatus(undefined);
        } catch (e) {
            console.error(e);
            setDownloadStatus('Error. Check console.');
        }
    }

    async function downloadImpl() {
        // Fetch iconsys first to get variant names
        const iconsysResponse = await fetch(`/icons/${iconcode}/iconsys.json`);
        const iconsysText = await iconsysResponse.text();
        if (!iconsysText.startsWith('{')) {
            throw new Error('Failed to fetch iconsys.json');
        }
        const iconsys = JSON.parse(iconsysText) as IconSys;

        // Get all unique variants
        const variants = new Set([iconsys.normal, iconsys.copy, iconsys.delete]);
        const files: string[] = [];

        // Assets required for each variant
        variants.forEach(variant => {
            files.push(`${variant}.anim`);
            files.push(`${variant}.mtl`);
            files.push(`${variant}.obj`);
            files.push(`${variant}.png`);
        });
        files.push('iconsys.json');

        // Fetch all files in parallel
        const promises = files.map(async (file) => {
            const response = await fetch(`/icons/${iconcode}/${file}`);
            if (response.ok) {
                if (file.endsWith('.png') && response.headers.get('content-type') === 'image/png') {
                    const png = await response.blob();
                    return { file, content: png };
                } else {
                    const text = await response.text();
                    if (!text.startsWith('<!DOCTYPE html>')) {
                        return { file, content: text };
                    }
                }
                if (file.endsWith('.anim')) {
                    console.warn(`Error loading ${file}, it may not have an animation.`);
                } else {
                    console.error(`Error loading ${file}.`);
                }
            }
            return null;
        });
        const results = await Promise.allSettled(promises);

        // Create zip file
        const zip = new JSZip();
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                zip.file(result.value.file, result.value.content);
            }
        });
        const zipContent = await zip.generateAsync({ type: 'blob' });

        // Trigger download
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ps2iodb_${iconcode}.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }

    // Create loader for ModelView
    useEffect(() => {
        if (!iconcode) {
            setLoader(undefined);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const newLoader = await UrlModelLoader.create(iconcode);
                if (!cancelled) {
                    setLoader(newLoader);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to create loader:', error);
                    setLoader(undefined);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [iconcode]);

    return (
        <div id="icon">
            {/* Back link */}
            <a id="back" href="/" onClick={(e) => { e.preventDefault(); back(); }}>← Home</a>

            {/* Game title and contributor */}
            <div id="title">
                {icon ? (
                    <>
                        <h5>{title}</h5>
                        <h6>Contributed by {icon.contributor?.link ?
                            <Link to={`/browse/contributor/${icon.contributor.name}#browse`} title={`View all contributions from ${icon.contributor.name}`}>{icon.contributor!.name}</Link>
                        :
                            `${icon.contributor?.name}`
                        }</h6>
                    </>
                ) : (
                    "Game not found."
                )}
            </div>

            {loader && (
                <div className="model-view-fullscreen">
                    <ModelView
                        loader={loader}
                        onDownload={download}
                        downloadStatus={downloadStatus}
                    />
                </div>
            )}
        </div>
    );
};

export default Icon;