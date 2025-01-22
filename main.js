import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/PointerLockControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Shared shader code for the noise effect
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec2 wrap(vec2 value, vec2 size) {
    return mod(mod(value, size) + size, size);
  }

  vec2 getMovedUv(vec2 uv, vec2 size) {
    vec2 direction = vec2(sin(time), cos(time));
    return wrap(uv + direction * 0.01, size);
  }

  float getBrightness(vec3 color) {
    return (color.r + color.g + color.b) / 3.0;
  }

  void main() {
    vec2 st = vUv;
    vec2 size = resolution;
    
    vec2 movedUv = getMovedUv(st, vec2(1.0));
    float currentNoise = random(st + time);
    float movedNoise = random(movedUv + time);
    
    float frame = floor(time * 10.0);
    float speedSteps = 5.0;
    float brightness = getBrightness(vec3(currentNoise));
    float frameDivisor = speedSteps - max(ceil(speedSteps * min(brightness, 1.0)), 1.0) + 1.0;
    bool isRightFrame = mod(frame, frameDivisor) == 0.0;
    
    float value;
    if (brightness < 0.1 || !isRightFrame) {
      value = movedNoise;
    } else {
      value = mix(currentNoise, movedNoise, 0.5);
    }
    
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

// Create post-processing effect
const effectComposer = {
  material: new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader,
    fragmentShader,
  })
};

// Movement setup
const moveSpeed = 5.0;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Controls setup
const controls = new PointerLockControls(camera, document.body);

// Add event listeners for pointer lock
document.addEventListener('click', function () {
  controls.lock();
});

// Movement controls
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = true;
      break;
    case 'KeyS':
      moveBackward = true;
      break;
    case 'KeyA':
      moveLeft = true;
      break;
    case 'KeyD':
      moveRight = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = false;
      break;
    case 'KeyS':
      moveBackward = false;
      break;
    case 'KeyA':
      moveLeft = false;
      break;
    case 'KeyD':
      moveRight = false;
      break;
  }
}

// Create a simple environment
function createEnvironment() {
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Add some random boxes as obstacles
  for (let i = 0; i < 50; i++) {
    const boxGeometry = new THREE.BoxGeometry(2, Math.random() * 5 + 1, 2);
    const boxMaterial = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(Math.random(), Math.random(), Math.random()) 
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.random() * 80 - 40;
    box.position.z = Math.random() * 80 - 40;
    box.position.y = boxGeometry.parameters.height / 2;
    scene.add(box);
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
}

// Set initial camera position
camera.position.y = 1.6; // Typical human height

// Create the environment
createEnvironment();

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const delta = time * 0.001;

  // Update movement
  velocity.x = 0;
  velocity.z = 0;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed;
  if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed;

  controls.moveRight(-velocity.x * 0.016);
  controls.moveForward(-velocity.z * 0.016);

  // Update shader uniforms
  effectComposer.material.uniforms.time.value = delta;
  
  // Custom render
  renderer.render(scene, camera);

  // Apply post-processing effect
  const currentRT = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update resolution uniform
  effectComposer.material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
}

animate(0);