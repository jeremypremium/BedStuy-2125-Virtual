// passing data from page to page
document.getElementById('vibe-form').addEventListener('submit', function(e) {e.preventDefault();


    // Get all previous URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const address = urlParams.get('address');
    const name = urlParams.get('name');
    const describe = urlParams.get('describe');

    // Get the current form input
    const vibe = document.getElementById('vibe-input').value;

    // Pass all data forward & encode data before putting it in URL
    window.location.href = `final.html?year=${encodeURIComponent(year)}&address=${encodeURIComponent(address)}&name=${encodeURIComponent(name)}&describe=${encodeURIComponent(describe)}&vibe=${encodeURIComponent(vibe)}`;
});