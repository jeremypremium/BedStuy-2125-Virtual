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
        const recentBuildings = buildings.slice(0, 3); 

        recentBuildings.forEach(building => {
            const card = document.createElement('article');
            card.classList.add('rendering-card');

            card.innerHTML = `
                <div class="arch-frame">
                    <img src="${building.ai_image_url || ''}" alt="${building.name}" onerror="this.style.display='none'">
                </div>
                <div class="card-caption-row card-caption-row--quiet">
                    <span class="card-name">${building.name}</span>
                </div>
                <p class="card-ai-description">${building.ai_description}</p>
                <p class="card-submitted">Submitted by ${building.user_name} • ${new Date(building.created_at).toLocaleDateString()}</p>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading homepage gallery:', error);
    }
}

loadHomeGallery();