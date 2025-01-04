import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer, controls, ambientLight, canvas;

function init(frameData, frameStates, frameGroups) {
  canvas = document.getElementById("canvas");
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 20;

  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  controls = new OrbitControls(camera, renderer.domElement);

  const axesHelper = new THREE.AxesHelper(5);
  const axesHelperNeg = new THREE.AxesHelper(-5);
  scene.add(axesHelper, axesHelperNeg);

  addLabel("X+", { x: 6, y: 0, z: 0 });
  addLabel("Y+", { x: 0, y: 6, z: 0 });
  addLabel("Z+", { x: 0, y: 0, z: 6 });

  if (frameData && frameData.length > 0) {
    renderBalls(scene, frameData, frameStates, frameGroups);
  }
}

function renderBalls(scene, matrixData, sliceIndex) {
  const ballRadius = 0.1;
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 16, 16);
  const ballMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    metalness: 0.3,
    roughness: 0.7 
  });
  
  const rows = matrixData.length;
  const cols = matrixData[0].length;
  const radius = 5; // Radius of the cylinder
  
  const group = new THREE.Group();
  
  // Calculate angle for this slice in the cylinder
  const angle = (sliceIndex * 2 * Math.PI) / 24; // 24 slices for a complete cylinder
  
  // Position the slice around the cylinder
  group.position.x = radius * Math.cos(angle);
  group.position.z = radius * Math.sin(angle);
  
  // Rotate the slice to face outward from the cylinder center
  group.rotation.y = angle + Math.PI / 2;
  
  group.userData.sliceIndex = sliceIndex;

  // Create balls based on matrix data
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (matrixData[row][col] === 1) {
        const ball = new THREE.Mesh(ballGeometry, ballMaterial.clone());
        ball.position.x = (col - (cols - 1) / 2) * spacing;
        ball.position.y = -(row - (rows - 1) / 2) * spacing;
        group.add(ball);
      }
    }
  }

  // Add interaction plane
  const planeGeometry = new THREE.PlaneGeometry(8, 8);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.01,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  group.add(plane);
  
  // Store the group reference
  sliceGroups.set(sliceIndex, group);
  sliceStates.set(sliceIndex, true);
  
  scene.add(group);
  
  // Add circular guide for visualization
  if (sliceIndex === 0) {
    const circleGeometry = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x444444, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = Math.PI / 2;
    scene.add(circle);
  }
  
  return group;
}

function setupMouseInteraction() {
  document.addEventListener("mousemove", (event) => {
    const canvasRect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Reset all visible groups to default state
    sliceGroups.forEach(group => {
      if (group.visible) {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry.type === "SphereGeometry") {
              child.material.color.set(0xff0000);
            } else if (child.geometry.type === "PlaneGeometry") {
              child.material.opacity = 0.01;
            }
          }
        });
      }
    });

    // Check for intersections with all visible planes
    const planes = Array.from(sliceGroups.values())
      .filter(group => group.visible)
      .map(group => group.children.find(child => child.geometry.type === "PlaneGeometry"));
    
    const intersects = raycaster.intersectObjects(planes);

    if (intersects.length > 0) {
      const intersectedPlane = intersects[0].object;
      const group = intersectedPlane.parent;
      
      // Highlight the intersected group
      intersectedPlane.material.opacity = 0.5;
      group.children.forEach(child => {
        if (child.geometry.type === "SphereGeometry") {
          child.material.color.set(0x00ff00);
        }
      });

      // Update tooltip
      const tooltip = document.getElementById("tooltip");
      const tooltipText = document.getElementById("tooltip-slice");
      tooltipText.textContent = group.userData.sliceIndex + 1;
      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY}px`;
      tooltip.style.display = "block";
    } else {
      document.getElementById("tooltip").style.display = "none";
    }
  });
}

function addLabel(text, position) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = "20px Arial";
  context.fillStyle = "white";
  context.fillText(text, 0, 20);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(position.x, position.y, position.z);
  scene.add(sprite);
}

function render() {
  renderer.render(scene, camera);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

export { init, animate, onWindowResize, scene };
