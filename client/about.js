// Lightbox for the "Initial renderings" grid, mirroring gallery.js
let renderings = [];
let currentIndex = null;
let lastFocusedElement = null;

function initRenderingsLightbox() {
    const cards = document.querySelectorAll('#renderings-grid .rendering-card');

    renderings = Array.from(cards).map(card => ({
        src: card.querySelector('img').src,
        name: card.querySelector('.card-name').textContent,
        number: card.querySelector('.card-number').textContent,
    }));

    cards.forEach((card, index) => {
        card.querySelector('img').addEventListener('click', () => openLightbox(index));
    });
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
    const rendering = renderings[index];
    lightboxImg.src = rendering.src;
    lightboxImg.alt = rendering.name;
    lightboxName.textContent = rendering.name;
    lightboxNumber.textContent = rendering.number;
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
    if (currentIndex === null || renderings.length === 0) return;
    currentIndex = (currentIndex - 1 + renderings.length) % renderings.length;
    renderLightbox(currentIndex);
}

function showNext() {
    if (currentIndex === null || renderings.length === 0) return;
    currentIndex = (currentIndex + 1) % renderings.length;
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

initRenderingsLightbox();
