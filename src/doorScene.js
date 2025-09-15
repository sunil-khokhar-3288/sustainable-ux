import * as THREE from "three";
import { GPUMonitor } from "./GPUMonitor";

export function createDoorScene(mountNode) {
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Camera setup
  const aspect = mountNode.clientWidth / mountNode.clientHeight;
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
  mountNode.appendChild(renderer.domElement);

  // Initialize GPU Monitor
  const gpuMonitor = new GPUMonitor(renderer);

  // Add a colorful rotating cube
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshNormalMaterial();
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  scene.add(cube);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 5, 5);
  scene.add(directionalLight);

  // No mouse interaction needed

  // Animation loop (static door)
  let frameId;
  let timeoutId;
  let worker;
  let isPaused = false;
  let targetFps = 30; // default optimized
  let frameIntervalMs = 1000 / targetFps;
  let lastRenderTime = 0;
  let pauseOnHidden = true; // default optimized behavior

  const animate = (now) => {
    if (isPaused) {
      frameId = requestAnimationFrame(animate);
      return;
    }
    if (!lastRenderTime) lastRenderTime = now;
    const elapsed = now - lastRenderTime;
    if (elapsed >= frameIntervalMs) {
      // Rotate the cube for a simple animation
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.015;
      renderer.render(scene, camera);
      // feed GPU monitor with actual render cadence
      if (gpuMonitor && typeof gpuMonitor.onFrameRendered === 'function') {
        gpuMonitor.onFrameRendered(now);
      }
      lastRenderTime = now;
    }
    if (document.hidden && !pauseOnHidden) {
      // When hidden in baseline, rely on worker ticks to drive rendering
      // (set up in visibility handler). Do not schedule RAF here to avoid extra work.
      return;
    }
    frameId = requestAnimationFrame(animate);
  };
  frameId = requestAnimationFrame(animate);

  // Allow switching between baseline and optimized modes to demo utilization difference
  function setPerformanceMode(mode) {
    if (mode === "baseline") {
      targetFps = 60;
      frameIntervalMs = 1000 / targetFps;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
      pauseOnHidden = false;
      // If previously paused only due to hidden, resume
      if (document.hidden) {
        isPaused = false;
      }
    } else {
      targetFps = 30;
      frameIntervalMs = 1000 / targetFps;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
      pauseOnHidden = true;
      if (document.hidden) {
        isPaused = true;
      }
    }
  }

  // Handle resize
  function handleResize() {
    camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
  }
  window.addEventListener("resize", handleResize);

  // Pause rendering when tab is hidden to save resources
  function handleVisibilityChange() {
    isPaused = pauseOnHidden && document.hidden;
    if (!pauseOnHidden) {
      // Baseline: start/stop worker ticks based on visibility
      if (document.hidden) {
        try {
          if (!worker) {
            worker = new Worker(new URL('./renderTicker.worker.js', import.meta.url));
            worker.onmessage = (e) => {
              if (e.data && e.data.type === 'tick' && !isPaused) {
                const now = e.data.now || performance.now();
                animate(now);
              }
            };
          }
          worker.postMessage({ type: 'start', fps: targetFps });
        } catch (err) {
          // Fallback to setTimeout if worker creation fails
          const delay = Math.max(0, frameIntervalMs - (performance.now() - lastRenderTime));
          timeoutId = setTimeout(() => animate(performance.now()), delay);
        }
      } else {
        if (worker) {
          worker.postMessage({ type: 'stop' });
        }
        if (timeoutId) clearTimeout(timeoutId);
        frameId = requestAnimationFrame(animate);
      }
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);

  function cleanup() {
    cancelAnimationFrame(frameId);
    if (timeoutId) clearTimeout(timeoutId);
    if (worker) {
      try { worker.terminate(); } catch (_) {}
      worker = null;
    }
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    cubeGeometry.dispose();
    // MeshNormalMaterial does not allocate textures; dispose anyway for consistency
    cubeMaterial.dispose();
    gpuMonitor.destroy();
    renderer.dispose();
    if (mountNode) {
      mountNode.removeChild(renderer.domElement);
    }
  }

  return { cleanup, gpuMonitor, scene, renderer, setPerformanceMode };
}
