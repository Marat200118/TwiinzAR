import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import $ from "jquery";
import page from "page";
import { v4 as uuidv4 } from "uuid";
import { initPopup, togglePopupButtonVisibility } from "./popup.js";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const deleteButton = document.getElementById("delete-bin-button");
const confirmationDialog = document.getElementById("confirmation-dialog");
const confirmationText = document.getElementById("confirmation-text");

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
let deleteTimeout;


const toggleNav = () => {
  const sidenav = document.getElementById("mySidenav");
  const navToggle = document.getElementById("nav-toggle");
  const isOpen = sidenav.classList.toggle("open");

  navToggle.innerHTML = isOpen
    ? '<ion-icon name="close"></ion-icon>'
    : "<ion-icon name='add'></ion-icon>";
};

$(".ar-object").click(function () {
  loadModel($(this).attr("id"));
  const modelId = $(this).attr("id");
  // console.log("Model ID clicked:", modelId);
});

$("#place-button").click(() => {
  arPlace();
});

const fetchModels = async () => {
  try {
    const response = await fetch("/api/models");
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }

    const models = await response.json();
    populateModels(models);
  } catch (error) {
    console.error("Error fetching models:", error);
  }
};

const populateModels = (data) => {
  const sidenav = document.querySelector(".navigation-content");
  sidenav.innerHTML = "";

  const header = document.createElement("div");
  header.className = "menu-header";
  header.innerHTML = `
    <img src="/TwiinzLogoOrange.svg" alt="Logo" class="menu-logo" />
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
    <img src="/TwiinzLogoOrange.svg" alt="Logo" class="menu-logo" />
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

const showDeleteButton = (object) => {
  deleteButton.style.display = "block";

  clearTimeout(deleteTimeout);
  deleteTimeout = setTimeout(() => {
    deleteButton.style.display = "none";
  }, 5000);

  deleteButton.onclick = () => {
    const { objectId, modelName, modelCompany, uniqueId } = object.userData;
    showConfirmationDialog(objectId, modelName, modelCompany, uniqueId);
  };
};

const showConfirmationDialog = (id, name, company, uniqueId) => {
  confirmationText.textContent = `Are you sure you want to delete this model from the scene?`;
  confirmationDialog.style.display = "block";

  let autoDismissTimeout = setTimeout(() => {
    confirmationDialog.style.display = "none";
  }, 3000);

  document.getElementById("confirm-delete").onclick = () => {
    clearTimeout(autoDismissTimeout);
    deleteModel(uniqueId);
    confirmationDialog.style.display = "none";
  };

  document.getElementById("cancel-delete").onclick = () => {
    clearTimeout(autoDismissTimeout);
    confirmationDialog.style.display = "none";
  };

  confirmationDialog.onmouseenter = () => clearTimeout(autoDismissTimeout);
  confirmationDialog.onmouseleave = () => {
    autoDismissTimeout = setTimeout(() => {
      confirmationDialog.style.display = "none";
    }, 3000);
  };
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
    // console.log(`Object with uniqueId ${uniqueId} removed.`);
  } else {
  }
};

const loadModel = (url, id) => {
  if (!url) {
    console.error("Invalid GLB URL:", url);
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

      const shadowLight = new THREE.DirectionalLight(0xffffff, 0.8);
      shadowLight.position.set(5, 10, 5);
      shadowLight.castShadow = true;
      shadowLight.shadow.mapSize.width = 1024;
      shadowLight.shadow.mapSize.height = 1024;
      shadowLight.shadow.camera.near = 0.5;
      shadowLight.shadow.camera.far = 50;

      scene.add(shadowLight);


      current_object.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      // console.log("Model loaded successfully:", url, id);
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
    // console.log(
    //   "current_object user data id",
    //   current_object.userData.objectId
    // );

    placedObject.userData = {
      objectId: current_object.userData.objectId,
      uniqueId: uniqueId,
    };

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

    // console.log("Object placed:", placedObject);
    hideHelperBlock();
    toggleSubmitButton();
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

const createRoom = async () => {
  if (roomId) {
    console.warn("Room already created with ID:", roomId);
    return;
  }

  try {
    const response = await fetch("/api/create-room", {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error creating room:", error);
      return;
    }

    const { id } = await response.json();
    roomId = id;
    // console.log("Room created with ID:", roomId);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
};

const toggleSubmitButton = () => {
  const submitButton = document.getElementById("submit-button");
  const arSession = renderer.xr.isPresenting;

  if (arSession && placedObjects.length > 0) {
    // console.log("Placed Objects Length:", placedObjects.length);
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
  initPopup(placedObjects, scene);

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
        // console.log("Intersected object:", hit.object);
        let clickedObject = intersects[0].object;

        while (clickedObject.parent && clickedObject.parent !== scene) {
          clickedObject = clickedObject.parent;
        }

        selectedObject = clickedObject;
        const uniqueId = selectedObject.userData.uniqueId;

        if (selectedObject.userData) {
          showDeleteButton(selectedObject);
        }

        if (uniqueId) {
          // console.log("Selected Object uniqueIdL ", uniqueId);
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
  const animationText = document.querySelector(".animation-text");
  const navToggle = document.getElementById("nav-toggle");

  if (renderer.xr) {
    renderer.xr.addEventListener("sessionstart", () => {
      // console.log("AR session started.");
      arButton.classList.remove("styled-ar-button");
      arButton.classList.add("stop-ar-button");

      onboardingVideo.style.display = "none";
      animationText.style.display = "none";
      navToggle.style.display = "block";

      const sidenav = document.getElementById("mySidenav");
      sidenav.classList.add("open");
      navToggle.innerHTML = '<ion-icon name="close"></ion-icon>';

      arButton.textContent = "End AR Experience";

      toggleSubmitButton();
      createRoom();
    });

    renderer.xr.addEventListener("sessionend", () => {
      // console.log("AR session ended.");
      onboardingVideo.style.display = "block";
      animationText.style.display = "block";
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

const adjustForKeyboard = () => {
  const submissionPopup = document.querySelector(".submission-popup");
  const popupContent = document.querySelector(".popup-content");

  window.addEventListener("resize", () => {
    if (window.innerHeight < window.outerHeight - 150) {
      submissionPopup.style.alignItems = "flex-start";
      popupContent.style.maxHeight = `${window.innerHeight - 100}px`;
      popupContent.style.overflowY = "auto";
    } else {
      submissionPopup.style.alignItems = "center";
      popupContent.style.maxHeight = "90vh";
      popupContent.style.overflowY = "auto";
    }
  });

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", (e) => {
      const offset = e.target.getBoundingClientRect().top - 50;
      submissionPopup.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    });
  });
};

const submitRoom = async () => {

  if (!roomId || placedObjects.length === 0) {
    return;
  }

  const submissionPopup = document.querySelector(".submission-popup");

  if (submissionPopup.style.display === "flex") return;

  submissionPopup.innerHTML = "";

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

  submissionPopup.style.display = "flex";

  document.getElementById("room-name").focus();
  // adjustForKeyboard();

  document
    .getElementById("cancel-popup")
    .addEventListener("click", async () => {
      submissionPopup.style.display = "none";
    });

  document
    .getElementById("submission-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const roomName = document.getElementById("room-name").value;
      const fullName = document.getElementById("full-name").value;
      const age = document.getElementById("age").value;
      const phoneNumber = document.getElementById("phone-number").value;
      const inspiration = document.getElementById("inspiration").value;

      try {
        const roomData = {
          room_id: roomId,
          room_name: roomName,
          created_by_name: fullName,
          creators_age: age,
          created_by_phone: phoneNumber,
          inspiration: inspiration || null,
          models: placedObjects.map((object) => ({
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
          })),
        };

        const response = await fetch("/api/submit-room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Error submitting room:", error);
          return;
        }

        submissionPopup.style.display = "none";

        renderer.setAnimationLoop(animate);
        renderer.domElement.style.visibility = "visible";

        page("/gallery");
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    });
};

document.getElementById("nav-toggle").addEventListener("click", toggleNav);
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
