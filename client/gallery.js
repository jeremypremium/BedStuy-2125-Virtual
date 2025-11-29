// used claude for this. was helpful to learn about and use asynch, await, and try
async function loadBuildings() {
    try {
      const response = await fetch ('https://bedstuy-2125-virtual.onrender.com/get-buildings');  
      const buildings = await response.json();
      const container = document.getElementById('buildings-container');
      buildings.forEach(building => {
        const card = document.createElement ('div');
        card.innerHTML = `
            <h3>${building.name}</h3>
            <p>address: ${building.address}</p>
            <p>Year: ${building.year}</p>
            <p>${building.describe}</p>
            <p>Visual: ${building.vibe}</p>
            <p>${building.ai_description}</p>
          `;
        container.appendChild(card);
      });

    } catch (error) {
        console.error('error:', error);
    }
}

loadBuildings();