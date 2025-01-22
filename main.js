import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings
const settings = {
  speed: 2.0,
  noiseScale: 0.01,
  noiseIntensity: 1.0,
  slideDirection: { x: 1.0, y: 0.0 },
  colorA: '#ff0000',
  colorB: '#0000ff',
  mixRatio: 0.5
};

// GUI setup
const gui = new dat.GUI();
gui.add(settings, 'speed', 0.1, 5.0).name('Animation Speed');
gui.add(settings, 'noiseScale', 0.001, 0.05).name('Noise Scale');
gui.add(settings, 'noiseIntensity', 0.0, 2.0).name('Noise Intensity');
gui.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
gui.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');
gui.add(settings, 'mixRatio', 0, 1).name('Color Mix Ratio');
gui.addColor(settings, 'colorA').name('Color A');
gui.addColor(settings, 'colorB').name('Color B');

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

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const t = time * 0.001 * settings.speed;

  // Rotate objects
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;
  torus.rotation.x += 0.01;
  torus.rotation.y += 0.01;

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