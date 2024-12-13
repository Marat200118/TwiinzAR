import { createRoomCard } from "./roomCard.js";
import page from "page";

const fetchRooms = async () => {
  try {
    const response = await fetch("/api/rooms");
    if (!response.ok) {
      throw new Error("Failed to fetch rooms");
    }

    const rooms = await response.json();
    return rooms;
  } catch (err) {
    console.error("Error fetching rooms:", err);
    alert("An error occurred while loading rooms. Please try again later.");
    return [];
  }
};

const renderRooms = async () => {
  const rooms = await fetchRooms();
  const container = document.getElementById("cards-container");
  container.innerHTML = "";

  if (rooms.length === 0) {
    container.innerHTML = "<p>No rooms available yet.</p>";
    return;
  }

  rooms.forEach((room) => {
    const card = createRoomCard(room);
    container.appendChild(card);
  });

  document.querySelectorAll(".view-room").forEach((button) =>
    button.addEventListener("click", (e) => {
      const roomId = e.target.getAttribute("data-room-id");
      viewRoom(roomId);
    })
  );
};

const viewRoom = (roomId) => {
  page(`/rooms/${roomId}`);
};

document.addEventListener("DOMContentLoaded", renderRooms);
