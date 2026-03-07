import JSZip from "jszip";
import { IconDice5 } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ModelLoader } from "../components/ModelView/ModelLoader";
import { ModelView } from "../components/ModelView/ModelView";
import { UrlModelLoader } from "../components/ModelView/UrlModelLoader";
import { Icon as IconModel } from "../model/Icon";
import { IconSys } from "../model/IconSys";
import { Titles } from "../model/Titles";
import { navigateToRandomIcon } from "../utils/RandomIcon";
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
    const titleName = icon?.title?.name ?? '';
    const iconName = icon?.name ?? '';
    const showIconName = icon && iconName !== titleName;

    // Download state
    const [downloadStatus, setDownloadStatus] = useState<string>();

    // Loader state
    const [loader, setLoader] = useState<ModelLoader | undefined>();

    // Header collapse detection
    const [isCollapsed, setIsCollapsed] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLAnchorElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);

    const checkOverlap = useCallback(() => {
        if (!headerRef.current || !titleRef.current) return;

        // Temporarily remove collapsed class to measure uncollapsed dimensions
        const wasCollapsed = headerRef.current.classList.contains('collapsed');
        if (wasCollapsed) {
            headerRef.current.classList.remove('collapsed');
        }

        const headerWidth = headerRef.current.offsetWidth;
        const backWidth = backRef.current?.offsetWidth ?? 0;
        const titleWidth = titleRef.current.offsetWidth;
        const rightPanelWidth = rightPanelRef.current?.offsetWidth ?? 0;

        // Restore collapsed class if it was present
        if (wasCollapsed) {
            headerRef.current.classList.add('collapsed');
        }

        // Calculate if elements would overlap when positioned absolutely
        // Title is centered, so it takes up space from center - half width to center + half width
        const titleLeft = (headerWidth / 2) - (titleWidth / 2);
        const titleRight = (headerWidth / 2) + (titleWidth / 2);

        // Check if back button overlaps title, or right panel overlaps title
        const backOverlaps = backWidth > titleLeft;
        const rightPanelOverlaps = (headerWidth - rightPanelWidth) < titleRight;

        setIsCollapsed(backOverlaps || rightPanelOverlaps);
    }, []);

    useEffect(() => {
        checkOverlap();

        const resizeObserver = new ResizeObserver(checkOverlap);
        if (headerRef.current) resizeObserver.observe(headerRef.current);
        if (titleRef.current) resizeObserver.observe(titleRef.current);
        if (rightPanelRef.current) resizeObserver.observe(rightPanelRef.current);

        window.addEventListener('resize', checkOverlap);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', checkOverlap);
        };
    }, [checkOverlap, icon]);

    // Load icon metadata from Titles
    useEffect(() => {
        const foundIcon = Titles.flatMap(g => g.icons ?? []).find(i => i.code == iconcode);
        setIcon(foundIcon);
    }, [iconcode]);

    // Update document title
    useEffect(() => {
        if (icon) {
            document.title = showIconName ? `${titleName} (${iconName})` : titleName;
        }
    }, [icon, titleName, iconName, showIconName]);

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
        // Fetch iconsys first to get state names
        const iconsysResponse = await fetch(`/icons/${iconcode}/iconsys.json`);
        const iconsysText = await iconsysResponse.text();
        if (!iconsysText.startsWith('{')) {
            throw new Error('Failed to fetch iconsys.json');
        }
        const iconsys = JSON.parse(iconsysText) as IconSys;

        // Get all unique states
        const states = new Set([iconsys.normal, iconsys.copy, iconsys.delete]);
        const files: string[] = [];

        // Assets required for each state
        states.forEach(state => {
            files.push(`${state}.anim`);
            files.push(`${state}.mtl`);
            files.push(`${state}.obj`);
            files.push(`${state}.png`);
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
            {/* Header with back link, title, and contributor */}
            <div id="header" ref={headerRef} className={isCollapsed ? 'collapsed' : ''}>
                {/* Back link */}
                <a id="back" ref={backRef} href="/" onClick={(e) => { e.preventDefault(); back(); }}>← Home</a>

                {/* Game title and icon name */}
                <div id="title" ref={titleRef}>
                    {icon ? (
                        <>
                            <h5><i>{titleName}</i></h5>
                            {showIconName && <span className="icon-name"><span>Variant;</span> {iconName}</span>}
                        </>
                    ) : (
                        "Game not found."
                    )}
                </div>

                {/* Right panel: contributor + random button */}
                <div id="right-panel" ref={rightPanelRef}>
                    {icon && (
                        <div id="contributor">
                            <span>Contributed by {icon.contributors.map((contributor, index) => (
                                <span key={contributor.name}>
                                    {index > 0 && (index === icon.contributors.length - 1 ? ' & ' : ', ')}
                                    <Link to={`/browse/contributor/${contributor.name}#browse`} title={`View all contributions from ${contributor.name}`}>{contributor.name}</Link>
                                </span>
                            ))}</span>
                        </div>
                    )}
                    <button id="random-btn" onClick={() => navigateToRandomIcon(navigate)} title="View a random contributed icon">
                        <IconDice5 size={18} /> Random
                    </button>
                </div>
            </div>

            {loader && (
                <div className="model-view-fullscreen">
                    <ModelView
                        loader={loader}
                        onDownload={download}
                        downloadStatus={downloadStatus}
                        fullscreen={true}
                        isStaticAnimation={icon?.animationVersion === null}
                    />
                </div>
            )}
        </div>
    );
};

export default Icon;