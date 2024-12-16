import { createRoomCard } from "./roomCard.js";

let currentRoomIndex = 0;
let rooms = [];

const fetchRooms = async () => {
  try {
    const response = await fetch("/api/rooms");
    if (!response.ok) {
      throw new Error("Failed to fetch rooms");
    }

    rooms = await response.json();
    updateGalleryPreview();
  } catch (error) {
    console.error("Error fetching rooms:", error);
  }
};

const updateGalleryPreview = () => {
  const galleryPreview = document.querySelector(".gallery-preview");
  galleryPreview.innerHTML = "";
  const room = rooms[currentRoomIndex];
  if (room) {
    const roomCard = createRoomCard(room);
    galleryPreview.appendChild(roomCard);
  } else {
    galleryPreview.innerHTML = "<p>No rooms available.</p>";
  }
};

const navigateGallery = (direction) => {
  if (rooms.length === 0) return;

  if (direction === "prev") {
    currentRoomIndex = (currentRoomIndex - 1 + rooms.length) % rooms.length;
  } else if (direction === "next") {
    currentRoomIndex = (currentRoomIndex + 1) % rooms.length;
  }
  updateGalleryPreview();
};

document.getElementById("prev-room").addEventListener("click", () => {
  navigateGallery("prev");
});
document.getElementById("next-room").addEventListener("click", () => {
  navigateGallery("next");
});

fetchRooms();
