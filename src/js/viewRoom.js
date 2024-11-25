import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let scene, camera, renderer, reticle, roomId;
const loader = new GLTFLoader();
let modelsData = []; // To store models and their 3D objects

const init = async (id) => {
  roomId = id;

  const roomContentInformation = async () => {
    const roomContent = document.querySelector(".room-content");
    const roomInfoId = document.createElement("h2");
    roomInfoId.innerHTML = "Room ID: " + id;
    roomContent.appendChild(roomInfoId);

    const modelsInfo = document.createElement("div");
    modelsInfo.className = "models-info";
    roomContent.appendChild(modelsInfo);

    // Fetch and display models info
    await fetchModelsInfo(modelsInfo);
  };

  roomContentInformation();

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

  const arButton = ARButton.createButton(renderer);
  document.body.appendChild(arButton);
  arButton.classList.add("styled-ar-button");

  // Hide models initially
  renderer.xr.addEventListener("sessionstart", () => showModelsInScene());
  renderer.xr.addEventListener("sessionend", () => hideModelsInScene());

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  await fetchModels();

  renderer.setAnimationLoop(animate);
};

const fetchModels = async () => {
  try {
    const { data: models, error } = await supabase
      .from("roommodels")
      .select("model_id, position, rotation, scale, models (glb_url)")
      .eq("room_id", roomId);

    if (error) throw error;

    models.forEach((modelData) => {
      const { glb_url } = modelData.models;
      const { position, rotation, scale } = modelData;

      loader.load(
        glb_url,
        (gltf) => {
          const object = gltf.scene;
          object.position.set(position.x, position.y, position.z);
          object.rotation.set(rotation.x, rotation.y, rotation.z);
          object.scale.set(scale.x, scale.y, scale.z);
          object.visible = false; // Initially hide the object
          modelsData.push(object);
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

const fetchModelsInfo = async (modelsInfoContainer) => {
  try {
    const { data: models, error } = await supabase
      .from("roommodels")
      .select("model_id, models (name, description)")
      .eq("room_id", roomId);

    if (error) throw error;

    if (models.length === 0) {
      modelsInfoContainer.innerHTML = "<p>No models used in this room.</p>";
      return;
    }

    models.forEach((modelData) => {
      const { name, description } = modelData.models;

      const modelCard = document.createElement("div");
      modelCard.className = "model-card";
      modelCard.innerHTML = `
        <h3>${name}</h3>
        <p>${description}</p>
      `;

      modelsInfoContainer.appendChild(modelCard);
    });
  } catch (error) {
    console.error("Failed to fetch model information:", error);
    modelsInfoContainer.innerHTML = "<p>Failed to load model information.</p>";
  }
};

const showModelsInScene = () => {
  modelsData.forEach((object) => {
    object.visible = true; // Show the object when AR session starts
  });
};

const hideModelsInScene = () => {
  modelsData.forEach((object) => {
    object.visible = false; // Hide the object when AR session ends
  });
};

const animate = () => {
  renderer.render(scene, camera);
};

const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("id");
init(roomIdFromUrl);
