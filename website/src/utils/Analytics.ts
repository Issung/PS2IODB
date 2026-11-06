import ReactGA from "react-ga4";
import { MetricWithAttribution, onCLS, onINP, onLCP } from "web-vitals/attribution";

/**
 * Start Google Analytics and Core Web Vitals reporting once the page has loaded and the browser is idle,
 * so loading gtag doesn't compete with the site's own first render.
 * The web-vitals listeners use buffered performance entries, so starting late doesn't miss anything.
 */
export function startAnalyticsWhenIdle() {
    const start = () => {
        ReactGA.initialize("G-MTYRQV3C1G");
        onCLS(sendWebVital);
        onINP(sendWebVital);
        onLCP(sendWebVital);
    };

    // Safari doesn't support requestIdleCallback.
    const whenIdle = () => 'requestIdleCallback' in window ? requestIdleCallback(start) : setTimeout(start, 1);

    if (document.readyState === 'complete') {
        whenIdle();
    } else {
        window.addEventListener('load', whenIdle, { once: true });
    }
}

/**
 * Send a Core Web Vital to GA4 as an event named after the metric (CLS, INP, LCP), following
 * https://github.com/GoogleChrome/web-vitals#send-the-results-to-google-analytics.
 * `debug_target` is the selector of the element responsible (e.g. the one that shifted most for CLS).
 * To report on it in GA4 it needs registering as an event-scoped custom dimension.
 */
function sendWebVital(metric: MetricWithAttribution) {
    const target =
        metric.name === 'CLS' ? metric.attribution.largestShiftTarget :
        metric.name === 'INP' ? metric.attribution.interactionTarget :
        metric.name === 'LCP' ? metric.attribution.target :
        undefined;

    ReactGA.event(metric.name, {
        // GA4 event values must be integers, CLS is a small decimal so scale it up.
        value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
        debug_target: target ?? '(not set)',
        non_interaction: true,
    });
}
