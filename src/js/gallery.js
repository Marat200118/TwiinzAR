import { createClient } from "@supabase/supabase-js";
import { createRoomCard } from "./roomCard.js";
import page from "page";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fetchRooms = async () => {
  try {
    const { data: rooms, error } = await supabase.from("rooms").select("*");

    if (error) {
      console.error("Error fetching rooms:", error);
      alert("Failed to fetch rooms. Please try again later.");
      return [];
    }

    return rooms;
  } catch (err) {
    console.error("Unexpected error:", err);
    alert("An unexpected error occurred. Please try again later.");
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
