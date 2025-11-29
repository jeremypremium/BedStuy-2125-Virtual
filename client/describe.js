// passing data from page to page
document.getElementById('describe-form').addEventListener('submit', function(e) {e.preventDefault();
    
   // Get all previous URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const address = urlParams.get('address');
    const name = urlParams.get('name');

    // Get the current form input
    const describe = document.getElementById('describe-input').value;
   
    // Pass all data forward & encode the data before putting in URL
    window.location.href = `vibe.html?year=${encodeURIComponent(year)}&address=${encodeURIComponent(address)}&name=${encodeURIComponent(name)}&describe=${encodeURIComponent(describe)}`;
});