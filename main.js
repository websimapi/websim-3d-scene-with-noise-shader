import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings
const settings = {
  speed: 0.5, // Slower default speed
  noiseScale: 1.0,
  slideDirection: { x: 1.0, y: 0.0 },
  colorA: '#ffffff',
  colorB: '#000000',
  mixRatio: 1.0, // Full contrast by default
  valueSteps: 2, // Keep at 2 as recommended
  slideFrequency: 1.0,
  pixelSize: 8, // Larger default pixels
  differenceThreshold: 0.2, // More pronounced difference detection
  motionBlur: 0.8 // New setting for motion trail strength
};

// GUI setup
const gui = new dat.GUI();
const animationFolder = gui.addFolder('Animation');
animationFolder.add(settings, 'speed', 0.1, 2.0).name('Animation Speed');
animationFolder.add(settings, 'slideFrequency', 0.1, 5.0).name('Slide Frequency');
animationFolder.add(settings, 'motionBlur', 0, 1).name('Motion Trail');

const noiseFolder = gui.addFolder('Effect');
noiseFolder.add(settings, 'noiseScale', 0.1, 2.0).name('Effect Scale');
noiseFolder.add(settings, 'valueSteps', 2, 4).step(1).name('Value Steps');
noiseFolder.add(settings, 'pixelSize', 2, 32).step(2).name('Pixel Size');
noiseFolder.add(settings, 'differenceThreshold', 0.05, 0.5).name('Motion Sensitivity');

const directionFolder = gui.addFolder('Direction');
directionFolder.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
directionFolder.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');

const colorFolder = gui.addFolder('Colors');
colorFolder.add(settings, 'mixRatio', 0, 1).name('Contrast');
colorFolder.addColor(settings, 'colorA').name('Color A');
colorFolder.addColor(settings, 'colorB').name('Color B');

// Open folders by default
animationFolder.open();
noiseFolder.open();
directionFolder.open();
colorFolder.open();

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Improved fragment shader with better frame difference detection
const fragmentShader = `
  uniform float time;
  uniform float noiseScale;
  uniform vec2 slideDirection;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float mixRatio;
  uniform float valueSteps;
  uniform float slideFrequency;
  uniform float pixelSize;
  uniform float differenceThreshold;
  uniform float motionBlur;
  
  varying vec2 vUv;
  varying vec3 vNormal;

  // Improved hash function
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Get frame value with motion detection
  float getFrameValue(vec2 uv, float t) {
    // Calculate base grid positions
    vec2 grid = floor(uv * pixelSize) / pixelSize;
    
    // Calculate motion vectors
    vec2 slideOffset = slideDirection * t * slideFrequency;
    vec2 currentPos = grid + slideOffset;
    vec2 prevPos = currentPos - slideDirection * differenceThreshold;
    
    // Sample multiple points for motion blur
    float currentValue = hash(currentPos);
    float prevValue = hash(prevPos);
    
    // Motion detection
    float diff = abs(currentValue - prevValue);
    float motionMask = smoothstep(0.0, differenceThreshold, diff);
    
    // Blend between current and previous based on motion
    return mix(
      currentValue,
      prevValue,
      motionMask * motionBlur
    );
  }

  void main() {
    // Calculate base value with motion
    float value = getFrameValue(vUv, time);
    
    // Quantize to steps
    value = floor(value * valueSteps) / max(1.0, valueSteps - 1.0);
    
    // Apply normal-based shading
    float shading = dot(vNormal, vec3(0.0, 1.0, 1.0)) * 0.5 + 0.5;
    value = mix(value, value * shading, 0.2);
    
    // Final color mix
    vec3 finalColor = mix(colorB, colorA, value * mixRatio);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Create shader material
function createNoiseShaderMaterial(timeOffset = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
      noiseScale: { value: settings.noiseScale },
      slideDirection: { value: new THREE.Vector2(settings.slideDirection.x, settings.slideDirection.y) },
      colorA: { value: new THREE.Color(settings.colorA) },
      colorB: { value: new THREE.Color(settings.colorB) },
      mixRatio: { value: settings.mixRatio },
      valueSteps: { value: settings.valueSteps },
      slideFrequency: { value: settings.slideFrequency },
      pixelSize: { value: settings.pixelSize },
      differenceThreshold: { value: settings.differenceThreshold },
      motionBlur: { value: settings.motionBlur }
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

// Background
const backgroundGeometry = new THREE.PlaneGeometry(20, 20);
const backgroundMaterial = createNoiseShaderMaterial(3.0);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
background.position.z = -5;
scene.add(background);

// Lighting
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

  // Update uniforms
  [cube.material, sphere.material, torus.material, backgroundMaterial].forEach((material, index) => {
    Object.entries(settings).forEach(([key, value]) => {
      if (material.uniforms[key]) {
        if (key === 'colorA' || key === 'colorB') {
          material.uniforms[key].value.set(value);
        } else if (key === 'slideDirection') {
          material.uniforms[key].value.set(value.x, value.y);
        } else {
          material.uniforms[key].value = value;
        }
      }
    });
    material.uniforms.time.value = t + index;
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