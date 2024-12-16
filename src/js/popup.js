let currentIndex = 0;

export const showPopupContent = async (placedObjects, scene) => {
  if (placedObjects.length === 0) return;

  const object = placedObjects[currentIndex];

  try {
    const response = await fetch(`/api/models/${object.modelId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch object details.");
    }

    const data = await response.json();

    const popup = document.getElementById("popup");
    popup.innerHTML = `
      <div class="popup-header">
        <div class="header-heading">
          <p class="educational-popup-pretitle">Educational pop-up</p>
          <h2 class="popup-title">${data.name} (${currentIndex + 1}/${
      placedObjects.length
    })</h2>
          <p class="popup-company">${data.company}</p>
        </div>
        <button class="popup-close" onclick="document.getElementById('popup').style.display='none'">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
      <div class="educational-popup-actions">
      ${
        placedObjects.length > 1
          ? `
          <button id="prev-object" class="nav-button-popup left">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </button>
          <button id="next-object" class="nav-button-popup right">
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </button>
        `
          : ""
      }
    </div>
      <div class="popup-sections">
        <div class="popup-section">
          <h3>Description</h3>
          <p>${data.description}</p>
        </div>
        <div class="popup-section">
          <h3>Sustainability</h3>
          <div class="sustainability-icons">
            <ion-icon name="leaf-outline"></ion-icon>
            <ion-icon name="refresh-outline"></ion-icon>
            <ion-icon name="earth-outline"></ion-icon>
            <ion-icon name="flash-outline"></ion-icon>
          </div>
          <p>${
            data.sustainability_info ||
            "No sustainability information available."
          }</p>
        </div>
      </div>
    `;

    if (placedObjects.length > 1) {
      document.getElementById("prev-object").addEventListener("click", () => {
        currentIndex =
          (currentIndex - 1 + placedObjects.length) % placedObjects.length;
        showPopupContent(placedObjects, scene);
      });
      document.getElementById("next-object").addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % placedObjects.length;
        showPopupContent(placedObjects, scene);
      });
    }

    popup.style.display = "block";
  } catch (error) {
    console.error("Error fetching object details:", error);
  }
};

export const togglePopupButtonVisibility = (placedObjects) => {
  const popupButton = document.getElementById("popup-button");
  popupButton.style.display = placedObjects.length > 0 ? "block" : "none";
};

export const initPopup = (placedObjects, scene) => {
  const navContainer = document.getElementById("nav-toggle").parentNode;
  const popupButton = document.createElement("button");
  popupButton.id = "popup-button";
  popupButton.style.display = "none";

  popupButton.innerHTML = `<ion-icon name="information-circle-outline"></ion-icon>`;

  navContainer.appendChild(popupButton);

  popupButton.addEventListener("click", () => {
    if (placedObjects.length > 0) {
      currentIndex = 0;
      showPopupContent(placedObjects, scene);
    }
  });

  togglePopupButtonVisibility(placedObjects);
};
