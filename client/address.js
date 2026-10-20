// passing data from page to page
const addressInput = document.getElementById('address-input');
const siteSlug = new URLSearchParams(window.location.search).get('site');

// Visits that start from a site page have the location fixed to that site.
if (siteSlug) {
    addressInput.readOnly = true;
    loadSite(siteSlug).then(site => {
        if (!site) return;
        addressInput.value = site.address;
        document.getElementById('address-note').hidden = false;
    });
}

document.getElementById('address-form').addEventListener('submit', function(e) {e.preventDefault();

    // Get all previous URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');

     // Get the current form input
    const address = addressInput.value;

    // Pass all data forward & Encode the data before putting in URL
    window.location.href = withSiteParam(`name.html?year=${encodeURIComponent(year)}&address=${encodeURIComponent(address)}`);
});
