import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Animation control
let isPaused = false;
const pauseButton = document.getElementById('pauseButton');
pauseButton.addEventListener('click', () => {
  isPaused = !isPaused;
  pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
});

// Shared shader code
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
    
    // Get moved UV coordinates
    vec2 movedUv = getMovedUv(st, vec2(1.0));
    
    // Generate noise values
    float currentNoise = random(st + time);
    float movedNoise = random(movedUv + time);
    
    // Create frame-based movement
    float frame = floor(time * 10.0);
    float speedSteps = 5.0;
    float brightness = getBrightness(vec3(currentNoise));
    float frameDivisor = speedSteps - max(ceil(speedSteps * min(brightness, 1.0)), 1.0) + 1.0;
    bool isRightFrame = mod(frame, frameDivisor) == 0.0;
    
    // Determine final color value
    float value;
    if (brightness < 0.1 || !isRightFrame) {
      value = movedNoise;
    } else {
      value = mix(currentNoise, movedNoise, 0.5);
    }
    
    // Output final color
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

// Create materials with different time offsets for variety
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader,
    fragmentShader,
  });
}

// Create objects with shader materials
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  createNoiseShaderMaterial()
);
scene.add(cube);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  createNoiseShaderMaterial(1.0)
);
sphere.position.x = 2;
scene.add(sphere);

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.3, 0.2, 16, 100),
  createNoiseShaderMaterial(2.0)
);
torus.position.x = -2;
scene.add(torus);

// Create background plane
const backgroundGeometry = new THREE.PlaneGeometry(20, 20);
const backgroundMaterial = createNoiseShaderMaterial(3.0);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
background.position.z = -5;
scene.add(background);

// Add lights
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 0, 2);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

camera.position.z = 5;

// Animation state
let lastTime = 0;
let accumulatedTime = 0;

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  if (!isPaused) {
    const deltaTime = lastTime ? (time - lastTime) * 0.001 : 0;
    accumulatedTime += deltaTime;
    
    // Rotate objects
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    sphere.rotation.x += 0.01;
    sphere.rotation.y += 0.01;
    torus.rotation.x += 0.01;
    torus.rotation.y += 0.01;

    // Update shader time uniforms
    cube.material.uniforms.time.value = accumulatedTime;
    sphere.material.uniforms.time.value = accumulatedTime + 1.0;
    torus.material.uniforms.time.value = accumulatedTime + 2.0;
    backgroundMaterial.uniforms.time.value = accumulatedTime + 3.0;
  }
  
  lastTime = time;
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update resolution uniforms
  const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  cube.material.uniforms.resolution.value = resolution;
  sphere.material.uniforms.resolution.value = resolution;
  torus.material.uniforms.resolution.value = resolution;
  backgroundMaterial.uniforms.resolution.value = resolution;
}

animate(0);