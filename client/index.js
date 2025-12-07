document.getElementById('home-button').addEventListener('click', function() {window.location.href = 'year.html';
});

// Gallery Loading on homeapage
async function loadHomeGallery() {
    try {
        const response = await fetch('https://bedstuy-2125-virtual.onrender.com/get-buildings');  
        const buildings = await response.json();
        
        const container = document.getElementById('home-gallery-container');
        
        if (!container) return; // Safety check in case the ID is missing

        // show only the 3 most recent buildings on the homepage
        const recentBuildings = buildings.slice(0, 4); 

        recentBuildings.forEach(building => {
            const card = document.createElement('article');
            card.classList.add('building-card');

            card.innerHTML = `
                <div class="card-image">
                    <img src="${building.ai_image_url || ''}" alt="${building.name}" onerror="this.style.display='none'">
                </div>
                <div class="card-content">
                    <h3>${building.name}</h3>
                    <p><strong>Address:</strong> ${building.address}</p>
                    <p><strong>Year:</strong> ${building.year}</p>
                    <p><strong>Vibe:</strong> ${building.vibe}</p>
                    <p class="card-description">${building.describe}</p>
                    <div class="card-meta">
                        Submitted by ${building.user_name} • ${new Date(building.created_at).toLocaleDateString()}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading homepage gallery:', error);
    }
}

loadHomeGallery();