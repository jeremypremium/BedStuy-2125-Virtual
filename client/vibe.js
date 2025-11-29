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

    // Pass all data forward 
    window.location.href = `final.html?year=${year}&address=${address}&name=${name}&describe=${describe}&vibe=${vibe}`;
});