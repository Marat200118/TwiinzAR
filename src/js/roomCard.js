

export const createRoomCard = (room) => {
  // Create card container
  const card = document.createElement("div");
  card.className = "room-card";

  // Card content
  card.innerHTML = `
    <div class="room-card-header">
      <h2>Room ID: ${room.id}</h2>
    </div>
    <div class="room-card-body">
      <p>Created at: ${new Date(room.created_at).toLocaleString()}</p>
      <div class="room-card-actions">
        <button class="view-room" data-room-id="${room.id}">View Room</button>
      </div>
    </div>
  `;

  return card;
};
