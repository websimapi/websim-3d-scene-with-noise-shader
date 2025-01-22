import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Settings object
const settings = {
  // Shader settings
  timeScale: 0.1,        // Slowed down significantly
  brightnessThreshold: 0.5,
  noiseAmount: 0.2,      // Control random noise influence
  // Direction controls
  directionX: 0.0,
  directionY: 1.0,       // Default downward movement
  // Animation settings
  rotationSpeed: 0.01,
  // Object visibility
  showCube: true,
  showSphere: true,
  showTorus: true,
  // Colors
  backgroundColor: '#000000',
  noiseColor: '#ffffff',
};

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
  uniform float timeScale;
  uniform float brightnessThreshold;
  uniform float noiseAmount;
  uniform vec2 direction;
  uniform vec3 noiseColor;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec2 wrap(vec2 value) {
    return fract(value);
  }

  float getBrightness(float value) {
    return value;
  }

  void main() {
    vec2 st = vUv;
    float t = floor(time * timeScale);  // Discrete time steps
    
    // Get current and neighboring pixel positions
    vec2 neighbor = wrap(st + direction * 0.01);
    
    // Generate base values
    float currentNoise = random(st + t);
    float neighborNoise = random(neighbor + t);
    
    // Determine if pixel should move based on brightness
    float brightness = getBrightness(currentNoise);
    bool shouldMove = brightness > brightnessThreshold;
    
    // Calculate final value
    float finalValue;
    if (shouldMove) {
      // Take value from neighbor
      finalValue = mix(currentNoise, neighborNoise, 0.8);
    } else {
      // Add slight noise variation
      finalValue = mix(currentNoise, random(st + t + 1.0), noiseAmount);
    }
    
    gl_FragColor = vec4(noiseColor * finalValue, 1.0);
  }
`;

// Create materials with different time offsets for variety
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      timeScale: { value: settings.timeScale },
      brightnessThreshold: { value: settings.brightnessThreshold },
      noiseAmount: { value: settings.noiseAmount },
      direction: { value: new THREE.Vector2(settings.directionX, settings.directionY) },
      noiseColor: { value: new THREE.Color(settings.noiseColor) }
    },
    vertexShader,
    fragmentShader,
  });
}

// Create objects
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

// Create background
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

// Setup GUI
const gui = new dat.GUI();

// Shader controls
const shaderFolder = gui.addFolder('Shader Settings');
shaderFolder.add(settings, 'timeScale', 0, 5).name('Time Scale');
shaderFolder.add(settings, 'brightnessThreshold', 0, 1).name('Brightness Threshold');
shaderFolder.add(settings, 'noiseAmount', 0, 1).name('Noise Amount');

// Direction controls
const directionFolder = gui.addFolder('Direction');
directionFolder.add(settings, 'directionX', -1, 1).name('X Direction');
directionFolder.add(settings, 'directionY', -1, 1).name('Y Direction');

// Animation controls
const animationFolder = gui.addFolder('Animation');
animationFolder.add(settings, 'rotationSpeed', 0, 0.1).name('Rotation Speed');

// Visibility controls
const visibilityFolder = gui.addFolder('Visibility');
visibilityFolder.add(settings, 'showCube').name('Show Cube');
visibilityFolder.add(settings, 'showSphere').name('Show Sphere');
visibilityFolder.add(settings, 'showTorus').name('Show Torus');

// Color controls
const colorFolder = gui.addFolder('Colors');
colorFolder.addColor(settings, 'backgroundColor').name('Background');
colorFolder.addColor(settings, 'noiseColor').name('Noise Color');

// Open all folders
shaderFolder.open();
directionFolder.open();
animationFolder.open();
visibilityFolder.open();
colorFolder.open();

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const t = time * 0.001;

  // Update object visibility and rotation
  cube.visible = settings.showCube;
  sphere.visible = settings.showSphere;
  torus.visible = settings.showTorus;

  if (settings.rotationSpeed > 0) {
    cube.rotation.x += settings.rotationSpeed;
    cube.rotation.y += settings.rotationSpeed;
    sphere.rotation.x += settings.rotationSpeed;
    sphere.rotation.y += settings.rotationSpeed;
    torus.rotation.x += settings.rotationSpeed;
    torus.rotation.y += settings.rotationSpeed;
  }

  // Update shader uniforms
  const materials = [cube.material, sphere.material, torus.material, backgroundMaterial];
  materials.forEach((material, index) => {
    material.uniforms.time.value = t;
    material.uniforms.timeScale.value = settings.timeScale;
    material.uniforms.brightnessThreshold.value = settings.brightnessThreshold;
    material.uniforms.noiseAmount.value = settings.noiseAmount;
    material.uniforms.direction.value.set(settings.directionX, settings.directionY);
    material.uniforms.noiseColor.value.set(settings.noiseColor);
  });

  scene.background = new THREE.Color(settings.backgroundColor);
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

animate(0);