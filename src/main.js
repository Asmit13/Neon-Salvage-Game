import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import './style.css';

const GAME_SECONDS = 60;
const PLAYER_Z = 3.2;
const LANE_X = [-2.35, 0, 2.35];
const TRACK_WRAP_Z = 94;

const canvas = document.querySelector('#game-canvas');
const scoreValue = document.querySelector('#score-value');
const crystalValue = document.querySelector('#crystal-value');
const timeValue = document.querySelector('#time-value');
const startScreen = document.querySelector('#start-screen');
const pauseScreen = document.querySelector('#pause-screen');
const gameoverScreen = document.querySelector('#gameover-screen');
const startButton = document.querySelector('#start-button');
const resumeButton = document.querySelector('#resume-button');
const quitButton = document.querySelector('#quit-button');
const restartButton = document.querySelector('#restart-button');
const menuButton = document.querySelector('#menu-button');
const pauseButton = document.querySelector('#pause-button');
const finalScore = document.querySelector('#final-score');
const finalCrystals = document.querySelector('#final-crystals');
const bestScore = document.querySelector('#best-score');
const resultMessage = document.querySelector('#result-message');
const toast = document.querySelector('#toast');
const leftButton = document.querySelector('#left-button');
const rightButton = document.querySelector('#right-button');

let scene;
let camera;
let renderer;
let player;
let playerFallback;
let clock;
let gameState = 'menu';
let currentLane = 1;
let targetX = LANE_X[1];
let runTime = 0;
let timeLeft = GAME_SECONDS;
let score = 0;
let crystalsCollected = 0;
let currentSpeed = 18;
let spawnClock = 0;
let hudClock = 0;
let lastTimestamp = 0;
let toastTimer = null;
let crystalPrototype = null;
let highScore = getSavedBest();

const laneMarkers = [];
const edgePosts = [];
const runObjects = [];
const decorativeObjects = [];
// const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath(
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

function getSavedBest() {
  try { return Number(window.localStorage.getItem('neon-salvage-best') || 0); }
  catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem('neon-salvage-best', String(value)); }
  catch { /* Local storage can be unavailable in private or restricted contexts. */ }
}

function padded(value, size = 4) {
  return String(Math.max(0, Math.floor(value))).padStart(size, '0');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
}

function makeMaterial(color, emissive = color, emissiveIntensity = 0.35, roughness = 0.45, metalness = 0.45) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness, metalness });
}

function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.error('WebGL renderer could not start:', error);
    showToast('WebGL is unavailable in this browser. Try Chrome or Edge with hardware acceleration enabled.');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b18);
  scene.fog = new THREE.FogExp2(0x070b18, 0.0125);

  camera = new THREE.PerspectiveCamera(53, window.innerWidth / window.innerHeight, 0.1, 240);
  camera.position.set(0, 6.3, 11.8);
  camera.lookAt(0, 0.15, -10);

  const hemi = new THREE.HemisphereLight(0x9acaff, 0x0b1025, 1.7);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xd9eeff, 2.4);
  keyLight.position.set(-5, 10, 7);
  scene.add(keyLight);
  const cyanLight = new THREE.PointLight(0x28dfff, 18, 30, 2);
  cyanLight.position.set(0, 4, 3);
  scene.add(cyanLight);
  const violetLight = new THREE.PointLight(0x6b58ff, 22, 65, 2);
  violetLight.position.set(0, 8, -35);
  scene.add(violetLight);

  createStars();
  createTrack();
  createSideScenery();
  createPlayer();
  loadVi3WModels();

  clock = new THREE.Clock();
  bindEvents();
  updateHud(true);
  window.addEventListener('resize', onResize);
  requestAnimationFrame(animate);
}

function createStars() {
  const count = 650;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 190;
    positions[i * 3 + 1] = Math.random() * 60 + 2;
    positions[i * 3 + 2] = -Math.random() * 180 - 12;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9ac9ff, size: 0.17, sizeAttenuation: true, transparent: true, opacity: 0.72 }));
  scene.add(points);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 220),
    new THREE.MeshStandardMaterial({ color: 0x050916, roughness: 1, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.31, -38);
  scene.add(ground);

  // Soft horizon structures give the runway a little depth without overwhelming the player.
  for (let i = 0; i < 18; i += 1) {
    const height = 2 + Math.random() * 8;
    const width = 1.3 + Math.random() * 3.5;
    const mat = new THREE.MeshStandardMaterial({ color: 0x101a39, emissive: 0x101b4b, emissiveIntensity: 0.5, roughness: 0.8, metalness: 0.2 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.5 + Math.random() * 3), mat);
    tower.position.set((Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 27), height / 2 - 0.25, -30 - Math.random() * 55);
    scene.add(tower);
    decorativeObjects.push(tower);
  }
}

function createTrack() {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 0.18, 102),
    new THREE.MeshStandardMaterial({ color: 0x0a1228, roughness: 0.58, metalness: 0.48, emissive: 0x06152b, emissiveIntensity: 0.28 })
  );
  road.position.set(0, -0.12, -36);
  scene.add(road);

  const underglow = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 0.025, 100),
    new THREE.MeshBasicMaterial({ color: 0x15295e, transparent: true, opacity: 0.55 })
  );
  underglow.position.set(0, -0.012, -36);
  scene.add(underglow);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x3eeaff, emissive: 0x0ed9ff, emissiveIntensity: 1.4, metalness: 0.55, roughness: 0.25 });
  [-4.05, 4.05].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 100), railMat);
    rail.position.set(x, -0.005, -36);
    scene.add(rail);
  });

  const markerMat = new THREE.MeshBasicMaterial({ color: 0x5678ac, transparent: true, opacity: 0.55 });
  for (const x of [-1.32, 1.32]) {
    for (let i = 0; i < 23; i += 1) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, 1.8), markerMat);
      marker.position.set(x, -0.016, -83 + i * 4.2);
      scene.add(marker);
      laneMarkers.push(marker);
    }
  }

  const centerMarkers = new THREE.Group();
  for (let i = 0; i < 20; i += 1) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.55), new THREE.MeshBasicMaterial({ color: 0x28406a, transparent: true, opacity: 0.28 }));
    marker.position.set(0, -0.014, -80 + i * 4.5);
    centerMarkers.add(marker);
    laneMarkers.push(marker);
  }
  scene.add(centerMarkers);

  // Small rectangular panels add a techno-industrial rhythm along both edges.
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a2c50, emissive: 0x0e2b5a, emissiveIntensity: 0.65, metalness: 0.6, roughness: 0.38 });
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 20; i += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.1), panelMat);
      panel.position.set(side * 3.72, -0.015, -84 + i * 4.7);
      scene.add(panel);
      laneMarkers.push(panel);
    }
  }
}

function createSideScenery() {
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x111a35, metalness: 0.7, roughness: 0.42 });
  const accentMats = [
    new THREE.MeshBasicMaterial({ color: 0x26dff7 }),
    new THREE.MeshBasicMaterial({ color: 0x705bff }),
  ];

  for (let i = 0; i < 26; i += 1) {
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      const height = 0.7 + Math.random() * 2.8;
      const width = 0.34 + Math.random() * 0.28;
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.5), baseMat);
      body.position.y = height / 2 - 0.15;
      group.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.06, 0.53), accentMats[(i + (side > 0 ? 1 : 0)) % 2]);
      stripe.position.set(0, Math.max(0.12, height * (0.24 + Math.random() * 0.55)), 0.02);
      group.add(stripe);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(width * 1.8, 0.12, 0.76), baseMat);
      foot.position.y = -0.08;
      group.add(foot);
      group.position.set(side * (5 + Math.random() * 1.9), 0, -87 + i * 3.7);
      scene.add(group);
      edgePosts.push(group);
    }
  }
}

function createPlayer() {
  player = new THREE.Group();
  player.position.set(0, 0.16, PLAYER_Z);
  playerFallback = createFallbackHovercraft();
  player.add(playerFallback);
  scene.add(player);
}

function createFallbackHovercraft() {
  const group = new THREE.Group();
  const bodyMat = makeMaterial(0x172744, 0x071c42, 0.7, 0.3, 0.78);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x83fbff, emissive: 0x13dff5, emissiveIntensity: 2.0, metalness: 0.35, roughness: 0.22 });
  const darkMat = makeMaterial(0x080e1c, 0x111b35, 0.5, 0.35, 0.8);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x314b82, emissive: 0x233f7e, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.18, transparent: true, opacity: 0.93 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xffa25a, emissive: 0xff5522, emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.3 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.31, 1.66), bodyMat);
  chassis.position.y = 0.05;
  group.add(chassis);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.9, 4), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.055, 1.08);
  nose.scale.set(1, 1, 0.92);
  group.add(nose);

  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.13, 1.25), darkMat);
  lowerHull.position.set(0, -0.12, -0.08);
  group.add(lowerHull);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.65), canopyMat);
  canopy.position.set(0, 0.31, -0.11);
  canopy.rotation.x = -0.08;
  group.add(canopy);

  const topStripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 1.2), orangeMat);
  topStripe.position.set(0, 0.22, 0.17);
  group.add(topStripe);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.74), darkMat);
    wing.position.set(side * 0.79, -0.03, -0.22);
    wing.rotation.y = side * -0.06;
    group.add(wing);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 10), darkMat);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(side * 0.83, -0.03, -0.58);
    group.add(engine);

    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), lightMat);
    thruster.position.set(side * 0.99, -0.03, -0.61);
    thruster.scale.set(0.72, 0.72, 1.25);
    group.add(thruster);

    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.92), lightMat);
    lightStrip.position.set(side * 0.59, 0.105, 0.08);
    group.add(lightStrip);
  }

  const noseLight = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.035, 0.055), lightMat);
  noseLight.position.set(0, 0.12, 1.38);
  group.add(noseLight);

  const underglow = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), new THREE.MeshBasicMaterial({ color: 0x0ad7ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = -0.18;
  group.add(underglow);

  return group;
}

function loadVi3WModels() {
  // Put your Vi3W exports at these paths. The game stays playable with generated fallback geometry if files are absent.
loader.load(
  '/models/hovercraft.glb',

  (gltf) => {
    console.log('Hovercraft GLB loaded:', gltf);

    const model = fitModel(gltf.scene, 2.25);
    model.rotation.y = Math.PI;
    model.position.y += 0.04;

    player.add(model);
    playerFallback.visible = false;

    console.info('Vi3W hovercraft model loaded.');
  },

  (progress) => {
    if (progress.total > 0) {
      console.log(
        `Hovercraft loading: ${
          Math.round((progress.loaded / progress.total) * 100)
        }%`
      );
    }
  },

  (error) => {
    console.error('Hovercraft loading failed:', error);
  }
);

  loader.load('/models/energy-crystal.glb', (gltf) => {
    crystalPrototype = fitModel(gltf.scene, 0.9);
    for (const item of runObjects) {
      if (item.type === 'crystal') replaceCrystalVisual(item);
    }
    console.info('Vi3W energy crystal model loaded.');
  }, undefined, () => {
    console.info('No /models/energy-crystal.glb found; using the built-in energy crystal.');
  });
}

function fitModel(model, targetSize) {
  const fitted = model;
  fitted.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(fitted);
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  fitted.scale.multiplyScalar(targetSize / largestDimension);
  fitted.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(fitted);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  fitted.position.sub(center);
  fitted.position.y += scaledBounds.getSize(new THREE.Vector3()).y * 0.5;
  fitted.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        node.material.needsUpdate = true;
      }
    }
  });
  return fitted;
}

function createFallbackCrystal() {
  const group = new THREE.Group();
  const outerMat = new THREE.MeshStandardMaterial({ color: 0x72fcff, emissive: 0x0acbff, emissiveIntensity: 1.9, metalness: 0.45, roughness: 0.18, transparent: true, opacity: 0.95 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xc39aff, emissive: 0x803dff, emissiveIntensity: 1.45, metalness: 0.32, roughness: 0.2 });
  const outer = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), outerMat);
  outer.scale.set(0.78, 1.22, 0.78);
  group.add(outer);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), coreMat);
  core.rotation.y = Math.PI / 4;
  group.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.022, 5, 24), new THREE.MeshBasicMaterial({ color: 0x5cf5ff, transparent: true, opacity: 0.78 }));
  ring.rotation.x = Math.PI / 2.45;
  group.add(ring);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3bdcff, transparent: true, opacity: 0.07, side: THREE.BackSide }));
  group.add(halo);
  return group;
}

function createHazardVisual() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.48, 0.28, 8), makeMaterial(0x25223e, 0x3e0e34, 0.75, 0.38, 0.75));
  base.position.y = 0.18;
  group.add(base);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff587a, emissive: 0xff194e, emissiveIntensity: 1.7, roughness: 0.25, metalness: 0.36 });
  const spike = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), spikeMat);
  spike.position.y = 0.79;
  spike.rotation.set(0.25, 0.2, 0.12);
  group.add(spike);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff365f, transparent: true, opacity: 0.82 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.48;
  group.add(band);
  return group;
}

function spawnItem() {
  const isHazard = Math.random() < 0.37;
  const lane = Math.floor(Math.random() * LANE_X.length);
  const container = new THREE.Group();
  container.position.set(LANE_X[lane], 0, -78);
  const item = { type: isHazard ? 'hazard' : 'crystal', lane, container, visual: null, resolved: false, seed: Math.random() * Math.PI * 2 };
  if (isHazard) {
    item.visual = createHazardVisual();
    item.visual.position.y = 0;
  } else {
    item.visual = crystalPrototype ? crystalPrototype.clone(true) : createFallbackCrystal();
    item.visual.position.y = 0.72;
    item.visual.scale.multiplyScalar(1);
  }
  container.add(item.visual);
  scene.add(container);
  runObjects.push(item);
}

function replaceCrystalVisual(item) {
  if (!crystalPrototype || !item.container) return;
  if (item.visual) item.container.remove(item.visual);
  item.visual = crystalPrototype.clone(true);
  item.visual.position.y = 0.72;
  item.container.add(item.visual);
}

function moveLane(direction) {
  if (gameState !== 'playing') return;
  const nextLane = THREE.MathUtils.clamp(currentLane + direction, 0, LANE_X.length - 1);
  if (nextLane !== currentLane) {
    currentLane = nextLane;
    targetX = LANE_X[currentLane];
  }
}

function startGame() {
  clearRunObjects();
  gameState = 'playing';
  currentLane = 1;
  targetX = LANE_X[1];
  player.position.set(targetX, 0.16, PLAYER_Z);
  player.rotation.set(0, 0, 0);
  runTime = 0;
  timeLeft = GAME_SECONDS;
  score = 0;
  crystalsCollected = 0;
  currentSpeed = 18;
  spawnClock = 0.6;
  hudClock = 0;
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  pauseButton.hidden = false;
  updateHud(true);
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  pauseScreen.classList.remove('hidden');
  pauseButton.hidden = true;
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  pauseScreen.classList.add('hidden');
  pauseButton.hidden = false;
  clock.getDelta();
}

function endGame(reason = 'time') {
  if (gameState !== 'playing') return;
  gameState = 'gameover';
  pauseButton.hidden = true;
  gameoverScreen.classList.remove('hidden');
  finalScore.textContent = padded(score);
  finalCrystals.textContent = padded(crystalsCollected, 2);
  if (score > highScore) {
    highScore = score;
    saveBest(highScore);
    resultMessage.textContent = 'New personal best. The grid will remember you.';
  } else if (reason === 'collision') {
    resultMessage.textContent = 'Your run ended in the debris field. Load up and try again.';
  } else if (reason === 'quit') {
    resultMessage.textContent = 'You ended this run early. Reset when you are ready.';
  } else {
    resultMessage.textContent = 'Run complete. You kept the grid alive for another minute.';
  }
  bestScore.textContent = padded(highScore);
}

function returnToMenu() {
  gameState = 'menu';
  clearRunObjects();
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  pauseButton.hidden = true;
  currentLane = 1;
  targetX = LANE_X[1];
  runTime = 0;
  timeLeft = GAME_SECONDS;
  score = 0;
  crystalsCollected = 0;
  currentSpeed = 18;
  player.position.set(0, 0.16, PLAYER_Z);
  player.rotation.set(0, 0, 0);
  updateHud(true);
}

function clearRunObjects() {
  for (const item of runObjects) {
    scene.remove(item.container);
    disposeGroup(item.container);
  }
  runObjects.length = 0;
}

function disposeGroup(group) {
  group.traverse((node) => {
    if (node.isMesh) {
      // Shared built-in materials and GLB resources are intentionally not disposed here;
      // run objects are removed frequently and reuse those resources across spawns.
    }
  });
}

function updateHud(force = false) {
  scoreValue.textContent = padded(score);
  crystalValue.textContent = padded(crystalsCollected, 2);
  timeValue.innerHTML = `${Math.ceil(timeLeft)}<span>s</span>`;
  if (timeLeft <= 10) timeValue.style.color = '#ff668a';
  else timeValue.style.color = '#ffdf9a';
  if (force) {
    finalScore.textContent = padded(score);
    finalCrystals.textContent = padded(crystalsCollected, 2);
    bestScore.textContent = padded(highScore);
  }
}

function updateGame(delta, elapsed) {
  runTime += delta;
  timeLeft = Math.max(0, GAME_SECONDS - runTime);
  currentSpeed = 18 + Math.min(15, runTime * 0.3);
  score = Math.floor(runTime * 2.25) + crystalsCollected * 100;
  spawnClock += delta;
  const spawnInterval = Math.max(0.61, 1.12 - runTime * 0.006);
  if (spawnClock >= spawnInterval) {
    spawnClock = 0;
    spawnItem();
  }

  const worldShift = currentSpeed * delta;
  for (const marker of laneMarkers) {
    marker.position.z += worldShift;
    if (marker.position.z > 13) marker.position.z -= TRACK_WRAP_Z;
  }

  for (const post of edgePosts) {
    post.position.z += worldShift;
    if (post.position.z > 12) post.position.z -= TRACK_WRAP_Z;
  }

  const smoothing = 1 - Math.exp(-delta * 12);
  player.position.x = THREE.MathUtils.lerp(player.position.x, targetX, smoothing);
  player.position.y = 0.16 + Math.sin(elapsed * 4.4) * 0.055;
  player.rotation.z = THREE.MathUtils.clamp((targetX - player.position.x) * 0.06, -0.13, 0.13);
  player.rotation.y = THREE.MathUtils.clamp((targetX - player.position.x) * 0.035, -0.08, 0.08);

  for (let i = runObjects.length - 1; i >= 0; i -= 1) {
    const item = runObjects[i];
    item.container.position.z += worldShift;
    if (item.type === 'crystal') {
      item.visual.rotation.y += delta * 1.7;
      item.visual.rotation.x = Math.sin(elapsed * 1.5 + item.seed) * 0.11;
      item.visual.position.y = 0.72 + Math.sin(elapsed * 3.5 + item.seed) * 0.11;
    } else {
      item.visual.rotation.y += delta * 0.8;
    }

    const zDistance = Math.abs(item.container.position.z - PLAYER_Z);
    const xDistance = Math.abs(item.container.position.x - player.position.x);
    if (!item.resolved && zDistance < 1.45 && xDistance < 0.88) {
      item.resolved = true;
      if (item.type === 'hazard') {
        endGame('collision');
        showToast('HULL WARNING — IMPACT DETECTED');
        break;
      }
      crystalsCollected += 1;
      score += 100;
      showToast('+100 ENERGY CELLS');
      scene.remove(item.container);
      runObjects.splice(i, 1);
      continue;
    }

    if (item.container.position.z > PLAYER_Z + 4) {
      scene.remove(item.container);
      runObjects.splice(i, 1);
    }
  }

  hudClock += delta;
  if (hudClock > 0.08) {
    hudClock = 0;
    updateHud();
  }

  if (timeLeft <= 0) endGame('time');
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;
  const delta = Math.min(clock ? clock.getDelta() : 0.016, 0.05);
  const elapsed = timestamp * 0.001;

  if (gameState === 'playing') updateGame(delta, elapsed);
  else if (player && gameState === 'menu') {
    player.position.y = 0.16 + Math.sin(elapsed * 2.1) * 0.05;
    player.rotation.y = Math.sin(elapsed * 0.65) * 0.035;
    player.rotation.z = Math.sin(elapsed * 1.1) * 0.018;
  }

  renderer.render(scene, camera);
}

function bindEvents() {
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  resumeButton.addEventListener('click', resumeGame);
  quitButton.addEventListener('click', () => {
    gameState = 'playing';
    endGame('quit');
  });
  menuButton.addEventListener('click', returnToMenu);
  pauseButton.addEventListener('click', pauseGame);
  leftButton.addEventListener('click', () => moveLane(-1));
  rightButton.addEventListener('click', () => moveLane(1));

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    if (key === 'arrowleft' || key === 'a' || key === 'j') moveLane(-1);
    if (key === 'arrowright' || key === 'd' || key === 'l') moveLane(1);
    if (key === 'p' || key === 'escape') {
      if (gameState === 'playing') pauseGame();
      else if (gameState === 'paused') resumeGame();
    }
    if ((key === 'enter' || key === ' ') && gameState === 'menu') startGame();
    if ((key === 'enter' || key === ' ') && gameState === 'gameover') startGame();
  });

  // Keep tap controls reliable on touch screens without accidentally selecting page text.
  for (const button of [leftButton, rightButton]) {
    button.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
  }
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
