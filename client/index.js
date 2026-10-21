document.getElementById('home-button').addEventListener('click', function() {window.location.href = 'year.html';
});

// User-submitted text goes into the page, so escape it before building HTML.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

// Ask Cloudinary for a smaller, compressed copy for card-sized images.
function cardImageUrl(url) {
    return url && url.includes('res.cloudinary.com/') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_800/') : url;
}

// Gallery Loading on homeapage
async function loadHomeGallery() {
    const container = document.getElementById('home-gallery-container');
    const status = document.getElementById('home-gallery-status');

    try {
        const response = await fetch('https://bedstuy-2125-virtual.onrender.com/get-buildings');
        if (!response.ok) throw new Error(`get-buildings failed: ${response.status}`);
        const buildings = await response.json();

        // show only the 4 most recent buildings on the homepage
        const recentBuildings = buildings.slice(0, 4);

        container.innerHTML = '';
        recentBuildings.forEach(building => {
            const card = document.createElement('article');
            card.classList.add('rendering-card');

            card.innerHTML = `
                <div class="arch-frame">
                    <img src="${escapeHtml(cardImageUrl(building.ai_image_url))}" alt="${escapeHtml(building.name)}" onerror="this.style.display='none'">
                </div>
                <div class="card-caption-row card-caption-row--quiet">
                    <span class="card-name">${escapeHtml(building.name)}</span>
                </div>
                <p class="card-ai-description">${escapeHtml(building.ai_description)}</p>
                <p class="card-submitted">Submitted by ${escapeHtml(building.user_name)} • ${new Date(building.created_at).toLocaleDateString()}</p>
            `;
            container.appendChild(card);
        });
        status.hidden = true;

    } catch (error) {
        console.error('Error loading homepage gallery:', error);
        container.innerHTML = '';
        status.innerHTML = 'We couldn\'t load the latest renderings. <a href="gallery.html">Visit the gallery →</a>';
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

loadHomeGallery();