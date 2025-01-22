import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add some demo objects
const geometry = new THREE.BoxGeometry();
const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vUv;

    // Random function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec2 st = vUv;
      
      // Create sliding effect
      float slide = floor(time * 2.0);
      vec2 neighbor = st + vec2(0.01, 0.0) * sin(time);
      
      // Get random value for current position
      float r1 = random(st + time);
      float r2 = random(neighbor + time);
      
      // Apply sliding noise effect
      float noise = mix(r1, r2, step(0.5, random(st + slide)));
      
      // Create color from noise
      vec3 color = vec3(noise);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
});

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add more objects with different materials
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshPhongMaterial({ color: 0x00ff00 })
);
sphere.position.x = 2;
scene.add(sphere);

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.3, 0.2, 16, 100),
  new THREE.MeshPhongMaterial({ color: 0xff0000 })
);
torus.position.x = -2;
scene.add(torus);

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

  // Rotate objects
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;
  torus.rotation.x += 0.01;
  torus.rotation.y += 0.01;

  // Update shader time uniform
  material.uniforms.time.value = time * 0.001;

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