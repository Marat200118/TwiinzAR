// import { supabase } from "./script.js";

// export const showSubmissionPopup = (roomId, placedObjects) => {
//   // Create the popup container
//   const popupContainer = document.createElement("div");
//   popupContainer.id = "submission-popup";
//   popupContainer.className = "popup-container";

//   popupContainer.innerHTML = `
//     <div class="popup-content">
//       <h2>Submit Your Room</h2>
//       <form id="submission-form">
//         <label for="room-name">Room Name</label>
//         <input type="text" id="room-name" name="room_name" placeholder="Enter room name" required />

//         <label for="full-name">Your Full Name</label>
//         <input type="text" id="full-name" name="full_name" placeholder="Enter your full name" required />

//         <label for="age">Your Age</label>
//         <input type="number" id="age" name="age" placeholder="Enter your age" required />

//         <label for="phone-number">Phone Number</label>
//         <input type="tel" id="phone-number" name="phone_number" placeholder="Enter your phone number" required />

//         <label for="inspiration">Inspiration Source (optional)</label>
//         <input type="text" id="inspiration" name="inspiration" placeholder="What inspired this room?" />

//         <div class="popup-actions">
//           <button type="submit" class="submit-button">Submit</button>
//           <button type="button" class="cancel-button" id="cancel-popup">Cancel</button>
//         </div>
//       </form>
//     </div>
//   `;

//   document.body.appendChild(popupContainer);
//   //  const contentContainer = document.getElementById("content");
//   //  contentContainer.appendChild(popupContainer);

//   // Add event listener to cancel button
//   document.getElementById("cancel-popup").addEventListener("click", () => {
//     document.body.removeChild(popupContainer);
//     // contentContainer.removeChild(popupContainer);
//   });

//   // Add event listener to form submission
//   document
//     .getElementById("submission-form")
//     .addEventListener("submit", async (e) => {
//       e.preventDefault();

//       // Collect form data
//       const roomName = document.getElementById("room-name").value;
//       const fullName = document.getElementById("full-name").value;
//       const age = document.getElementById("age").value;
//       const phoneNumber = document.getElementById("phone-number").value;
//       const inspiration = document.getElementById("inspiration").value;

//       try {
//         // Update room details
//         const { error: roomError } = await supabase
//           .from("rooms")
//           .update({
//             room_name: roomName,
//             created_by_name: fullName,
//             creators_age: age,
//             created_by_phone: phoneNumber,
//             inspiration: inspiration || null,
//           })
//           .eq("id", roomId);

//         if (roomError) throw roomError;

//         // Prepare room models payload
//         const roomModels = placedObjects.map((object) => ({
//           room_id: roomId,
//           model_id: object.modelId,
//           position: {
//             x: object.mesh.position.x,
//             y: object.mesh.position.y,
//             z: object.mesh.position.z,
//           },
//           rotation: {
//             x: object.mesh.rotation.x,
//             y: object.mesh.rotation.y,
//             z: object.mesh.rotation.z,
//           },
//           scale: {
//             x: object.mesh.scale.x,
//             y: object.mesh.scale.y,
//             z: object.mesh.scale.z,
//           },
//         }));

//         if (roomModels.length === 0) {
//           alert("No objects placed in the room!");
//           return;
//         }

//         // Insert room models into the database
//         const { error: modelsError } = await supabase
//           .from("roommodels")
//           .insert(roomModels);

//         if (modelsError) throw modelsError;

//         alert("Room and models saved successfully!");
//         document.body.removeChild(popupContainer);
//         contentContainer.removeChild(popupContainer);
//       } catch (error) {
//         console.error("Error saving room:", error);
//         alert("Failed to submit the room. Please try again.");
//       }
//     });
// };
