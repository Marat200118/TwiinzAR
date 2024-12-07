import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const generateHighQualityPreview = async (
  modelUrl,
  width = 800,
  height = 800
) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.debug.checkShaderErrors = true;
  renderer.setSize(width, height);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(1.3, 1.3, 1.3);
  camera.lookAt(0, 0, 0);

  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        try {
          const model = gltf.scene;

          model.traverse((node) => {
            if (node.isMesh) {
              if (
                !node.material ||
                !(node.material instanceof THREE.Material)
              ) {
                console.warn("Replacing invalid material on mesh:", node);
                node.material = new THREE.MeshStandardMaterial({
                  color: 0xcccccc, // Default color
                  flatShading: true,
                });
              }
            }
          });

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
        } catch (error) {
          console.error("Rendering error:", error);
          reject(error);
        }
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        reject(error);
      }
    );
  });
};


// export { generateHighQualityPreview };
