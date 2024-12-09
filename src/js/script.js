import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import $ from "jquery";
import { createClient } from "@supabase/supabase-js";
import { generateHighQualityPreview } from "./renderModelPreview";
import page from "page";
import { v4 as uuidv4 } from "uuid";
import { initPopup, togglePopupButtonVisibility } from "./popup.js";
// import { showSubmissionPopup } from "./submission.js";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// let supabase;

// const fetchSupabaseCredentials = async () => {
//   const response = await fetch("../api/supabase-credentials");
//   if (!response.ok) {
//     throw new Error("Failed to fetch Supabase credentials.");
//   }
//   return await response.json();
// };

// const initializeSupabase = async () => {
//   try {
//     const { SUPABASE_URL, SUPABASE_KEY } = await fetchSupabaseCredentials();
//     supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
//     console.log("Supabase initialized successfully.");
//     fetchModels();
//   } catch (error) {
//     console.error("Error initializing Supabase:", error);
//     alert("Failed to initialize Supabase. Please try again.");
//   }
// };

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const cleanupTimeout = 180000;

let container;
let camera, scene, renderer;
let controller, reticle, pmremGenerator, current_object, controls;
let placedObjects = [];
let selectedObject = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let touchDown, touchX, touchY, deltaX, deltaY;
let roomId = null;
let currentIndex = 0;
let initialPinchDistance = null;
let pinchScaling = false;
let isRotating = false;
let lastTouchX = null;

const toggleNav = () => {
  const sidenav = document.getElementById("mySidenav");
  const navToggle = document.getElementById("nav-toggle");
  const isOpen = sidenav.classList.toggle("open");
  // sidenav.classList.add("open");
  // navToggle.style.display = "none";

  navToggle.innerHTML = isOpen
    ? '<ion-icon name="close"></ion-icon>'
    : "<ion-icon name='add'></ion-icon>";
};

document.getElementById("nav-toggle").addEventListener("click", toggleNav);

$(".ar-object").click(function () {
  loadModel($(this).attr("id"));
  const modelId = $(this).attr("id");
  console.log("Model ID clicked:", modelId);
});

$("#place-button").click(() => {
  arPlace();
});

// const fetchModels = async () => {

//   const { data, error } = await supabase.from("models").select("*");

//   if (error) {
//     console.error("Error fetching models:", error);
//     alert("Failed to fetch models. Please try again later.");
//     return;
//   }

//   const sidenav = document.querySelector(".navigation-content");
//   const categories = {};

//   data.forEach((model) => {
//     if (!categories[model.category]) {
//       categories[model.category] = [];
//     }
//     categories[model.category].push(model);
//   });

//   for (const [category, models] of Object.entries(categories)) {
//     const categoryRow = document.createElement("div");
//     categoryRow.className = "category-row";

//     const categoryLabel = document.createElement("h3");
//     categoryLabel.textContent = category;
//     sidenav.appendChild(categoryLabel);

//     models.forEach((model) => {
//       const modelItem = document.createElement("div");
//       modelItem.className = "model-item";
//       modelItem.id = `model-${model.id}`;

//       const modelName = document.createElement("p");
//       modelName.className = "name";
//       modelName.textContent = model.name;

//       const modelCompany = document.createElement("p");
//       modelCompany.className = "company";
//       modelCompany.textContent = model.company;

//       const previewContainer = document.createElement("div");
//       previewContainer.id = `preview-${model.id}`;
//       previewContainer.className = "preview-container";
//       previewContainer.style.width = "100px";
//       previewContainer.style.height = "100px";

//       modelItem.appendChild(previewContainer);
//       modelItem.appendChild(modelName);
//       modelItem.appendChild(modelCompany);
//       categoryRow.appendChild(modelItem);

//       sidenav.appendChild(categoryRow);

//       fetchAndRenderPreviews();

//       modelItem.addEventListener("click", () => {
//         document.querySelectorAll(".model-item").forEach((item) => {
//           item.classList.remove("active");
//         });

//         modelItem.classList.add("active");

//         if (current_object) {
//           scene.remove(current_object);
//         }

//         loadModel(model.glb_url, model.id);

//         toggleNav();
//       });
//     });
//   }
// };

const fetchModels = async () => {
  const { data, error } = await supabase.from("models").select("*");

  if (error) {
    console.error("Error fetching models:", error);
    alert("Failed to fetch models. Please try again later.");
    return;
  }

  const sidenav = document.querySelector(".navigation-content");
  sidenav.innerHTML = "";

  const header = document.createElement("div");
  header.className = "menu-header";
  header.innerHTML = `
    <img src="assets/TwiinzLogoOrange.svg" alt="Logo" class="menu-logo" />
    <h2>Choose Category</h2>
  `;
  sidenav.appendChild(header);

  const categories = {};

  data.forEach((model) => {
    if (!categories[model.category]) {
      categories[model.category] = [];
    }
    categories[model.category].push(model);
  });

  for (const [category, models] of Object.entries(categories)) {
    const firstModelImage = models[0].model_image;

    const categoryCard = document.createElement("div");
    categoryCard.className = "category-card";
    categoryCard.innerHTML = `
      <div class="category-header">
        <img src="${firstModelImage}" alt="${category}" class="category-image" />
        <div class="category-header-text">
          <h3>${category}</h3>
          <p>${models.length} items</p>
        </div>
        <button class="view-category-button" data-category="${category}">
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </button>
      </div>
    `;
    categoryCard.addEventListener("click", () =>
      displayCategoryObjects(category, models)
    );

    sidenav.appendChild(categoryCard);
  }
};

const displayCategoryObjects = (category, models) => {
  const sidenav = document.querySelector(".navigation-content");
  sidenav.innerHTML = "";

  const header = document.createElement("div");
  header.className = "menu-header";
  header.innerHTML = `
    <img src="assets/TwiinzLogoOrange.svg" alt="Logo" class="menu-logo" />
    <h2>${category}</h2>
  `;
  sidenav.appendChild(header);

  const backButton = document.createElement("button");
  backButton.className = "back-button";
  backButton.innerHTML = ` <ion-icon name="chevron-back-outline"></ion-icon> Back`;
  backButton.addEventListener("click", fetchModels);
  sidenav.appendChild(backButton);

  models.forEach((model) => {
    const modelCard = document.createElement("div");
    modelCard.className = "model-card";
    modelCard.innerHTML = `
      <div class="model-card-image">
        <img src="${model.model_image}" alt="${model.name}" class="model-image" />
      </div>
      <div class="model-card-details">
        <h4 class="model-name-navigation">${model.name}</h4>
        <p class="model-company-navigation">${model.company}</p>
        <p class="model-location-navigation">Made in <br><span class="menu-highlight">${model.company_location}</span></p>
      </div>
    `;

    modelCard.addEventListener("click", () => {
      document
        .querySelectorAll(".model-card")
        .forEach((card) => card.classList.remove("active"));

      modelCard.classList.add("active");

      loadModel(model.glb_url, model.id);
      toggleNav();
    });

    sidenav.appendChild(modelCard);
  });
};

const createConfirmationDialog = (container) => {
  const dialog = document.createElement("div");
  dialog.id = "confirmation-dialog";
  dialog.style.borderRadius = "8px";
  dialog.style.display = "none";
  dialog.style.zIndex = "1000";
  dialog.style.textAlign = "center";
  dialog.innerHTML = `
    <p>Are you sure you want to delete this model?</p>
    <div>
      <button id="confirm-delete" style="margin: 10px; padding: 8px 16px;">Delete</button>
      <button id="cancel-delete" style="margin: 10px; padding: 8px 16px;">Cancel</button>
    </div>
  `;
  container.appendChild(dialog);

  dialog.querySelector("#cancel-delete").addEventListener("click", () => {
    dialog.style.display = "none";
  });

  dialog.querySelector("#confirm-delete").addEventListener("click", () => {
    console.warn(
      "Confirm delete button clicked, but no uniqueId provided yet."
    );
    dialog.style.display = "none";
  });
};

const showConfirmationDialog = (uniqueId) => {
  const dialog = document.getElementById("confirmation-dialog");
  if (dialog) {
    dialog.style.display = "block";

    let timeoutId = setTimeout(() => {
      dialog.style.display = "none";
      console.log(
        "Confirmation dialog dismissed automatically after 5 seconds."
      );
    }, 5000);

    const confirmButton = dialog.querySelector("#confirm-delete");
    const cancelButton = dialog.querySelector("#cancel-delete");

    const clearDialogTimeout = () => {
      clearTimeout(timeoutId);
    };

    confirmButton.onclick = () => {
      clearDialogTimeout();
      deleteModel(uniqueId);
      dialog.style.display = "none";
    };

    cancelButton.onclick = () => {
      clearDialogTimeout();
      dialog.style.display = "none";
    };
  } else {
    console.error("Confirmation dialog not found!");
  }
};

const deleteModel = (uniqueId) => {
  const objectIndex = placedObjects.findIndex(
    (obj) => obj.uniqueId === uniqueId
  );

  if (objectIndex !== -1) {
    const objectToRemove = placedObjects[objectIndex];
    scene.remove(objectToRemove.mesh);
    placedObjects.splice(objectIndex, 1);
    togglePopupButtonVisibility(placedObjects);
    document.getElementById("popup").style.display = "none";
    console.log(`Object with ID ${uniqueId} removed.`);
  } else {
    alert("Model not found in the scene!");
  }
};

const loadModel = (url, id) => {
  if (!url) {
    console.error("Invalid GLB URL:", url);
    alert("Model URL is invalid or missing.");
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      current_object = gltf.scene;
      current_object.userData.objectId = id;

      const areaLightIntensity = 2;

      const areaLight = new THREE.RectAreaLight(
        0xffffff,
        areaLightIntensity,
        10,
        10
      );
      areaLight.position.set(0, 5, 0);
      areaLight.lookAt(current_object.position);
      current_object.add(areaLight);

      current_object.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      console.log("Model loaded successfully:", url, id);

      showHelperBlock();
    },
    undefined,
    (error) =>
      console.error("An error occurred while loading the model:", error)
  );
};

const animateReticleOnPlace = () => {
  const originalScale = reticle.scale.clone();
  const targetScale = originalScale.clone().multiplyScalar(1.5);
  const duration = 500;

  const startTime = performance.now();

  const animate = (time) => {
    const elapsedTime = time - startTime;
    const progress = Math.min(elapsedTime / duration, 1);

    reticle.scale.lerpVectors(originalScale, targetScale, progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      reticle.scale.copy(originalScale);
    }
  };

  requestAnimationFrame(animate);
};

const arPlace = () => {
  if (reticle.visible && current_object) {
    const placedObject = current_object.clone();
    const uniqueId = uuidv4();
    placedObject.position.setFromMatrixPosition(reticle.matrix);
    placedObject.rotation.copy(reticle.rotation);
    placedObject.scale.copy(current_object.scale);
    placedObject.visible = true;
    console.log(
      "current_object user data id",
      current_object.userData.objectId
    );

    placedObject.userData = {
      objectId: current_object.userData.objectId,
      uniqueId: uniqueId,
    };

    // placedObject.userData.objectId = current_object.userData.objectId;

    placedObject.traverse((node) => {
      if (node.isMesh) {
        node.userData.objectId = current_object.userData.objectId;
      }
    });

    scene.add(placedObject);

    placedObjects.push({
      uniqueId: uniqueId,
      mesh: placedObject,
      modelId: current_object.userData.objectId,
      position: placedObject.position.toArray(),
      rotation: placedObject.rotation.toArray(),
      scale: placedObject.scale.toArray(),
    });

    selectedObject = placedObject;
    togglePopupButtonVisibility(placedObjects);

    animateReticleOnPlace();

    console.log("Object placed:", placedObject);
    hideHelperBlock();
    toggleSubmitButton();
  }
};

const rotateObjects = () => {
  if (selectedObject) {
    selectedObject.rotation.y += deltaX / 100;
  }
};

const onWindowResize = () => {
  if (!renderer.xr.isPresenting) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

const animate = (timestamp, frame) => {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace("viewer").then((referenceSpace) => {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then((source) => {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
        reticle.visible = false;

        const box = new THREE.Box3().setFromObject(current_object);
        box.getCenter(controls.target);

        document.getElementById("place-button").style.display = "none";
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        document.getElementById("place-button").style.display = "block";
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
        document.getElementById("place-button").style.display = "none";
      }
    }
  }

  renderer.render(scene, camera);
};

const render = () => {
  renderer.render(scene, camera);
};

const deleteRoomFromDatabase = async (roomId) => {
  if (!roomId) {
    console.warn("Room ID is missing, cannot delete room.");
    return;
  }

  try {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) throw error;
    console.log(`Room with ID ${roomId} has been deleted from the database.`);
    roomId = null;
  } catch (error) {
    console.error("Failed to delete room from database:", error);
  }
};

const startRoomCleanup = () => {
  if (!roomId) return;

  setTimeout(async () => {
    if (roomId && placedObjects.length === 0) {
      console.log("No objects placed and room not submitted. Deleting room...");
      await deleteRoomFromDatabase(roomId);
    } else {
      console.log("Room has objects or has been submitted, skipping cleanup.");
    }
  }, cleanupTimeout);
};

const createRoom = async () => {
  if (roomId) {
    console.warn("Room already created with ID:", roomId);
    return;
  }
  const { data, error } = await supabase
    .from("rooms")
    .insert({})
    .select("id")
    .single();

  if (error) {
    console.error("Error creating room:", error);
    alert("Failed to create a new room. Please try again.");
    return;
  }

  roomId = data.id;
  console.log("Room created with ID:", roomId);

  // startRoomCleanup();

  // window.addEventListener("beforeunload", async () => {
  //   if (roomId && placedObjects.length > 0) {
  //     console.log(
  //       "User closed the window without submitting. Cleaning up room..."
  //     );
  //     await deleteRoomFromDatabase(roomId);
  //   }
  // });
};

const toggleSubmitButton = () => {
  const submitButton = document.getElementById("submit-button");
  const arSession = renderer.xr.isPresenting;

  if (arSession && placedObjects.length > 0) {
    console.log("Placed Objects Length:", placedObjects.length);
    submitButton.style.display = "block";
  } else {
    submitButton.style.display = "none";
  }
};

const showHelperBlock = () => {
  const helperBlock = document.getElementById("helper-block");
  helperBlock.classList.remove("hidden");
};

const hideHelperBlock = () => {
  const helperBlock = document.getElementById("helper-block");
  helperBlock.classList.add("hidden");
};

const init = async () => {
  container = document.createElement("div");
  initPopup(placedObjects, supabase, scene);
  createConfirmationDialog(container);

  document.getElementById("container").appendChild(container);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new THREE.DirectionalLight(0xdddddd, 1);
  light.position.set(0, 0, 1).normalize();
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const options = {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.getElementById("content") },
  };

  const createGradientTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "#BA543B");
    gradient.addColorStop(0.5, "#F19F40");
    gradient.addColorStop(1, "#D98A71");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.12, 64, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: createGradientTexture(),
      opacity: 1,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );

  const centerDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.015, 32),
    new THREE.MeshBasicMaterial({
      map: createGradientTexture(),
      opacity: 1,
      transparent: true,
    })
  );
  centerDot.rotateX(-Math.PI / 2);
  reticle.add(centerDot);

  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener("resize", onWindowResize);
  fetchModels();

  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      pinchScaling = true;
    } else if (e.touches.length === 1) {
      lastTouchX = e.touches[0].pageX;
      isRotating = true;
    }
  });

  renderer.domElement.addEventListener("touchmove", (e) => {
    if (pinchScaling && e.touches.length === 2 && selectedObject) {
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      const newPinchDistance = Math.sqrt(dx * dx + dy * dy);

      if (initialPinchDistance) {
        const scaleFactor = newPinchDistance / initialPinchDistance;
        const maxScale = 2;
        const minScale = 0.5;
        selectedObject.scale.setScalar(
          Math.min(
            maxScale,
            Math.max(minScale, selectedObject.scale.x * scaleFactor)
          )
        );
      }

      initialPinchDistance = newPinchDistance;
    } else if (isRotating && e.touches.length === 1 && selectedObject) {
      const currentTouchX = e.touches[0].pageX;
      const rotationSpeed = 0.005;
      const deltaX = currentTouchX - lastTouchX;
      selectedObject.rotation.y += deltaX * rotationSpeed;
      lastTouchX = currentTouchX;
    }
  });

  renderer.domElement.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
      pinchScaling = false;
    }
    if (e.touches.length === 0) {
      isRotating = false;
      lastTouchX = null;
    }
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const [hit] = intersects;
      if (hit.object && hit.object.isMesh) {
        console.log("Intersected object:", hit.object);
        let clickedObject = intersects[0].object;

        while (clickedObject.parent && clickedObject.parent !== scene) {
          clickedObject = clickedObject.parent;
        }

        selectedObject = clickedObject;
        const uniqueId = selectedObject.userData.uniqueId;

        if (uniqueId) {
          console.log("Selected Object uniqueIdL ", uniqueId);
          showConfirmationDialog(uniqueId);
        } else {
          console.warn("No objectId found in userData");
        }
      }
    }
  });

  const arButton = ARButton.createButton(renderer, options);
  document.querySelector(".buttons-container").appendChild(arButton);
  arButton.classList.add("styled-ar-button");

  setTimeout(() => {
    if (arButton.textContent === "START AR") {
      arButton.textContent = "START EXPERIENCE";
    }
  }, 100);

  arButton.addEventListener("click", () => {
    if (arButton.textContent === "STOP AR") {
      arButton.textContent = "Stop Experience";
      window.location.href = "/index.html";
    }
  });

  const onboardingVideo = document.querySelector(".onboarding-video");
  const navToggle = document.getElementById("nav-toggle");

  if (renderer.xr) {
    renderer.xr.addEventListener("sessionstart", () => {
      console.log("AR session started.");
      // const submitButton = document.getElementById("submit-button");
      // arButton.style.display = "none";
      arButton.classList.remove("styled-ar-button");
      arButton.classList.add("stop-ar-button");

      onboardingVideo.style.display = "none";
      navToggle.style.display = "block";

      const sidenav = document.getElementById("mySidenav");
      sidenav.classList.add("open");
      navToggle.innerHTML = '<ion-icon name="close"></ion-icon>';

      arButton.textContent = "End AR Experience";

      toggleSubmitButton();
      createRoom();
    });

    renderer.xr.addEventListener("sessionend", () => {
      console.log("AR session ended.");
      onboardingVideo.style.display = "block";
      arButton.textContent = "Start AR Experience";
      toggleSubmitButton();

      const sidenav = document.getElementById("mySidenav");
      const navToggle = document.getElementById("nav-toggle");
      sidenav.classList.remove("open");
      navToggle.innerHTML = "<ion-icon name='menu'></ion-icon>";
    });
  } else {
    console.warn("WebXR not supported in this environment.");
  }

  toggleSubmitButton();
};

// const submitRoom = async () => {
//    console.log("Submit Room called");
//    console.log("Room ID:", roomId);
//    console.log("Placed Objects:", placedObjects);
//   if (!roomId || placedObjects.length === 0) {
//     alert("No objects placed or room ID missing!");
//     return;
//   }
//   // showSubmissionPopup(roomId, placedObjects);

//   const roomModels = placedObjects.map((object) => ({
//     room_id: roomId,
//     model_id: object.modelId,
//     position: {
//       x: object.mesh.position.x,
//       y: object.mesh.position.y,
//       z: object.mesh.position.z,
//     },
//     rotation: {
//       x: object.mesh.rotation.x,
//       y: object.mesh.rotation.y,
//       z: object.mesh.rotation.z,
//     },
//     scale: {
//       x: object.mesh.scale.x,
//       y: object.mesh.scale.y,
//       z: object.mesh.scale.z,
//     },
//   }));
//   console.log("Room ID:", roomId);
//   console.log("model id", roomModels[0].model_id);
//   console.log("position", roomModels[0].position);
//   console.log("rotation", roomModels[0].rotation);
//   console.log("scale", roomModels[0].scale);
//   console.log("Room Models Payload:", roomModels[0]);

//   console.log("model_id type:", typeof current_object.userData.objectId);
//   console.log("model_id value:", current_object.userData.objectId);

//   try {
//     if (roomModels.length === 0) {
//       alert("No objects placed in the room!");
//       return;
//     }
//     const { data, error } = await supabase
//       .from("roommodels")
//       .insert(roomModels)
//       .select();
//     if (error) throw error;
//     alert("Room saved successfully!");
//     console.log("Room models saved:", data);
//     page("/gallery");
//   } catch (error) {
//     console.error("Error saving room models:", error);
//     alert("Failed to save the room. Please try again.");
//   }
// };

const submitRoom = async () => {
  console.log("Submit Room called");
  console.log("Room ID:", roomId);
  console.log("Placed Objects:", placedObjects);

  if (!roomId || placedObjects.length === 0) {
    alert("No objects placed or room ID missing!");
    return;
  }

  // Create the popup container
  const submissionPopup = document.querySelector(".submission-popup");

  // Clear existing popup content if any
  if (submissionPopup.style.display === "flex") return;
  submissionPopup.innerHTML = "";

  // Create the popup content
  const popupContent = document.createElement("div");
  popupContent.className = "popup-content";

  popupContent.innerHTML = `
      <h2>Submit Your Room</h2>
      <form id="submission-form">
        <label for="room-name">Room Name</label>
        <input type="text" id="room-name" name="room_name" placeholder="Enter room name" required />

        <label for="full-name">Your Full Name</label>
        <input type="text" id="full-name" name="full_name" placeholder="Enter your full name" required />

        <label for="age">Your Age</label>
        <input type="number" id="age" name="age" placeholder="Enter your age" required />

        <label for="phone-number">Phone Number</label>
        <input type="tel" id="phone-number" name="phone_number" placeholder="Enter your phone number" required />

        <label for="inspiration">Inspiration Source (optional)</label>
        <input type="text" id="inspiration" name="inspiration" placeholder="What inspired this room?" />

        <div class="popup-actions">
          <button type="submit" class="submit-button">Submit</button>
          <button type="button" class="cancel-button" id="cancel-popup">Cancel</button>
        </div>
      </form>
  `;

  submissionPopup.appendChild(popupContent);

  // Show the popup
  submissionPopup.style.display = "flex";
  document.getElementById("room-name").focus();

  // Add event listener to cancel button
  document.getElementById("cancel-popup").addEventListener("click", () => {
    submissionPopup.style.display = "none"; // Hide the popup
  });
  // Add event listener to form submission
  document
    .getElementById("submission-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // Collect form data
      const roomName = document.getElementById("room-name").value;
      const fullName = document.getElementById("full-name").value;
      const age = document.getElementById("age").value;
      const phoneNumber = document.getElementById("phone-number").value;
      const inspiration = document.getElementById("inspiration").value;

      try {
        // Update room details
        const { error: roomError } = await supabase
          .from("rooms")
          .update({
            room_name: roomName,
            created_by_name: fullName,
            creators_age: age,
            created_by_phone: phoneNumber,
            inspiration: inspiration || null,
          })
          .eq("id", roomId);

        if (roomError) throw roomError;

        // Prepare room models payload
        const roomModels = placedObjects.map((object) => ({
          room_id: roomId,
          model_id: object.modelId,
          position: {
            x: object.mesh.position.x,
            y: object.mesh.position.y,
            z: object.mesh.position.z,
          },
          rotation: {
            x: object.mesh.rotation.x,
            y: object.mesh.rotation.y,
            z: object.mesh.rotation.z,
          },
          scale: {
            x: object.mesh.scale.x,
            y: object.mesh.scale.y,
            z: object.mesh.scale.z,
          },
        }));

        if (roomModels.length === 0) {
          alert("No objects placed in the room!");
          return;
        }

        // Insert room models into the database
        const { error: modelsError } = await supabase
          .from("roommodels")
          .insert(roomModels);

        if (modelsError) throw modelsError;

        alert("Room and models saved successfully!");
        submissionPopup.style.display = "none";
        page("/gallery");
      } catch (error) {
        console.error("Error saving room:", error);
        alert("Failed to submit the room. Please try again.");
      }
    });
};

document.getElementById("submit-button").addEventListener("click", submitRoom);

const isWebXRSupported = async () => {
  if (!navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
};

const initApp = async () => {
  const webxrSupported = await isWebXRSupported();

  if (webxrSupported && window.location.pathname === "/ar.html") {
    console.log("WebXR is supported. Initializing WebXR.");
    init();
  } else if (window.LAUNCHAR && window.LAUNCHAR.isSupported) {
    if (window.location.pathname === "/ar.html") {
      console.log("WebXR not supported. Using LaunchXR for AR support.");

      window.LAUNCHAR.initialize({
        key: "OT58Wuy5RITCnvlaArd1DpN9LFjIs1Nj",
        redirect: true,
      }).then(() => {
        window.LAUNCHAR.on("arSessionStarted", () => {
          console.log("LaunchXR AR session started.");
          init();
        });
      });
    } else {
      console.log(
        "LaunchXR is not initialized because the page is not /ar.html."
      );
    }
  } else {
    console.log(
      "Neither WebXR nor LaunchXR is supported. Using AR.js as fallback."
    );
  }
};

initApp();
