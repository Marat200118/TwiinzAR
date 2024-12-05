

let currentIndex = 0;

export const showPopupContent = async (placedObjects, supabase, scene) => {
  if (placedObjects.length === 0) return;

  const object = placedObjects[currentIndex];
  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("id", object.modelId)
    .single();

  if (error) {
    console.error("Error fetching object details:", error);
    alert("Failed to fetch object details.");
    return;
  }

  const popup = document.getElementById("popup");
  popup.innerHTML = `
    <div class="popup-header">
      <div class="header-heading">
        <h2 class="popup-title">${data.name} (${currentIndex + 1}/${
    placedObjects.length
  })</h2>
        <p class="popup-company">${data.company}</p>
      </div>
      <button class="popup-close" onclick="document.getElementById('popup').style.display='none'">
        <ion-icon name="close-outline"></ion-icon>
      </button>
    </div>
    <div class="popup-sections">
      <div class="popup-section">
        <h3>Description</h3>
        <p>${data.description}</p>
      </div>
      <div class="popup-section">
        <h3>Sustainability</h3>
        <div>
          <ion-icon name="leaf-outline"></ion-icon>
          <ion-icon name="refresh-outline"></ion-icon>
          <ion-icon name="earth-outline"></ion-icon>
          <ion-icon name="flash-outline"></ion-icon>
        </div>
        <p>${
          data.sustainability_info || "No sustainability information available."
        }</p>
      </div>
    </div>
    <div class="popup-actions">
      ${
        placedObjects.length > 1
          ? `<button id="prev-object">◀ Previous</button>
             <button id="next-object">Next ▶</button>`
          : ""
      }
    </div>
  `;

  if (placedObjects.length > 1) {
    document.getElementById("prev-object").addEventListener("click", () => {
      currentIndex =
        (currentIndex - 1 + placedObjects.length) % placedObjects.length;
      showPopupContent(placedObjects, supabase, scene);
    });
    document.getElementById("next-object").addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % placedObjects.length;
      showPopupContent(placedObjects, supabase, scene);
    });
  }

  popup.style.display = "block";
};

export const togglePopupButtonVisibility = (placedObjects) => {
  const popupButton = document.getElementById("popup-button");
  popupButton.style.display = placedObjects.length > 0 ? "block" : "none";
};

export const initPopup = (placedObjects, supabase, scene) => {
  const navContainer = document.getElementById("nav-toggle").parentNode;
  const popupButton = document.createElement("button");
  popupButton.id = "popup-button";
  popupButton.style.display = "none";

  popupButton.innerHTML = `<ion-icon name="information-circle-outline"></ion-icon>`;

  navContainer.appendChild(popupButton);

  popupButton.addEventListener("click", () => {
    if (placedObjects.length > 0) {
      currentIndex = 0;
      showPopupContent(placedObjects, supabase, scene);
    }
  });

  togglePopupButtonVisibility(placedObjects);
};
