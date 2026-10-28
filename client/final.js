// passing data from page to page
const ANSWERS_KEY = 'bs2125-answers';
const REQUEST_TIMEOUT_MS = 300000;

const urlParams = new URLSearchParams(window.location.search);
const siteSlug = urlParams.get('site');

const submissionStep = document.getElementById('submission-step');
const loader = document.getElementById('loader');
const loaderSteps = loader.querySelectorAll('.step');
const errorBox = document.getElementById('submit-error');
const errorMessage = document.getElementById('submit-error-message');

let stageTimers = [];
let lastSubmission = null;

// Bring back the name/location fields if the person reloads after a failure.
try {
  const saved = JSON.parse(sessionStorage.getItem(ANSWERS_KEY) || 'null');
  if (saved) {
    document.getElementById('user-name').value = saved.user_name || '';
    document.getElementById('user-location').value = saved.user_location || '';
  }
} catch (error) {
  // Nothing saved yet.
}

if (!siteSlug) {
  document.getElementById('loader-stage-2').textContent = '02 · Building it';
}

function setStage(stage) {
  loaderSteps.forEach(step => step.classList.toggle('is-filled', Number(step.dataset.stage) <= stage));
}

function showLoader() {
  submissionStep.hidden = true;
  errorBox.hidden = true;
  loader.hidden = false;
  setStage(1);
  stageTimers = [setTimeout(() => setStage(2), 6000), setTimeout(() => setStage(3), 18000)];
}

function showError(message) {
  stageTimers.forEach(clearTimeout);
  loader.hidden = true;
  submissionStep.hidden = false;
  errorMessage.textContent = message;
  errorBox.hidden = false;
  errorBox.scrollIntoView({ block: 'start' });
}

async function submitBuilding(buildingData) {
  lastSubmission = buildingData;
  showLoader();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // post to server
    const response = await fetch(`${API_BASE}/submit-building`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildingData),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showError(data.error || 'Something went wrong while building your rendering.');
      return;
    }

    stageTimers.forEach(clearTimeout);
    setStage(3);
    sessionStorage.removeItem(ANSWERS_KEY);

    // redirect to the gallery with the new rendering first
    const target = data.site_slug
      ? `gallery.html?site=${encodeURIComponent(data.site_slug)}&highlight=${data.id}`
      : `gallery.html?highlight=${data.id}`;
    setTimeout(() => { window.location.href = target; }, 600);
  } catch (error) {
    console.error('Error submitting building:', error);
    showError(error.name === 'AbortError'
      ? 'This is taking longer than usual. Give it another try.'
      : "We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

document.getElementById('submission-form').addEventListener('submit', function(e) {
  e.preventDefault();

  // Combine everything into one object to send to the server
  const buildingData = {
    year: urlParams.get('year'),
    address: urlParams.get('address'),
    name: urlParams.get('name'),
    describe: urlParams.get('describe'),
    vibe: urlParams.get('vibe'),
    user_name: document.getElementById('user-name').value,
    user_location: document.getElementById('user-location').value,
    ...(siteSlug && { site: siteSlug })
  };

  try {
    sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(buildingData));
  } catch (error) {
    // The answers are still in the URL, so this is only a backup.
  }

  submitBuilding(buildingData);
});

document.getElementById('retry-button').addEventListener('click', () => {
  if (lastSubmission) submitBuilding(lastSubmission);
});
