import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let scene, camera, renderer, reticle, hitTestSource, hitTestSourceRequested;
const loader = new GLTFLoader();
let modelsData = [];
let modelsToPlace = [];
let roomId;


const fetchRoomDetails = async () => {
  try {
    const { data: room, error } = await supabase
      .from("rooms")
      .select("created_by_name", "room_name")
      .eq("id", roomId)
      .single();

    if (error) throw error;
    document.getElementById("room-name").textContent = `${room.room_name}`;
    document.getElementById("author-name").textContent = `By ${room.created_by_name}`;
    // document.getElementById("room-image").src =
    //   room.room_image || "/default-room.jpg";
    console.log(room.created_by_name);
    console.log(room);
  } catch (error) {
    console.error("Failed to fetch room details:", error);
    document.querySelector(".room-details").innerHTML =
      "<p>Failed to load room details.</p>";
  }
};


const fetchModelsInfo = async () => {
  const modelsInfoContainer = document.querySelector(".models-info");

  try {
    const { data: models, error } = await supabase
      .from("roommodels")
      .select("model_id, models (name, description, model_image, company)")
      .eq("room_id", roomId);

    if (error) throw error;

    if (!models.length) {
      modelsInfoContainer.innerHTML = "<p>No models in this room.</p>";
      return;
    }

    models.forEach(
      ({ models: { name, description, model_image, company } }) => {
        const modelCard = document.createElement("div");
        modelCard.className = "used-model";
        modelCard.innerHTML = `
        <h3>${name}</h3>
        <p>${description}</p>
        <p>Company: ${company}</p>
        <img src="${model_image}" alt="${name}" />
      `;
        modelsInfoContainer.appendChild(modelCard);
      }
    );
  } catch (error) {
    console.error("Failed to fetch model information:", error);
    modelsInfoContainer.innerHTML = "<p>Failed to load model information.</p>";
  }
};

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

    // await fetchModelsInfo(modelsInfo);
    fetchRoomDetails();
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

  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  document.body.appendChild(arButton);
  arButton.classList.add("styled-ar-button");

  setTimeout(() => {
    if (arButton.textContent === "START AR") {
      arButton.textContent = "START EXPERIENCE";
    }
  }, 100);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  //  await fetchRoomDetails();
   await fetchModelsInfo();
   fetchModels();

  renderer.setAnimationLoop(animate);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
  renderer.xr.addEventListener("sessionend", onSessionEnd);
};

const onSessionStart = () => {
  const content = document.querySelector(".room-content");
  content.style.display = "none";
  const session = renderer.xr.getSession();

  session.requestReferenceSpace("viewer").then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      hitTestSource = source;
    });
  });

  session.addEventListener("end", () => {
    const content = document.querySelector(".room-content");
    content.style.display = "block";
    hitTestSource = null;
    hitTestSourceRequested = false;
  });

  hitTestSourceRequested = true;
};

const onSessionEnd = () => {
  // const content = document.querySelector(".room-content");
  const body = document.querySelector("body");
  body.style.display = "block";
  // content.style.display = "block";
  hitTestSource = null;
  reticle.visible = false;
};

const fetchModels = async () => {
  try {
    const { data: models, error } = await supabase
      .from("roommodels")
      .select("model_id, position, rotation, scale, models (glb_url)")
      .eq("room_id", roomId);

    if (error) throw error;

    console.log(models);

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

          const boundingBox = new THREE.Box3().setFromObject(model);
          const modelHeight = boundingBox.max.y - boundingBox.min.y;

          model.position.set(
            hitPosition.x + originalPosition.x,
            hitPosition.y + originalPosition.y + modelHeight / 2,
            hitPosition.z + originalPosition.z
          );

          model.visible = true;
          modelsData.push(model);
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

const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("id");
init(roomIdFromUrl);
