// Shared by the site page and the survey pages that need to know which site a submission is for.
async function loadSite(slug) {
    const cacheKey = `bs2125-site:${slug}`;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (error) {
        // sessionStorage can be unavailable (private mode); fall through to the network.
    }

    const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    const site = await response.json();
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify(site));
    } catch (error) {
        // Not fatal; we'll just fetch again next time.
    }
    return site;
}

// Appends &site=<slug> to a survey URL when this visit started from a site.
function withSiteParam(url) {
    const site = new URLSearchParams(window.location.search).get('site');
    return site ? `${url}&site=${encodeURIComponent(site)}` : url;
}
