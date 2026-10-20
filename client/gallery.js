// used claude for this. was helpful to learn about and use asynch, await, and try
const API_BASE = 'https://bedstuy-2125-virtual.onrender.com';

const params = new URLSearchParams(window.location.search);
const siteSlug = params.get('site');
const collection = siteSlug ? 'sites' : (params.get('collection') || 'all');
const highlightId = params.get('highlight');
const sharedId = params.get('r');

let items = [];
let currentIndex = null;
let lastFocusedElement = null;

// User-submitted text goes into the page, so escape it before building HTML.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function fromBuilding(building) {
    const where = building.site_name ? ` • ${building.site_name}` : '';
    return {
        kind: 'building',
        id: String(building.id),
        name: building.name,
        image: building.ai_image_url,
        description: building.ai_description,
        meta: `Submitted by ${building.user_name} from ${building.user_location} • ${new Date(building.created_at).toLocaleDateString()}${where}`,
    };
}

function fromPoster(poster) {
    return { kind: 'poster', id: null, name: poster.name, image: poster.src };
}

function markActiveFilters(sites) {
    document.querySelectorAll('.filter-pill[data-filter]').forEach(pill => {
        const active = pill.dataset.filter === collection;
        pill.classList.toggle('is-active', active);
        if (active) pill.setAttribute('aria-current', 'page');
    });

    if (collection !== 'sites') return;
    const sitePills = document.getElementById('site-pills');
    sitePills.innerHTML = sites.map(site => {
        const active = site.slug === siteSlug;
        return `<a class="filter-pill${active ? ' is-active' : ''}" ${active ? 'aria-current="page"' : ''}
            href="gallery.html?site=${encodeURIComponent(site.slug)}">${escapeHtml(site.name)}</a>`;
    }).join('');
    sitePills.hidden = sites.length === 0;

    const site = sites.find(s => s.slug === siteSlug);
    if (site) {
        document.getElementById('heading-line-1').textContent = site.name;
        document.getElementById('heading-line-2').textContent = 'Gallery';
        document.getElementById('site-cta-link').href = `/s/${encodeURIComponent(site.slug)}`;
        document.getElementById('site-cta').hidden = false;
    }
}

async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
    return response.json();
}

function renderCard(item, index) {
    const number = String(index + 1).padStart(2, '0');
    const card = document.createElement('article');
    card.classList.add('rendering-card');
    if (item.highlighted) card.classList.add('is-highlighted');

    const frame = item.kind === 'poster'
        ? `<div class="poster-frame"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`
        : `<div class="arch-frame"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`;

    card.innerHTML = `
      ${item.highlighted ? '<span class="eyebrow">Your rendering</span>' : ''}
      ${frame}
      <div class="card-caption-row">
        <span class="card-name">${escapeHtml(item.name)}</span>
        <span class="card-number">${number}</span>
      </div>
      ${item.description ? `<p class="card-ai-description">${escapeHtml(item.description)}</p>` : ''}
      ${item.meta ? `<p class="card-submitted">${escapeHtml(item.meta)}</p>` : ''}
    `;

    // Open the lightbox when this card's image is clicked
    card.querySelector('img').addEventListener('click', () => openLightbox(index));
    return card;
}

async function loadBuildings() {
    try {
      const needsSites = collection === 'sites';
      const sitesRequest = needsSites ? fetchJson('/sites').catch(() => []) : Promise.resolve([]);

      let list = [];
      if (collection === 'initial') {
          list = INITIAL_RENDERINGS.map(fromPoster);
      } else {
          const query = siteSlug ? `?site=${encodeURIComponent(siteSlug)}`
              : collection === 'community' ? '?collection=community'
              : collection === 'sites' ? '?collection=sites'
              : '';
          const buildings = await fetchJson(`/get-buildings${query}`);
          list = buildings.map(fromBuilding);
          if (collection === 'all') list = list.concat(INITIAL_RENDERINGS.map(fromPoster));
      }

      // A fresh submission goes to the front of the list.
      if (highlightId) {
          const found = list.findIndex(item => item.id === highlightId);
          if (found > -1) {
              const [item] = list.splice(found, 1);
              list.unshift({ ...item, highlighted: true });
          }
      }

      markActiveFilters(await sitesRequest);

      items = list;
      const container = document.getElementById('buildings-container');
      items.forEach((item, index) => container.appendChild(renderCard(item, index)));
      document.getElementById('gallery-empty').hidden = items.length > 0;

      if (highlightId) {
          const highlighted = container.querySelector('.is-highlighted');
          if (highlighted) highlighted.scrollIntoView({ block: 'center' });
      }

      if (sharedId) {
          const sharedIndex = items.findIndex(item => item.id === sharedId);
          if (sharedIndex > -1) openLightbox(sharedIndex);
      }

    } catch (error) {
        console.error('error:', error);
        document.getElementById('gallery-empty').textContent = "We couldn't load the gallery. Please refresh to try again.";
        document.getElementById('gallery-empty').hidden = false;
    }
}

// Lightbox controls
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxName = document.getElementById('lightbox-name');
const lightboxNumber = document.getElementById('lightbox-number');
const lightboxShare = document.getElementById('lightbox-share');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-arrow--prev');
const lightboxNext = document.querySelector('.lightbox-arrow--next');

function shareUrl(item) {
    return `${window.location.origin}/gallery.html?r=${encodeURIComponent(item.id)}`;
}

function renderLightbox(index) {
    const item = items[index];
    const number = String(index + 1).padStart(2, '0');
    lightboxImg.src = item.image;
    lightboxImg.alt = item.name;
    lightboxName.textContent = item.name;
    lightboxNumber.textContent = number;
    lightboxShare.hidden = !item.id;
    lightboxShare.textContent = 'Share';
}

function openLightbox(index) {
    currentIndex = index;
    lastFocusedElement = document.activeElement;
    renderLightbox(index);
    lightbox.classList.add('active');
    lightboxClose.focus();
}

function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
    currentIndex = null;
    if (lastFocusedElement) lastFocusedElement.focus();
}

function showPrev() {
    if (currentIndex === null || items.length === 0) return;
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    renderLightbox(currentIndex);
}

function showNext() {
    if (currentIndex === null || items.length === 0) return;
    currentIndex = (currentIndex + 1) % items.length;
    renderLightbox(currentIndex);
}

async function shareCurrent() {
    const item = items[currentIndex];
    if (!item || !item.id) return;
    const url = shareUrl(item);
    try {
        if (navigator.share) {
            await navigator.share({ title: `${item.name} · Bed-Stuy 2125`, url });
        } else {
            await navigator.clipboard.writeText(url);
            lightboxShare.textContent = 'Link copied';
        }
    } catch (error) {
        // The person closed the share sheet; nothing to do.
    }
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', showPrev);
lightboxNext.addEventListener('click', showNext);
lightboxShare.addEventListener('click', shareCurrent);

// Close when clicking the dark backdrop (but not the image or controls)
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

// Keyboard: Escape to close, arrow keys to navigate, Tab trapped inside the lightbox
document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
        closeLightbox();
        return;
    }

    if (e.key === 'ArrowLeft') {
        showPrev();
        return;
    }

    if (e.key === 'ArrowRight') {
        showNext();
        return;
    }

    if (e.key === 'Tab') {
        const focusable = [lightboxPrev, lightboxClose, lightboxShare, lightboxNext].filter(el => !el.hidden);
        const firstIndex = 0;
        const lastIndex = focusable.length - 1;
        const activeIndex = focusable.indexOf(document.activeElement);

        if (e.shiftKey && activeIndex === firstIndex) {
            e.preventDefault();
            focusable[lastIndex].focus();
        } else if (!e.shiftKey && activeIndex === lastIndex) {
            e.preventDefault();
            focusable[firstIndex].focus();
        }
    }
});

loadBuildings();
