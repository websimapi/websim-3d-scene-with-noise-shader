import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChildواء(renderer.domElement);

// Animation settings
const settings = {
  animationSpeed: 0.01,
  rotationSpeed: 0.01,
  objectScale: 1.0,
  noiseSpeed: 10,
  isPaused: false
};

// Setup controls
const pauseButton = document.getElementById('pauseButton');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const rotationSlider = document.getElementById('rotationSlider');
const rotationValue = document.getElementById('rotationValue');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const noiseSpeedSlider = document.getElementById('noiseSpeedSlider');
const noiseSpeedValue = document.getElementById('noiseSpeedValue');

// Control event listeners
pauseButton.addEventListener('click', () => {
  settings.isPaused = !settings.isPaused;
  pauseButton.textContent = settings.isPaused ? 'Resume' : 'Pause';
});

function setupSliderWithValue(slider, value, setting) {
  slider.addEventListener('input', () => {
    value.value = slider.value;
    settings[setting] = parseFloat(slider.value);
    updateObjectScales();
  });
  value.addEventListener('input', () => {
    slider.value = value.value;
    settings[setting] = parseFloat(value.value);
    updateObjectScales();
  });
}

setupSliderWithValue(speedSlider, speedValue, 'animationSpeed');
setupSliderWithValue(rotationSlider, rotationValue, 'rotationSpeed');
setupSliderWithValue(scaleSlider, scaleValue, 'objectScale');
setupSliderWithValue(noiseSpeedSlider, noiseSpeedValue, 'noiseSpeed');

function updateObjectScales() {
  cube.scale.set(settings.objectScale, settings.objectScale, settings.objectScale);
  sphere.scale.set(settings.objectScale, settings.objectScale, settings.objectScale);
  torus.scale.set(settings.objectScale, settings.objectScale, settings.objectScale);
}

// Shared vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Object fragment shader (moving right)
const objectFragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;

  float random(vec2 st) {
    return step(0.5, fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123));
  }

  vec2 wrap(vec2 value, vec2 size) {
    return mod(mod(value, size) + size, size);
  }

  vec2 getMovedUv(vec2 uv, vec2 size) {
    // Move to the right
    vec2 direction = vec2(1.0, 0.0);
    return wrap(uv + direction * 0.01, size);
  }

  void main() {
    vec2 st = vUv;
    vec2 size = vec2(1.0);
    
    vec2 movedUv = getMovedUv(st, size);
    
    float currentNoise = random(st + time);
    float movedNoise = random(movedUv + time);
    
    float frame = floor(time * 10.0);
    bool shouldMove = mod(frame, 2.0) == 0.0;
    
    float value = shouldMove ? movedNoise : currentNoise;
    
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

// Background fragment shader (moving left)
const backgroundFragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;

  float random(vec2 st) {
    return step(0.5, fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123));
  }

  vec2 wrap(vec2 value, vec2 size) {
    return mod(mod(value, size) + size, size);
  }

  vec2 getMovedUv(vec2 uv, vec2 size) {
    // Move to the left
    vec2 direction = vec2(-1.0, 0.0);
    return wrap(uv + direction * 0.01, size);
  }

  void main() {
    vec2 st = vUv;
    vec2 size = vec2(1.0);
    
    vec2 movedUv = getMovedUv(st, size);
    
    float currentNoise = random(st + time);
    float movedNoise = random(movedUv + time);
    
    float frame = floor(time * 10.0);
    bool shouldMove = mod(frame, 2.0) == 0.0;
    
    float value = shouldMove ? movedNoise : currentNoise;
    
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

// Create materials with different time offsets for variety
function createObjectShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader,
    fragmentShader: objectFragmentShader,
  });
}

function createBackgroundShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader,
    fragmentShader: backgroundFragmentShader,
  });
}

// Create objects with shader materials
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  createObjectShaderMaterial()
);
scene.add(cube);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  createObjectShaderMaterial(1.0)
);
sphere.position.x = 2;
scene.add(sphere);

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.3, 0.2, 16, 100),
  createObjectShaderMaterial(2.0)
);
torus.position.x = -2;
scene.add(torus);

// Create background plane with left-moving shader
const backgroundGeometry = new THREE.PlaneGeometry(20, 20);
const backgroundMaterial = createBackgroundShaderMaterial(3.0);
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

// Modified animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  if (!settings.isPaused) {
    const deltaTime = lastTime ? (time - lastTime) * settings.animationSpeed : 0;
    accumulatedTime += deltaTime;
    
    // Rotate objects
    const rotation = settings.rotationSpeed;
    cube.rotation.x += rotation;
    cube.rotation.y += rotation;
    sphere.rotation.x += rotation;
    sphere.rotation.y += rotation;
    torus.rotation.x += rotation;
    torus.rotation.y += rotation;

    // Update shader time uniforms with noise speed
    const timeScale = accumulatedTime * settings.noiseSpeed;
    cube.material.uniforms.time.value = timeScale;
    sphere.material.uniforms.time.value = timeScale + 1.0;
    torus.material.uniforms.time.value = timeScale + 2.0;
    backgroundMaterial.uniforms.time.value = timeScale + 3.0;
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