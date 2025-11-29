// passing data from page to page
document.getElementById('year-form').addEventListener('submit', function(e) {e.preventDefault();
    const year = document.getElementById('year-input').value;
    // had to get help from claude on the ?year=${year} piece; it's cool though, learned what all these characters/reference codes mean in urls now
    window.location.href = `address.html?year=${year}`;
});