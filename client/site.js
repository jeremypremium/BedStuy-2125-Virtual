// The slug comes from /s/<slug> (Render rewrites that path to this page) or ?site=<slug>.
const pathMatch = window.location.pathname.match(/^\/s\/([^/]+)/);
const slug = pathMatch ? decodeURIComponent(pathMatch[1]) : new URLSearchParams(window.location.search).get('site');

async function showSite() {
    const site = slug ? await loadSite(slug).catch(() => null) : null;

    if (!site) {
        document.getElementById('site-missing').hidden = false;
        return;
    }

    document.title = `${site.name} · Bed-Stuy 2125`;
    document.getElementById('site-name').textContent = site.name;
    document.getElementById('site-address').textContent = site.address;

    const photo = document.getElementById('site-photo');
    photo.src = site.photo_url;
    photo.alt = `${site.name} as it looks today`;

    const siteParam = encodeURIComponent(site.slug);
    document.getElementById('start-link').href = `/year.html?site=${siteParam}`;
    document.getElementById('site-gallery-link').href = `/gallery.html?site=${siteParam}`;
    document.getElementById('site-content').hidden = false;
}

showSite();
