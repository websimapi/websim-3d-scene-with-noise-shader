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
  timeScale: 1.0,
  brightnessThreshold: 0.1,
  speedSteps: 5.0,
  moveSpeed: 0.01,
  // Animation settings
  rotationSpeed: 0.01,
  // Direction controls
  directionX: 1.0,
  directionY: 1.0,
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
  uniform float speedSteps;
  uniform float moveSpeed;
  uniform vec2 direction;
  uniform vec3 noiseColor;
  uniform vec2 resolution;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec2 wrap(vec2 value, vec2 size) {
    return mod(mod(value, size) + size, size);
  }

  vec2 getMovedUv(vec2 uv, vec2 size) {
    return wrap(uv + direction * moveSpeed, size);
  }

  float getBrightness(vec3 color) {
    return (color.r + color.g + color.b) / 3.0;
  }

  void main() {
    vec2 st = vUv;
    vec2 size = resolution;
    float scaledTime = time * timeScale;
    
    vec2 movedUv = getMovedUv(st, vec2(1.0));
    float currentNoise = random(st + scaledTime);
    float movedNoise = random(movedUv + scaledTime);
    
    float frame = floor(scaledTime * 10.0);
    float brightness = getBrightness(vec3(currentNoise));
    float frameDivisor = speedSteps - max(ceil(speedSteps * min(brightness, 1.0)), 1.0) + 1.0;
    bool isRightFrame = mod(frame, frameDivisor) == 0.0;
    
    float value;
    if (brightness < brightnessThreshold || !isRightFrame) {
      value = movedNoise;
    } else {
      value = mix(currentNoise, movedNoise, 0.5);
    }
    
    gl_FragColor = vec4(noiseColor * value, 1.0);
  }
`;

// Create materials with different time offsets for variety
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      timeScale: { value: settings.timeScale },
      brightnessThreshold: { value: settings.brightnessThreshold },
      speedSteps: { value: settings.speedSteps },
      moveSpeed: { value: settings.moveSpeed },
      direction: { value: new THREE.Vector2(settings.directionX, settings.directionY) },
      noiseColor: { value: new THREE.Color(settings.noiseColor) },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
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
shaderFolder.add(settings, 'speedSteps', 1, 10).step(1).name('Speed Steps');
shaderFolder.add(settings, 'moveSpeed', 0, 0.1).name('Move Speed');

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

  // Update object visibility
  cube.visible = settings.showCube;
  sphere.visible = settings.showSphere;
  torus.visible = settings.showTorus;

  // Rotate objects
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
    material.uniforms.time.value = t + index;
    material.uniforms.timeScale.value = settings.timeScale;
    material.uniforms.brightnessThreshold.value = settings.brightnessThreshold;
    material.uniforms.speedSteps.value = settings.speedSteps;
    material.uniforms.moveSpeed.value = settings.moveSpeed;
    material.uniforms.direction.value.set(settings.directionX, settings.directionY);
    material.uniforms.noiseColor.value.set(settings.noiseColor);
  });

  // Update background color
  scene.background = new THREE.Color(settings.backgroundColor);

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
  const materials = [cube.material, sphere.material, torus.material, backgroundMaterial];
  materials.forEach(material => {
    material.uniforms.resolution.value = resolution;
  });
}

animate(0);