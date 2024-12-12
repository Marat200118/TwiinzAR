import { createRoomCard } from "./roomCard.js";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRoomIndex = 0;
let rooms = [];

const fetchRooms = async () => {
  const { data, error } = await supabase.from("rooms").select("*");
  if (error) {
    console.error("Error fetching rooms:", error);
    return;
  }
  rooms = data;
  console.log("Rooms fetched:", rooms);
  updateGalleryPreview();
};

const updateGalleryPreview = () => {
  const galleryPreview = document.querySelector(".gallery-preview");
  galleryPreview.innerHTML = "";
  const room = rooms[currentRoomIndex];
  const roomCard = createRoomCard(room);
  galleryPreview.appendChild(roomCard);
};

const navigateGallery = (direction) => {
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
