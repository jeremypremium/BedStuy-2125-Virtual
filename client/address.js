// passing data from page to page
document.getElementById('address-form').addEventListener('submit', function(e) {e.preventDefault();

    // Get all previous URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');

     // Get the current form input
    const address = document.getElementById('address-input').value;
    
    // Pass all data forward 
    window.location.href = `name.html?year=${year}&address=${address}`;
});