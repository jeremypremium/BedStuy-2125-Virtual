const API_BASE = 'https://bedstuy-2125-virtual.onrender.com';
const MAX_PHOTO_SIDE = 1600;

const form = document.getElementById('suggest-form');
const locationInput = document.getElementById('location');
const whyInput = document.getElementById('why');
const photoInput = document.getElementById('photo-input');
const photoButton = document.getElementById('photo-button');
const photoPreview = document.getElementById('photo-preview');
const photoThumb = document.getElementById('photo-thumb');
const photoConsent = document.getElementById('photo-consent');
const photoError = document.getElementById('photo-error');
const firstNameInput = document.getElementById('first-name');
const lastInitialInput = document.getElementById('last-initial');
const creditRow = document.getElementById('credit-row');
const creditPreview = document.getElementById('credit-preview');
const submitButton = document.getElementById('submit-button');
const submitError = document.getElementById('submit-error');

let photoDataUrl = null;

function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
}

whyInput.addEventListener('input', () => {
    document.getElementById('why-count').textContent = `${whyInput.value.length} / 600`;
});

function updateCredit() {
    const first = firstNameInput.value.trim();
    const initial = lastInitialInput.value.trim().toUpperCase();
    creditRow.hidden = !first;
    creditPreview.textContent = initial ? `${first} ${initial}.` : first;
}
firstNameInput.addEventListener('input', updateCredit);
lastInitialInput.addEventListener('input', updateCredit);

// Redrawing on a canvas shrinks the upload and drops GPS and other metadata.
async function toResizedJpeg(file) {
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function clearPhoto() {
    photoDataUrl = null;
    photoInput.value = '';
    photoThumb.src = '';
    photoConsent.checked = false;
    photoPreview.hidden = true;
    photoButton.hidden = false;
}

photoInput.addEventListener('change', async () => {
    photoError.hidden = true;
    const file = photoInput.files[0];
    if (!file) return;
    try {
        photoDataUrl = await toResizedJpeg(file);
        photoThumb.src = photoDataUrl;
        photoPreview.hidden = false;
        photoButton.hidden = true;
    } catch (error) {
        clearPhoto();
        showError(photoError, "We couldn't open that photo on this device. Try a different one, or a screenshot of it.");
    }
});

document.getElementById('photo-remove').addEventListener('click', () => {
    clearPhoto();
    photoInput.focus();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitError.hidden = true;
    document.getElementById('location-error').hidden = true;

    if (!locationInput.value.trim()) {
        document.getElementById('location-error').hidden = false;
        locationInput.focus();
        return;
    }
    if (photoDataUrl && !photoConsent.checked) {
        showError(photoError, 'Please check the box to confirm the photo is yours, or remove it.');
        photoConsent.focus();
        return;
    }

    const suggestion = {
        location: locationInput.value,
        current_use: document.getElementById('current-use').value,
        why: whyInput.value,
        first_name: firstNameInput.value,
        last_initial: lastInitialInput.value,
        credit_ok: !creditRow.hidden && document.getElementById('credit-ok').checked,
        website: document.getElementById('website').value,
        ...(photoDataUrl && { photo: photoDataUrl, photo_consent: photoConsent.checked }),
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    try {
        const response = await fetch(`${API_BASE}/suggest-site`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suggestion),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            showError(submitError, data.error || 'Something went wrong sending your suggestion. Please try again.');
            return;
        }
        document.getElementById('suggest-view').hidden = true;
        const thanks = document.getElementById('thanks-view');
        thanks.hidden = false;
        window.scrollTo(0, 0);
        thanks.focus();
    } catch (error) {
        showError(submitError, "We couldn't reach the server. Check your connection and try again.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send suggestion';
    }
});
