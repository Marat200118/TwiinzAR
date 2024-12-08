

export const createRoomCard = (room) => {
  const card = document.createElement("div");
  card.className = "room-card";

  const roomImage = Math.random() > 0.5 ? "assets/room1.png" : "assets/room2.png";
  const starsImage = "assets/stars.svg";

  card.innerHTML = `
    <div class="room-card-content">
      <div class="room-card-image">
        <img src="${roomImage}" alt="Room image" class="room-image" />
      </div>
      <div class="room-card-details">
        <h2 class="room-owner-name">${room.created_by_name}</h2>
        <p class="room-title">"${room.room_name}"</p>
        <div class="room-rating">
          <img src="${starsImage}" alt="Room rating" class="room-stars" />
        </div>
      </div>
    </div>
    <div class="room-card-actions">
        <button class="view-room" data-room-id="${room.id}">View Room</button>
      </div>
    </div>
  `;

  return card;
};