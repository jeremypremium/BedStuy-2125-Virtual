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
            <img src="${building.ai_image_url}" alt="${building.name}" style="width: 100%; max-width: 400px;">
            <p>address: ${building.address}</p>
            <p>Year: ${building.year}</p>
            <p>${building.describe}</p>
            <p>Visual: ${building.vibe}</p>
            <p>${building.ai_description}</p>
            <p>Submitted by ${building.user_name} from ${building.user_location} on ${new Date(building.created_at).toLocaleDateString()}</p>
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