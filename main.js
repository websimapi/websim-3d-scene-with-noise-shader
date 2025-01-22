import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Global settings
const settings = {
  speed: 1.0,
  noiseScale: 0.5,
  slideDirection: { x: 1.0, y: 0.0 },
  colorA: '#ffffff',  
  colorB: '#000000',  
  mixRatio: 0.5,
  valueSteps: 2,
  slideFrequency: 1.0,
  pixelSize: 4,
  differenceThreshold: 0.1
};

// GUI setup
const gui = new dat.GUI();
const animationFolder = gui.addFolder('Animation');
animationFolder.add(settings, 'speed', 0.1, 5.0).name('Animation Speed');
animationFolder.add(settings, 'slideFrequency', 0.1, 5.0).name('Slide Frequency');

const noiseFolder = gui.addFolder('Effect');
noiseFolder.add(settings, 'noiseScale', 0.1, 2.0).name('Effect Scale');
noiseFolder.add(settings, 'valueSteps', 2, 10).step(1).name('Value Steps');
noiseFolder.add(settings, 'pixelSize', 1, 16).step(1).name('Pixel Size');
noiseFolder.add(settings, 'differenceThreshold', 0.01, 0.5).name('Difference Threshold');

const directionFolder = gui.addFolder('Direction');
directionFolder.add(settings.slideDirection, 'x', -1, 1).name('Slide Direction X');
directionFolder.add(settings.slideDirection, 'y', -1, 1).name('Slide Direction Y');

const colorFolder = gui.addFolder('Colors');
colorFolder.add(settings, 'mixRatio', 0, 1).name('Color Mix Ratio');
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

// Fragment shader with improved frame difference detection
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
  
  varying vec2 vUv;
  varying vec3 vNormal;

  // Improved hash function
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  // Get frame value
  float getFrameValue(vec2 uv, float t) {
    vec2 grid = floor(uv * noiseScale * 10.0) / (noiseScale * 10.0);
    vec2 slideOffset = slideDirection * t * slideFrequency;
    
    // Calculate current and previous positions
    vec2 currentPos = grid + slideOffset;
    vec2 prevPos = currentPos - slideDirection * 0.1;
    
    // Get values for current and previous frames
    float currentValue = hash(currentPos);
    float prevValue = hash(prevPos);
    
    // Detect motion and use appropriate value
    float diff = abs(currentValue - prevValue);
    if (diff > differenceThreshold) {
      return prevValue; // Take value from previous position if moving
    }
    return hash(currentPos * 1.23); // Generate new random value if static
  }

  void main() {
    // Pixelate coordinates
    vec2 pixelatedUv = floor(vUv * pixelSize) / pixelSize;
    
    // Get frame difference value
    float value = getFrameValue(pixelatedUv, time);
    
    // Quantize value steps
    value = floor(value * valueSteps) / max(1.0, valueSteps - 1.0);
    
    // Apply normal-based shading
    float shading = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
    value = mix(value, value * shading, 0.3);
    
    // Mix colors based on the final value
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
      differenceThreshold: { value: settings.differenceThreshold }
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