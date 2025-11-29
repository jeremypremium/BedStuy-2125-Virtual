// passing data from page to page
document.getElementById('submission-form').addEventListener('submit', async function(e) {
  e.preventDefault();
    
  // Get the URL parameters from all previous pages
  const urlParams = new URLSearchParams(window.location.search);
  const year = urlParams.get('year');
  const address = urlParams.get('address');
  const name = urlParams.get('name');
  const describe = urlParams.get('describe');
  const vibe = urlParams.get('vibe');

  // Get the user info from this final form
  const userName = document.getElementById('user-name').value;
  const userLocation = document.getElementById('user-location').value;

  // Combine everything into one object to send to the server
  const buildingData = {
    year: year,
    address: address,
    name: name,
    describe: describe,
    vibe: vibe,
    user_name: userName,
    user_location: userLocation
  };

  try {
    // post to server
    const response = await fetch('https://bedstuy-2125-virtual.onrender.com/submit-building', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(buildingData)
    });

    const data = await response.json();
    console.log('success!', data);

    // redirect to library
    window.location.href = 'gallery.html'; 
  } catch (error) {
    console.error('Error submitting building:', error);
    alert('Something went wrong! Please try again.');
  }
}); 