

export const createRoomCard = (room) => {
  const card = document.createElement("div");
  card.className = "room-card";

  const roomImage =
    Math.random() > 0.5
      ? "https://res.cloudinary.com/dbaauvn9g/image/upload/f_auto/v1734200475/room1_vlkvdb.png"
      : "https://res.cloudinary.com/dbaauvn9g/image/upload/f_auto/v1734200479/room2_hdebu4.png";
  const starsImage = "/stars.svg";

  card.innerHTML = `
    <a href="/room.html?id=${room.id}" class="room-link" data-room-id="${room.id}">
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
    </a>
  `;

  return card;
};