import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import $ from "jquery";
import { createClient } from "@supabase/supabase-js";
// import { initARjs } from "./arjs.js";

const SUPABASE_URL = "https://zxietxwfjlcfhtiygxhe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aWV0eHdmamxjZmh0aXlneGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTUzMzUsImV4cCI6MjA0NzMzMTMzNX0.XTeIR13UCRlT4elaeiKiDll1XRD1WoVnLsPd3QVVGDU"; // Replace with your actual anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let container;
let camera, scene, renderer;
let controller, reticle, pmremGenerator, current_object, controls;
let placedObjects = [];
let selectedObject = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let touchDown, touchX, touchY, deltaX, deltaY;

const openNav = () => {
  document.getElementById("mySidenav").style.width = "250px";
};

const closeNav = () => {
  document.getElementById("mySidenav").style.width = "0";
};

document.getElementById("open-nav").addEventListener("click", openNav);
document.getElementById("close-nav").addEventListener("click", closeNav);

$(".ar-object").click(function () {
  // if (current_object != null) {
  //   scene.remove(current_object);
  // }
  loadModel($(this).attr("id"));
  const modelId = $(this).attr("id");
  console.log("Model ID clicked:", modelId);
});

$("#place-button").click(() => {
  arPlace();
});

///Supabase fetch models
const fetchModels = async () => {
  const { data, error } = await supabase.from("models").select("*");

  if (error) {
    console.error("Error fetching models:", error);
    alert("Failed to fetch models. Please try again later.");
    return;
  }

  const sidenav = document.getElementById("mySidenav");
  data.forEach((model) => {
    const modelItem = document.createElement("div");
    modelItem.className = "model-item";
    modelItem.id = `model-${model.id}`;

    const modelName = document.createElement("span");
    modelName.textContent = model.name;

    modelItem.appendChild(modelName);

    const previewContainer = document.createElement("div");
    previewContainer.id = `preview-${model.id}`;
    modelItem.appendChild(previewContainer);

    // Append to sidenav first to ensure it's in the DOM
    sidenav.appendChild(modelItem);

    // Call renderModelPreview after appending
    const previewId = `preview-${model.id}`;
    const containerExists = document.getElementById(previewId);
    if (containerExists) {
      renderModelPreview(model.glb_url, previewId);
    } else {
      console.error(`Preview container with ID ${previewId} not found.`);
    }

    modelItem.addEventListener("click", () => {
      // Remove 'active' class from all items
      document.querySelectorAll(".model-item").forEach((item) => {
        item.classList.remove("active");
      });

      // Add 'active' class to the clicked item
      modelItem.classList.add("active");

      // Load the selected model
      if (current_object) scene.remove(current_object);
      loadModel(model.glb_url, model.id);
    });
  });
};

const showObjectDetails = async (objectId) => {
  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("id", objectId)
    .single();

  if (error) {
    console.error("Error fetching object details:", error);
    alert("Failed to fetch object details.");
    return;
  }

  // Update the popup with model details
  const popup = document.getElementById("popup");
  popup.innerHTML = `
    <h2>${data.name}</h2>
    <p>${data.description}</p>
  `;
  popup.style.display = "block"; // Make it visible
  popup.style.zIndex = "1000";

  popup.addEventListener("click", () => {
    popup.style.display = "none";
  });
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
    (glb) => {
      current_object = glb.scene;
      current_object.userData.objectId = id;

      current_object.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      console.log("Model loaded successfully:", url, id);
    },
    undefined,
    (error) =>
      console.error("An error occurred while loading the model:", error)
  );
};

const arPlace = () => {
  if (reticle.visible && current_object) {
    const placedObject = current_object.clone();
    placedObject.position.setFromMatrixPosition(reticle.matrix);
    placedObject.visible = true;

    placedObject.traverse((node) => {
      if (node.isMesh) {
        node.userData.objectId = current_object.userData.objectId;
      }
    });

    scene.add(placedObject);
    placedObjects.push(placedObject);

    selectedObject = placedObject;

    console.log("Object placed with ID:", current_object.userData.objectId);
  }
};

// const arPlace = () => {
//   if (reticle.visible && current_object) {
//     const placedObject = current_object.clone();
//     placedObject.position.setFromMatrixPosition(reticle.matrix);
//     placedObject.visible = true;

//     scene.add(placedObject);
//     placedObjects.push(placedObject);

//     placedObject.userData.objectId = current_object.userData.objectId;

//     selectedObject = placedObject;

//     console.log("Object placed at:", placedObject.position);
//   }
// };

const rotateObjects = () => {
  if (selectedObject) {
    selectedObject.rotation.y += deltaX / 100;
  }
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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

const renderModelPreview = (modelUrl, containerId) => {
  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
  previewCamera.position.set(2, 2, 2);
  previewCamera.lookAt(0, 0, 0);

  const previewLight = new THREE.AmbientLight(0xffffff, 1);
  previewScene.add(previewLight);

  const previewRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  previewRenderer.setSize(200, 200); // Adjust preview size as needed

  // Attach the renderer canvas to the menu
  const container = document.getElementById(containerId);
  container.appendChild(previewRenderer.domElement);

  // Load and render the model
  const loader = new GLTFLoader();
  loader.load(modelUrl, (gltf) => {
    const model = gltf.scene;
    previewScene.add(model);

    // Adjust model scaling and positioning if necessary
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    model.scale.setScalar(1 / maxDim);
    model.position.sub(center);

    // Render the model into the canvas
    previewRenderer.render(previewScene, previewCamera);
  });
};

const init = () => {
  container = document.createElement("div");
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

  document.body.appendChild(ARButton.createButton(renderer, options));

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener("resize", onWindowResize);
  fetchModels();

  renderer.domElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchDown = true;
    touchX = e.touches[0].pageX;
    touchY = e.touches[0].pageY;
  });

  renderer.domElement.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchDown = false;
  });

  renderer.domElement.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!touchDown) return;

    deltaX = e.touches[0].pageX - touchX;
    deltaY = e.touches[0].pageY - touchY;
    touchX = e.touches[0].pageX;
    touchY = e.touches[0].pageY;
    rotateObjects();

    if (selectedObject) {
      const scaleFactor = 1 - deltaY / 1000;
      selectedObject.scale.multiplyScalar(scaleFactor);
    }
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(placedObjects, true);

    console.log("Intersected objects:", intersects);

    if (intersects.length > 0) {
      let clickedObject = intersects[0].object;

      while (clickedObject.parent && clickedObject.parent !== scene) {
        clickedObject = clickedObject.parent;
      }

      selectedObject = clickedObject;
      const objectId = selectedObject.userData.objectId;

      if (objectId) {
        console.log("Selected Object ID:", objectId);
        showObjectDetails(objectId);
      } else {
        console.warn("No objectId found in userData");
      }
    }
  });

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
    init();
  } else if (window.LAUNCHAR && window.LAUNCHAR.isSupported) {
    console.log("WebXR not supported. Using LaunchXR for AR support.");
    // Initialize LaunchAR
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
      "Neither WebXR nor LaunchXR is supported. Using AR.js as fallback."
    ); // Use AR.js or another fallback
  }
};

initApp();
