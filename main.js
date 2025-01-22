import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings
const settings = {
  speed: 2.0,
  noiseScale: 0.01,
  noiseIntensity: 1.0,
  slideDirection: { x: 1.0, y: 0.0 },
  colorA: '#ffffff',  
  colorB: '#000000',  
  mixRatio: 0.5,
  valueSteps: 2,
  slideFrequency: 1.0,
  pixelSize: 4, // Controls the effective pixel size
  differenceThreshold: 0.1 // Controls how sensitive the difference detection is
};

// GUI setup
const gui = new dat.GUI();
const animationFolder = gui.addFolder('Animation');
animationFolder.add(settings, 'speed', 0.1, 5.0).name('Animation Speed');
animationFolder.add(settings, 'slideFrequency', 0.1, 5.0).name('Slide Frequency');

const noiseFolder = gui.addFolder('Noise');
noiseFolder.add(settings, 'noiseScale', 0.001, 0.05).name('Noise Scale');
noiseFolder.add(settings, 'noiseIntensity', 0.0, 2.0).name('Noise Intensity');
noiseFolder.add(settings, 'valueSteps', 1, 10).step(1).name('Value Steps');

const directionFolder = gui.addFolder('Direction');
directionFolder.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
directionFolder.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');

const colorFolder = gui.addFolder('Colors');
colorFolder.add(settings, 'mixRatio', 0, 1).name('Color Mix Ratio');
colorFolder.addColor(settings, 'colorA').name('Color A');
colorFolder.addColor(settings, 'colorB').name('Color B');

const effectFolder = gui.addFolder('Effect Settings');
effectFolder.add(settings, 'pixelSize', 1, 16).step(1).name('Pixel Size');
effectFolder.add(settings, 'differenceThreshold', 0, 1).name('Difference Threshold');

// Open folders by default
animationFolder.open();
noiseFolder.open();
directionFolder.open();
colorFolder.open();
effectFolder.open();

// Scene setup remains the same
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Updated vertex shader code
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Updated fragment shader for more accurate effect
const fragmentShader = `
  uniform float time;
  uniform float noiseScale;
  uniform float noiseIntensity;
  uniform vec2 slideDirection;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float mixRatio;
  uniform float valueSteps;
  uniform float slideFrequency;
  uniform float pixelSize;
  uniform float differenceThreshold;
  
  varying vec2 vUv;
  varying vec3 vNormal;

  // Improved random function for better distribution
  float random(vec2 st) {
    vec2 s = vec2(dot(st, vec2(127.1, 311.7)),
                  dot(st, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(s.x * 53.3158 + s.y * 43.6143) * 43758.5453123);
  }

  // Value noise for smoother transitions
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Frame difference calculation
  float getFrameDifference(vec2 uv, float t) {
    // Calculate current and previous frame values
    float currentFrame = noise(uv * noiseScale + t * slideDirection);
    float prevFrame = noise(uv * noiseScale + (t - 0.1) * slideDirection);
    
    // Calculate difference and apply threshold
    float diff = abs(currentFrame - prevFrame);
    return step(differenceThreshold, diff) * currentFrame;
  }

  void main() {
    // Pixelate UV coordinates
    vec2 pixelatedUv = floor(vUv * pixelSize) / pixelSize;
    
    // Get cycling value based on frame difference
    float cycleValue = getFrameDifference(pixelatedUv, time * slideFrequency);
    
    // Quantize the value into steps
    cycleValue = floor(cycleValue * valueSteps) / max(1.0, valueSteps - 1.0);
    
    // Apply normal-based shading for depth
    float depth = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
    cycleValue = mix(cycleValue, cycleValue * depth, 0.3);
    
    // Final color calculation
    vec3 finalColor = mix(colorB, colorA, cycleValue * mixRatio);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Create noise shader material
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      noiseScale: { value: settings.noiseScale },
      noiseIntensity: { value: settings.noiseIntensity },
      slideDirection: { value: new THREE.Vector2(settings.slideDirection.x, settings.slideDirection.y) },
      colorA: { value: new THREE.Color(settings.colorA) },
      colorB: { value: new THREE.Color(settings.colorB) },
      mixRatio: { value: settings.mixRatio },
      valueSteps: { value: settings.valueSteps },
      slideFrequency: { value: settings.slideFrequency },
      pixelSize: { value: settings.pixelSize },
      differenceThreshold: { value: settings.differenceThreshold }
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

// Lighting setup remains the same
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

  // Update rotations
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;
  torus.rotation.x += 0.01;
  torus.rotation.y += 0.01;

  // Update all uniforms
  [cube.material, sphere.material, torus.material, backgroundMaterial].forEach((material, index) => {
    material.uniforms.time.value = t + index;
    material.uniforms.noiseScale.value = settings.noiseScale;
    material.uniforms.noiseIntensity.value = settings.noiseIntensity;
    material.uniforms.slideDirection.value.set(settings.slideDirection.x, settings.slideDirection.y);
    material.uniforms.colorA.value.set(settings.colorA);
    material.uniforms.colorB.value.set(settings.colorB);
    material.uniforms.mixRatio.value = settings.mixRatio;
    material.uniforms.valueSteps.value = settings.valueSteps;
    material.uniforms.slideFrequency.value = settings.slideFrequency;
    material.uniforms.pixelSize.value = settings.pixelSize;
    material.uniforms.differenceThreshold.value = settings.differenceThreshold;
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