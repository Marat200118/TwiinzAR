import page from "page";

page("/", () => {
  // window.location.href = "/index.html";
});

page("/gallery", () => {
  window.location.href = "/gallery.html";
});

page("/ar", () => {
  window.location.href = "/ar.html";
});

page("/rooms/:id", (context) => {
  const roomId = context.params.id;
  window.location.href = `/room.html?id=${roomId}`;
});


page.start();
