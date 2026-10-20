// used claude for this. was helpful to learn about and use asynch, await, and try
let buildings = [];
let currentIndex = null;
let lastFocusedElement = null;

async function loadBuildings() {
    try {
      const response = await fetch ('https://bedstuy-2125-virtual.onrender.com/get-buildings');
      buildings = await response.json();
      const container = document.getElementById('buildings-container');

      buildings.forEach((building, index) => {
        const card = document.createElement('article');
        card.classList.add('rendering-card');

        const number = String(index + 1).padStart(2, '0');

        card.innerHTML = `
          <div class="arch-frame">
            <img src="${building.ai_image_url}" alt="${building.name}">
          </div>
          <div class="card-caption-row">
            <span class="card-name">${building.name}</span>
            <span class="card-number">${number}</span>
          </div>
          <p class="card-ai-description">${building.ai_description}</p>
          <p class="card-submitted">Submitted by ${building.user_name} from ${building.user_location} • ${new Date(building.created_at).toLocaleDateString()}</p>
        `;

        container.appendChild(card);

        // Open the lightbox when this card's image is clicked
        const cardImg = card.querySelector('img');
        cardImg.addEventListener('click', () => openLightbox(index));
      });

    } catch (error) {
        console.error('error:', error);
    }
}

// Lightbox controls
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxName = document.getElementById('lightbox-name');
const lightboxNumber = document.getElementById('lightbox-number');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-arrow--prev');
const lightboxNext = document.querySelector('.lightbox-arrow--next');

function renderLightbox(index) {
    const building = buildings[index];
    const number = String(index + 1).padStart(2, '0');
    lightboxImg.src = building.ai_image_url;
    lightboxImg.alt = building.name;
    lightboxName.textContent = building.name;
    lightboxNumber.textContent = number;
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
    if (currentIndex === null || buildings.length === 0) return;
    currentIndex = (currentIndex - 1 + buildings.length) % buildings.length;
    renderLightbox(currentIndex);
}

function showNext() {
    if (currentIndex === null || buildings.length === 0) return;
    currentIndex = (currentIndex + 1) % buildings.length;
    renderLightbox(currentIndex);
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', showPrev);
lightboxNext.addEventListener('click', showNext);

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
        const focusable = [lightboxPrev, lightboxClose, lightboxNext];
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
