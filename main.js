import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings
const settings = {
  // Shader settings
  speed: 2.0,
  noiseScale: 0.01,
  noiseIntensity: 1.0,
  slideDirection: { x: 1.0, y: 0.0 },
  colorA: '#ff0000',
  colorB: '#0000ff',
  mixRatio: 0.5,
  
  // Object settings
  cube: {
    rotationSpeed: { x: 0.01, y: 0.01, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 0, z: 0 }
  },
  sphere: {
    rotationSpeed: { x: 0.01, y: 0.01, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    position: { x: 2, y: 0, z: 0 }
  },
  torus: {
    rotationSpeed: { x: 0.01, y: 0.01, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    position: { x: -2, y: 0, z: 0 }
  },
  background: {
    scale: { x: 20, y: 20, z: 1 },
    position: { x: 0, y: 0, z: -5 }
  }
};

// GUI setup
const gui = new dat.GUI();

// Shader controls folder
const shaderFolder = gui.addFolder('Shader Settings');
shaderFolder.add(settings, 'speed', 0.1, 5.0).name('Animation Speed');
shaderFolder.add(settings, 'noiseScale', 0.001, 0.05).name('Noise Scale');
shaderFolder.add(settings, 'noiseIntensity', 0.0, 2.0).name('Noise Intensity');
shaderFolder.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
shaderFolder.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');
shaderFolder.add(settings, 'mixRatio', 0, 1).name('Color Mix Ratio');
shaderFolder.addColor(settings, 'colorA').name('Color A');
shaderFolder.addColor(settings, 'colorB').name('Color B');
shaderFolder.open();

// Object control folders
function addObjectControls(folder, objSettings, name) {
  const posFolder = folder.addFolder(name + ' Position');
  posFolder.add(objSettings.position, 'x', -5, 5).name('X');
  posFolder.add(objSettings.position, 'y', -5, 5).name('Y');
  posFolder.add(objSettings.position, 'z', -5, 5).name('Z');

  const scaleFolder = folder.addFolder(name + ' Scale');
  scaleFolder.add(objSettings.scale, 'x', 0.1, 3).name('X');
  scaleFolder.add(objSettings.scale, 'y', 0.1, 3).name('Y');
  scaleFolder.add(objSettings.scale, 'z', 0.1, 3).name('Z');

  if (objSettings.rotationSpeed) {
    const rotFolder = folder.addFolder(name + ' Rotation Speed');
    rotFolder.add(objSettings.rotationSpeed, 'x', -0.1, 0.1).name('X');
    rotFolder.add(objSettings.rotationSpeed, 'y', -0.1, 0.1).name('Y');
    rotFolder.add(objSettings.rotationSpeed, 'z', -0.1, 0.1).name('Z');
  }
}

const objectsFolder = gui.addFolder('Objects');
addObjectControls(objectsFolder, settings.cube, 'Cube');
addObjectControls(objectsFolder, settings.sphere, 'Sphere');
addObjectControls(objectsFolder, settings.torus, 'Torus');
addObjectControls(objectsFolder, settings.background, 'Background');
objectsFolder.open();

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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
  uniform float noiseScale;
  uniform float noiseIntensity;
  uniform vec2 slideDirection;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float mixRatio;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 st = vUv;
    float slide = floor(time * 2.0);
    
    // Use slide direction for neighbor calculation
    vec2 neighbor = st + noiseScale * slideDirection * sin(time);
    
    float r1 = random(st + time);
    float r2 = random(neighbor + time);
    
    float noise = mix(r1, r2, step(0.5, random(st + slide))) * noiseIntensity;
    
    // Mix colors based on noise and mixRatio
    vec3 finalColor = mix(colorA, colorB, noise * mixRatio);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Create materials with different time offsets for variety
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      noiseScale: { value: settings.noiseScale },
      noiseIntensity: { value: settings.noiseIntensity },
      slideDirection: { value: new THREE.Vector2(settings.slideDirection.x, settings.slideDirection.y) },
      colorA: { value: new THREE.Color(settings.colorA) },
      colorB: { value: new THREE.Color(settings.colorB) },
      mixRatio: { value: settings.mixRatio }
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
scene.add(sphere);

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.3, 0.2, 16, 100),
  createNoiseShaderMaterial(2.0)
);
scene.add(torus);

// Create background plane
const backgroundGeometry = new THREE.PlaneGeometry(1, 1);
const backgroundMaterial = createNoiseShaderMaterial(3.0);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
scene.add(background);

// Add lights
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 0, 2);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

camera.position.z = 5;

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const t = time * 0.001 * settings.speed;

  // Update object transformations
  function updateObject(obj, objSettings) {
    // Position
    obj.position.set(
      objSettings.position.x,
      objSettings.position.y,
      objSettings.position.z
    );
    
    // Scale
    obj.scale.set(
      objSettings.scale.x,
      objSettings.scale.y,
      objSettings.scale.z
    );
    
    // Rotation (if applicable)
    if (objSettings.rotationSpeed) {
      obj.rotation.x += objSettings.rotationSpeed.x;
      obj.rotation.y += objSettings.rotationSpeed.y;
      obj.rotation.z += objSettings.rotationSpeed.z;
    }
  }

  updateObject(cube, settings.cube);
  updateObject(sphere, settings.sphere);
  updateObject(torus, settings.torus);
  updateObject(background, settings.background);

  // Update all uniforms for all materials
  [cube.material, sphere.material, torus.material, backgroundMaterial].forEach((material, index) => {
    material.uniforms.time.value = t + index;
    material.uniforms.noiseScale.value = settings.noiseScale;
    material.uniforms.noiseIntensity.value = settings.noiseIntensity;
    material.uniforms.slideDirection.value.set(settings.slideDirection.x, settings.slideDirection.y);
    material.uniforms.colorA.value.set(settings.colorA);
    material.uniforms.colorB.value.set(settings.colorB);
    material.uniforms.mixRatio.value = settings.mixRatio;
  });

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