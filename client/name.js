// passing data from page to page
document.getElementById('name-form').addEventListener('submit', function(e) {e.preventDefault();

    // Get all previous URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const address = urlParams.get('address');
  
    // Get the current form input
    const name = document.getElementById('name-input').value;
    
    // Pass all data forward 
      window.location.href = `describe.html?year=${year}&address=${address}&name=${name}`;
});

