import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer, reticle, hitTestSource, hitTestSourceRequested;
const loader = new GLTFLoader();
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("id");
let modelsToPlace = [];
let roomId;

const fetchRoomDetails = async () => {
  try {
    const response = await fetch(`/api/room-details?id=${roomId}`);
    if (!response.ok) throw new Error("Failed to fetch room details");
    const room = await response.json();

    document.getElementById("room-name").textContent = `${room.room_name}`;
    document.getElementById(
      "author-name"
    ).textContent = `By ${room.created_by_name}`;
    document.getElementById("room-image").src = "/room1.png";

    if (room.inspiration) {
      document.querySelector(".inspiration-heading").textContent =
        "Where creator took inspiration?";
      document.querySelector(".inspiration-text").textContent =
        room.inspiration;
    }
  } catch (error) {
    console.error("Failed to fetch room details:", error);
    document.querySelector(".room-details").innerHTML =
      "<p>Failed to load room details.</p>";
  }
};

const fetchModelsInfo = async () => {
  const modelsInfoContainer = document.querySelector(".models-card-container");

  try {
    const response = await fetch(`/api/room-models?id=${roomId}`);
    if (!response.ok) throw new Error("Failed to fetch models information");
    const models = await response.json();

    if (!models.length) {
      modelsInfoContainer.innerHTML = "<p>No models in this room.</p>";
      return;
    }

    const modelCounts = models.reduce((counts, model) => {
      if (!counts[model.model_id]) {
        counts[model.model_id] = { ...model.models, count: 0 };
      }
      counts[model.model_id].count++;
      return counts;
    }, {});

    Object.values(modelCounts).forEach(
      ({ name, description, model_image, company, count }) => {
        const modelCard = document.createElement("div");
        modelCard.className = "used-model";
        modelCard.innerHTML = `
        <img src="${model_image}" alt="${name}" />
        <h3>${count > 1 ? `${count}x ` : ""}${name}</h3>
        <p>Company: ${company}</p>
      `;
        modelsInfoContainer.appendChild(modelCard);
      }
    );
  } catch (error) {
    console.error("Failed to fetch models information:", error);
    modelsInfoContainer.innerHTML = "<p>Failed to load model information.</p>";
  }
};

const init = async (id) => {
  roomId = id;
  hideHelperBlock();
  fetchRoomDetails();
  await fetchModelsInfo();
  fetchModels();

  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 10, 10);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  document.body.appendChild(arButton);
  arButton.classList.add("styled-ar-button");

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  renderer.setAnimationLoop(animate);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
  renderer.xr.addEventListener("sessionend", onSessionEnd);
};

const fetchModels = async () => {
  try {
    const response = await fetch(`/api/room-models-positions?id=${roomId}`);
    if (!response.ok) throw new Error("Failed to fetch models with positions");
    const models = await response.json();

    models.forEach((modelData) => {
      const { glb_url } = modelData.models;
      const { position, rotation, scale } = modelData;

      loader.load(
        glb_url,
        (gltf) => {
          const object = gltf.scene;

          object.userData.originalPosition = position;
          object.rotation.set(rotation.x, rotation.y, rotation.z);
          object.scale.set(scale.x, scale.y, scale.z);

          object.visible = false;
          modelsToPlace.push(object);
          scene.add(object);
        },
        undefined,
        (error) => console.error("Error loading model:", error)
      );
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
};

const placeModels = (frame) => {
  if (hitTestSource && modelsToPlace.length > 0) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = hit.getPose(referenceSpace);

      if (pose) {
        const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
        const hitPosition = new THREE.Vector3().setFromMatrixPosition(matrix);

        modelsToPlace.forEach((model) => {
          const originalPosition = model.userData.originalPosition || {
            x: 0,
            y: 0,
            z: 0,
          };

          model.position.set(
            hitPosition.x + originalPosition.x,
            hitPosition.y + originalPosition.y,
            hitPosition.z + originalPosition.z
          );

          model.visible = true;
        });

        modelsToPlace = [];
      }
    }
  }
};

const animate = (timestamp, frame) => {
  if (hitTestSourceRequested && frame) {
    placeModels(frame);
  }

  renderer.render(scene, camera);
};

const showHelperBlock = () => {
  const helperBlock = document.querySelector(".room-helper-block");
  helperBlock.classList.remove("hidden");
};

const hideHelperBlock = () => {
  const helperBlock = document.querySelector(".room-helper-block");
  helperBlock.classList.add("hidden");
};


const onSessionStart = () => {
  const content = document.querySelector(".room-content");
  content.style.display = "none";
  const session = renderer.xr.getSession();

  const arButton = document.querySelector(".styled-ar-button");
  arButton.classList.remove("styled-ar-button");
  arButton.classList.add("stop-ar-button");

  session.requestReferenceSpace("viewer").then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      hitTestSource = source;
    });
  });

  showHelperBlock();

  session.addEventListener("end", () => {
    const content = document.querySelector(".room-content");
    content.style.display = "block";
    hitTestSource = null;
    hitTestSourceRequested = false;
  });

  hitTestSourceRequested = true;
};


const onSessionEnd = () => {
  const body = document.querySelector("body");
  const arButton = document.querySelector(".stop-ar-button");
  body.style.display = "block";
  hitTestSource = null;
  reticle.visible = false;
  arButton.classList.remove("stop-ar-button");
  arButton.classList.add("styled-ar-button");
  arButton.textContent = "START EXPERIENCE";
  hideHelperBlock();
};



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
  if (webxrSupported) {
    console.log("WebXR is supported. Initializing WebXR.");
    init(roomIdFromUrl);
  } else if (window.LAUNCHAR && window.LAUNCHAR.isSupported) {
    console.log("WebXR not supported. Using LaunchXR for AR support.");
    window.LAUNCHAR.initialize({
      key: "OT58Wuy5RITCnvlaArd1DpN9LFjIs1Nj",
      redirect: true,
    }).then(() => {
      window.LAUNCHAR.on("arSessionStarted", () => {
        console.log("LaunchXR AR session started.");
        init(roomIdFromUrl);
      });
    });
  } else {
    console.log("Neither WebXR nor LaunchXR is supported. Using AR.js as fallback.");
  }
};

initApp();