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

// const openNav = () => {
//   document.getElementById("mySidenav").classList.add("open");
// };

// const closeNav = () => {
//   document.getElementById("mySidenav").classList.remove("open");
// };

// document.getElementById("open-nav").addEventListener("click", openNav);
// document.getElementById("close-nav").addEventListener("click", closeNav);

const toggleNav = () => {
  const sidenav = document.getElementById("mySidenav");
  const navToggle = document.getElementById("nav-toggle");
  const isOpen = sidenav.classList.toggle("open");

  // Toggle the icon
  navToggle.textContent = isOpen ? "×" : "☰";
};

document.getElementById("nav-toggle").addEventListener("click", toggleNav);



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

const fetchModels = async () => {
  const { data, error } = await supabase.from("models").select("*");

  if (error) {
    console.error("Error fetching models:", error);
    alert("Failed to fetch models. Please try again later.");
    return;
  }

  const sidenav = document.getElementById("mySidenav");
  const categories = {};

  data.forEach((model) => {
    if (!categories[model.category]) {
      categories[model.category] = [];
    }
    categories[model.category].push(model);
  });

  for (const [category, models] of Object.entries(categories)) {
    const categoryRow = document.createElement("div");
    categoryRow.className = "category-row";

    const categoryLabel = document.createElement("h3");
    categoryLabel.textContent = category;
    // categoryLabel.style.color = "#fff";
    sidenav.appendChild(categoryLabel);

    models.forEach((model) => {
      const modelItem = document.createElement("div");
      modelItem.className = "model-item";
      modelItem.id = `model-${model.id}`;

      const modelName = document.createElement("span");
      modelName.textContent = model.name;

      const previewContainer = document.createElement("div");
      previewContainer.id = `preview-${model.id}`;
      previewContainer.className = "preview-container";
      previewContainer.style.width = "100px";
      previewContainer.style.height = "100px";

      modelItem.appendChild(previewContainer);
      modelItem.appendChild(modelName);
      categoryRow.appendChild(modelItem);

      sidenav.appendChild(categoryRow);

      // renderModelPreview(model.glb_url, previewContainer.id);
      fetchAndRenderPreviews();

      modelItem.addEventListener("click", () => {
        document.querySelectorAll(".model-item").forEach((item) => {
          item.classList.remove("active");
        });

        modelItem.classList.add("active");

        if (current_object) {
          scene.remove(current_object);
        }

        // Ensure the correct URL is passed
        loadModel(model.glb_url, model.id);
      });
    });
  }
};

const generateHighQualityPreview = async (
  modelUrl,
  width = 800,
  height = 800
) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(1.5, 1.5, 1.5); //size of the model
  camera.lookAt(0, 0, 0);

  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        model.scale.setScalar(1 / maxDim);
        model.position.sub(center);

        scene.add(model);
        scene.background = new THREE.Color(0xffffff);

        renderer.render(scene, camera);

        const dataUrl = renderer.domElement.toDataURL("image/png");

        renderer.dispose();
        scene.clear();

        resolve(dataUrl);
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        reject(error);
      }
    );
  });
};

const fetchAndRenderPreviews = async () => {
  const { data: models, error } = await supabase.from("models").select("*");
  if (error) {
    console.error("Error fetching models:", error);
    return;
  }

  for (const model of models) {
    const previewUrl = await generateHighQualityPreview(model.glb_url);
    const container = document.getElementById(`preview-${model.id}`);
    if (container) {
      const img = document.createElement("img");
      img.src = previewUrl;
      img.style.width = "100%";
      img.style.height = "100%";
      container.innerHTML = "";
      container.appendChild(img);
    }
  }
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

// const initApp = async () => {
//   const webxrSupported = await isWebXRSupported();

//   if (webxrSupported) {
//     console.log("WebXR is supported. Initializing WebXR.");
//     init();
//   } else if (window.LAUNCHAR && window.LAUNCHAR.isSupported) {
//     console.log("WebXR not supported. Using LaunchXR for AR support.");
//     // Initialize LaunchAR
//     window.LAUNCHAR.initialize({
//       key: "OT58Wuy5RITCnvlaArd1DpN9LFjIs1Nj",
//       redirect: true,
//     }).then(() => {
//       window.LAUNCHAR.on("arSessionStarted", () => {
//         console.log("LaunchXR AR session started.");
//         init();
//       });
//     });
//   } else {
//     console.log(
//       "Neither WebXR nor LaunchXR is supported. Using AR.js as fallback."
//     ); // Use AR.js or another fallback
//   }
// };

// initApp();

init();
