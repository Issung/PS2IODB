import { ContributedIcons } from '../../src/model/Titles';

const iconsByCode = new Map(ContributedIcons.map(icon => [icon.code!, icon]));

/**
 * Cloudflare Pages Function for /icon/:code.
 * Link preview crawlers (Discord, Slack, X, iMessage etc.) don't run JavaScript, so without this every shared icon link previews
 * as the generic site. This serves the same index.html, with the icon's name filled into the title & preview meta tags.
 * Only /icon/* runs this function, everything else is served as plain static assets.
 */
export const onRequestGet: PagesFunction<{ ASSETS: Fetcher }> = async ({ request, params, env }) => {
    // "/" rather than "/index.html", Pages redirects the latter.
    const page = await env.ASSETS.fetch(new URL('/', request.url));

    const icon = iconsByCode.get(String(params.code));
    if (!icon) {
        return page;
    }

    // Same format as the document title set by the Icon page.
    const title = icon.name !== icon.title.name ? `${icon.title.name} (${icon.name})` : icon.title.name;
    const contributors = new Intl.ListFormat('en').format(icon.contributors.map(c => c.name));
    const description = `View the memory card icon for ${title} in 3D on PS2IODB, the PlayStation 2 Icon Open Database. Contributed by ${contributors}.`;

    return new HTMLRewriter()
        .on('title', { element: e => { e.setInnerContent(title); } })
        .on('meta[property="og:title"]', { element: e => { e.setAttribute('content', title); } })
        .on('meta[name="description"], meta[property="og:description"]', { element: e => { e.setAttribute('content', description); } })
        .transform(page);
};
