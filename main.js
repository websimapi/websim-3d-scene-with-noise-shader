import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings (adjusted for phi phenomenon)
const settings = {
  speed: 0.5, // Slower default speed
  noiseScale: 1.0, // Increased scale
  slideDirection: { x: 1.0, y: 0.0 }, // Default horizontal movement
  colorA: '#ffffff',
  colorB: '#000000',
  mixRatio: 1.0,
  valueSteps: 2, // Binary effect
  slideFrequency: 0.5, // Slower updates
  pixelSize: 16, // Medium pixel size
  differenceThreshold: 0.2, // Increased threshold
  motionBlur: 0.98, // Higher motion persistence
  randomSeed: 12345,
  invert: false
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
noiseFolder.add(settings, 'pixelSize', 2, 128).step(2).name('Pixel Size');
noiseFolder.add(settings, 'differenceThreshold', 0.05, 0.5).name('Motion Sensitivity');

const directionFolder = gui.addFolder('Direction');
directionFolder.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
directionFolder.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');

const colorFolder = gui.addFolder('Colors');
colorFolder.add(settings, 'mixRatio', 0, 1).name('Contrast');
colorFolder.addColor(settings, 'colorA').name('Color A');
colorFolder.addColor(settings, 'colorB').name('Color B');

const advancedFolder = gui.addFolder('Advanced');
advancedFolder.add(settings, 'randomSeed', 0, 100000).name('Random Seed');
advancedFolder.add(settings, 'invert').name('Invert');

// Open folders by default
animationFolder.open();
noiseFolder.open();
directionFolder.open();
colorFolder.open();
advancedFolder.open();

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

// Updated fragment shader with improved motion detection
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
  uniform float randomSeed;
  uniform bool invert;
  
  varying vec2 vUv;
  varying vec3 vNormal;

  // Improved noise function for more natural movement
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float getFrameValue(vec2 uv, float t) {
    vec2 screenSize = vec2(${window.innerWidth}.0, ${window.innerHeight}.0);
    vec2 pixCoord = floor(uv * screenSize / pixelSize) * pixelSize;
    vec2 normCoord = pixCoord / screenSize;
    
    // Improved motion calculation
    float timeStep = floor(t * slideFrequency);
    vec2 slideOffset = slideDirection * timeStep;
    vec2 currentPos = normCoord + slideOffset / screenSize;
    vec2 prevPos = currentPos - slideDirection * differenceThreshold;
    
    // Sample multiple points for better motion detection
    float value = 0.0;
    for(int i = 0; i < 4; i++) {
      float offset = float(i) * 0.25;
      vec2 samplePos = mix(prevPos, currentPos, offset);
      value += hash(samplePos * noiseScale + randomSeed + timeStep);
    }
    value *= 0.25;
    
    // Motion persistence
    float prevValue = hash(prevPos * noiseScale + randomSeed + timeStep - 1.0);
    float motionFactor = length(slideDirection) * slideFrequency;
    value = mix(value, prevValue, motionBlur * motionFactor);
    
    // Quantize with improved contrast
    value = floor(value * valueSteps) / max(1.0, valueSteps - 1.0);
    value = smoothstep(0.1, 0.9, value);
    
    return invert ? 1.0 - value : value;
  }

  void main() {
    float value = getFrameValue(vUv, time);
    
    // Enhanced normal-based shading
    float shading = dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))) * 0.5 + 0.5;
    value = mix(value, value * shading, 0.3);
    
    // Improved color mixing
    vec3 finalColor = mix(colorB, colorA, smoothstep(0.0, 1.0, value * mixRatio));
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
      motionBlur: { value: settings.motionBlur },
      randomSeed: { value: settings.randomSeed },
      invert: { value: settings.invert }
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
const backgroundGeometry = new THREE.PlaneGeometry(40, 40);
const backgroundMaterial = createNoiseShaderMaterial(3.0);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
background.position.z = -10;
scene.add(background);

// Lighting
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 0, 2);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

camera.position.z = 5;

// Enhanced animation loop for smoother motion
function animate(time) {
  requestAnimationFrame(animate);
  
  const t = time * 0.001 * settings.speed;

  // Smoother rotation speeds
  const rotationSpeed = 0.005;
  cube.rotation.x += rotationSpeed;
  cube.rotation.y += rotationSpeed;
  sphere.rotation.x += rotationSpeed * 0.8;
  sphere.rotation.y += rotationSpeed * 1.2;
  torus.rotation.x += rotationSpeed * 1.1;
  torus.rotation.y += rotationSpeed * 0.9;

  // Update all materials
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
    material.uniforms.time.value = t + index * 0.5; // Offset timing for variety
  });

  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  
  // Update all materials with new screen dimensions
  [cube.material, sphere.material, torus.material, backgroundMaterial].forEach(material => {
    material.needsUpdate = true;
  });
}

animate(0);