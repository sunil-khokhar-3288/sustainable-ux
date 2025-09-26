import * as THREE from 'three';
import { GPUMonitor } from './GPUMonitor';  // Ensure implemented or stubbed

export function createModelScene(mountNode) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(
    60,
    mountNode.clientWidth / mountNode.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  // Adaptive resolution params (mutable)
  let pixelRatioClamp = 1.5; // max device pixel ratio used
  let viewportScale = 1.0;   // render size factor relative to canvas size
  const applyRendererSizing = () => {
    const canvasW = mountNode.clientWidth;
    const canvasH = mountNode.clientHeight;
    const renderW = Math.max(1, Math.floor(canvasW * viewportScale));
    const renderH = Math.max(1, Math.floor(canvasH * viewportScale));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioClamp));
    renderer.setSize(renderW, renderH, false);
    // Upscale to fit the container while rendering at lower res
    renderer.domElement.style.width = canvasW + 'px';
    renderer.domElement.style.height = canvasH + 'px';
    renderer.domElement.style.imageRendering = 'pixelated';
  };
  applyRendererSizing();
  mountNode.appendChild(renderer.domElement);

  const gpuMonitor = new GPUMonitor(renderer);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(ambientLight);
  scene.add(directionalLight);

  let model = null;
  let isModelLoaded = false;
  // Create a simple red cube instead of loading a GLTF model
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  model = new THREE.Mesh(cubeGeometry, cubeMaterial);
  model.position.set(0, 1, 0);
  scene.add(model);
  isModelLoaded = true;

  // Minimal overlay for current settings (metrics live in dashboard)
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '10px';
  overlay.style.left = '10px';
  overlay.style.background = 'rgba(255,255,255,0.85)';
  overlay.style.padding = '8px 10px';
  overlay.style.borderRadius = '12px';
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.style.fontSize = '12px';
  overlay.style.color = '#333';
  overlay.style.zIndex = '10';
  overlay.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
  overlay.style.border = '1px solid rgba(0,0,0,0.1)';
  mountNode.style.position = 'relative';
  const updateOverlayText = () => {
    const content = document.createElement('div');
    content.textContent = `Resolution: PR≤${pixelRatioClamp.toFixed(2)} • Viewport ${(viewportScale*100).toFixed(0)}%`;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    const title = document.createElement('strong');
    title.textContent = 'Scene Settings';
    title.style.fontSize = '12px';
    row.appendChild(title);
    overlay.innerHTML = '';
    overlay.appendChild(row);
    overlay.appendChild(content);
  };
  updateOverlayText();
  mountNode.appendChild(overlay);

  // Collapsible overlay handle
  let overlayCollapsed = false;
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = '−';
  collapseBtn.style.background = 'transparent';
  collapseBtn.style.border = 'none';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.style.fontSize = '14px';
  collapseBtn.style.marginLeft = '6px';
  collapseBtn.title = 'Collapse';
  overlay.firstChild && overlay.firstChild.appendChild(collapseBtn);
  const collapsedPill = document.createElement('button');
  collapsedPill.textContent = 'Scene Settings';
  collapsedPill.style.position = 'absolute';
  collapsedPill.style.top = '10px';
  collapsedPill.style.left = '10px';
  collapsedPill.style.padding = '6px 10px';
  collapsedPill.style.borderRadius = '999px';
  collapsedPill.style.border = '1px solid rgba(0,0,0,0.15)';
  collapsedPill.style.background = 'rgba(255,255,255,0.9)';
  collapsedPill.style.fontFamily = 'Arial, sans-serif';
  collapsedPill.style.fontSize = '12px';
  collapsedPill.style.cursor = 'pointer';
  collapsedPill.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
  collapsedPill.style.display = 'none';
  collapsedPill.style.zIndex = '11';
  collapsedPill.addEventListener('click', () => {
    overlayCollapsed = false;
    overlay.style.display = 'block';
    collapsedPill.style.display = 'none';
  });
  mountNode.appendChild(collapsedPill);
  collapseBtn.addEventListener('click', () => {
    overlayCollapsed = !overlayCollapsed;
    if (overlayCollapsed) {
      overlay.style.display = 'none';
      collapsedPill.style.display = 'inline-block';
    } else {
      overlay.style.display = 'block';
      collapsedPill.style.display = 'none';
    }
  });

  // Interaction variables
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;

  function onPointerDown(e) {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerMove(e) {
    if (!isDragging || !isModelLoaded) return;

    const deltaX = e.clientX - prevX;
    const deltaY = e.clientY - prevY;

    model.rotation.y += deltaX * 0.005;
    model.rotation.x += deltaY * 0.005;

    // Clamp vertical rotation to prevent flipping
    model.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, model.rotation.x));

    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerUp() {
    isDragging = false;
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', onPointerUp);

  // Render cadence control
  let targetFps = 30;                 // foreground FPS target
  let backgroundFps = 5;              // when tab/page is hidden
  let frameIntervalMs = 1000 / targetFps;
  let lastRenderTime = 0;
  let isHidden = typeof document !== 'undefined' ? document.hidden : false;
  // Smooth recovery state
  let rampStartMs = 0;
  let rampDurationMs = 900;

  function getEffectiveIntervalMs(now) {
    const hiddenInterval = 1000 / Math.max(1, backgroundFps);
    const visibleInterval = frameIntervalMs;
    if (isHidden) return hiddenInterval;
    // If we just became visible, ramp from hiddenInterval to visibleInterval
    const t = rampStartMs ? Math.min(1, (now - rampStartMs) / rampDurationMs) : 1;
    const eased = t < 1 ? (t*t*(3 - 2*t)) : 1; // smoothstep easing
    const eff = hiddenInterval + (visibleInterval - hiddenInterval) * eased;
    return eff;
  }

  function animate(now) {
    if (!lastRenderTime) lastRenderTime = now;
    const elapsed = now - lastRenderTime;
    const effInterval = getEffectiveIntervalMs(now);
    if (elapsed >= effInterval) {
      // Continuous rotation for the cube (radians per second)
      const rotationSpeedY = 0.6; // adjust to taste
      if (isModelLoaded && model) {
        model.rotation.y += rotationSpeedY * (elapsed / 1000);
      }
      renderer.render(scene, camera);
      if (gpuMonitor && typeof gpuMonitor.onFrameRendered === 'function') {
        gpuMonitor.onFrameRendered(now);
      }
      lastRenderTime = now;
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  function setPerformanceMode(mode) {
    if (mode === 'baseline') {
      targetFps = 60;
      frameIntervalMs = 1000 / targetFps;
      pixelRatioClamp = 3;
    } else {
      targetFps = 30;
      frameIntervalMs = 1000 / targetFps;
      pixelRatioClamp = 1.5;
    }
    applyRendererSizing();
  }

  function setTargetFps(nextFps) {
    targetFps = Math.max(1, Math.min(120, nextFps || 30));
    frameIntervalMs = 1000 / targetFps;
  }

  function setBackgroundFps(nextFps) {
    backgroundFps = Math.max(1, Math.min(30, nextFps || 5));
  }

  function setPixelRatioClampValue(nextClamp) {
    pixelRatioClamp = Math.max(0.5, Math.min(3, nextClamp || 1.5));
    applyRendererSizing();
    updateOverlayText();
  }

  function setViewportScaleValue(nextScale) {
    viewportScale = Math.max(0.3, Math.min(1, nextScale || 1));
    applyRendererSizing();
    updateOverlayText();
  }

  // Sustainable themes: light, dark, eink, high-contrast
  let currentTheme = 'light';
  function setTheme(theme) {
    currentTheme = theme;
    if (gpuMonitor && typeof gpuMonitor.setTheme === 'function') {
      gpuMonitor.setTheme(theme);
    }
    if (theme === 'dark') {
      scene.background = new THREE.Color(0x0b0b0b);
      ambientLight.intensity = 0.35;
      directionalLight.intensity = 0.6;
    } else if (theme === 'oled') {
      scene.background = new THREE.Color(0x000000);
      ambientLight.intensity = 0.25;
      directionalLight.intensity = 0.5;
    } else if (theme === 'eink') {
      scene.background = new THREE.Color(0xf2f2f2);
      ambientLight.intensity = 0.25;
      directionalLight.intensity = 0.4;
      // Force materials to grayscale
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => { m.color = new THREE.Color(0x222222); m.metalness = 0; m.roughness = 1; });
          } else {
            obj.material.color = new THREE.Color(0x222222);
            if ('metalness' in obj.material) obj.material.metalness = 0;
            if ('roughness' in obj.material) obj.material.roughness = 1;
          }
        }
      });
    } else if (theme === 'high-contrast') {
      scene.background = new THREE.Color(0x000000);
      ambientLight.intensity = 0.2;
      directionalLight.intensity = 1.2;
      directionalLight.color = new THREE.Color(0xffffff);
    } else { // light
      scene.background = new THREE.Color(0xffffff);
      ambientLight.intensity = 0.7;
      directionalLight.intensity = 1.0;
    }
    // Overlay styling according to theme brightness
    overlay.style.background = (theme === 'dark' || theme === 'high-contrast' || theme === 'oled') ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
    overlay.style.color = (theme === 'dark' || theme === 'high-contrast' || theme === 'oled') ? '#fff' : '#333';
  }

  window.addEventListener('resize', () => {
    camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
    camera.updateProjectionMatrix();
    applyRendererSizing();
  });

  document.addEventListener('visibilitychange', () => {
    const wasHidden = isHidden;
    isHidden = document.hidden;
    if (!isHidden && wasHidden) {
      rampStartMs = performance.now();
    }
  });

  function cleanup() {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointerleave', onPointerUp);

    if (model) {
      if (model.geometry) model.geometry.dispose();
      if (model.material) {
        if (Array.isArray(model.material)) {
          model.material.forEach(m => m.dispose && m.dispose());
        } else if (model.material.dispose) {
          model.material.dispose();
        }
      }
    }

    gpuMonitor.destroy();
    renderer.dispose();

    if (mountNode) {
      mountNode.removeChild(renderer.domElement);
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function getCurrentSettings() {
    return {
      targetFps,
      backgroundFps,
      pixelRatioClamp,
      viewportScale,
      theme: currentTheme
    };
  }

  return {
    cleanup,
    gpuMonitor,
    scene,
    renderer,
    setPerformanceMode,
    setTargetFps,
    setBackgroundFps,
    setPixelRatioClamp: setPixelRatioClampValue,
    setViewportScale: setViewportScaleValue,
    setTheme,
    getCurrentSettings,
    currentTheme
  };
}
