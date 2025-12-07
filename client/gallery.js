// used claude for this. was helpful to learn about and use asynch, await, and try
async function loadBuildings() {
    try {
      const response = await fetch ('https://bedstuy-2125-virtual.onrender.com/get-buildings');  
      const buildings = await response.json();
      const container = document.getElementById('buildings-container');
      buildings.forEach(building => {
        const card = document.createElement ('div');
        // Adds the main styling class
        card.classList.add('building-card'); 
        
        card.innerHTML = `
          <div class="card-image">
            <img src="${building.ai_image_url}" alt="${building.name}" style="width: 100%; max-width: 400px;">
          </div>
          <div class="card-content">
            <h3>${building.name}</h3>
            <p><strong>Address:</strong> ${building.address}</p>
            <p><strong>Year:</strong> ${building.year}</p>
            <p class="card-description"><em>${building.describe}</p>
            <p><strong>Vibe:</strong> ${building.vibe}</p>
            <p class="card-description"><em>${building.ai_description}</em></p>
            <div class="card-meta">
                        Submitted by ${building.user_name} from ${building.user_location} • ${new Date(building.created_at).toLocaleDateString()}
                    </div>
                </div>
            `; 
          // from above: building.created_at gets the timestamp from the database; 
          // new Date(...) converts it to a JavaScript Date object
          // .toLocaleDateString() formats it to XX/XX/XXXX
        
          container.appendChild(card);
      });

    } catch (error) {
        console.error('error:', error);
    }
}

loadBuildings();