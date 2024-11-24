import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU"; // Replace with your key
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let scene, camera, renderer, reticle, roomId;
const loader = new GLTFLoader();

const init = async (id) => {
  roomId = id;
  // Setup Three.js scene
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

  document.body.appendChild(ARButton.createButton(renderer));

  // Create a reticle for placing objects
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Fetch models and add them to the scene
  await fetchAndPlaceModels();

  renderer.setAnimationLoop(animate);
};


const fetchAndPlaceModels = async () => {
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

const animate = () => {
  renderer.render(scene, camera);
};

// Get the room ID from the URL and initialize the AR environment
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("id"); // Get the 'id' parameter
init(roomIdFromUrl); // Pass it to the init function