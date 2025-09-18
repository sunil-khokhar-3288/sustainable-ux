import React, { useEffect, useRef, useState } from 'react';
import { createModelScene } from './ThreeDModelScene';
import { GPUStatsDisplay, GPUStatsToggle } from './GPUStatsDisplay';
import { GPUStressTest, StressTestControls } from './GPUStressTest';
import GPUDashboard from './GPUDashboard';

export default function ThreeSceneWithGPU() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [gpuMonitor, setGpuMonitor] = useState(null);
  const [stressTest, setStressTest] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [isStressTestRunning, setIsStressTestRunning] = useState(false);
  const [mode, setMode] = useState('optimized');
  const [theme, setTheme] = useState('light');
  const [pixelRatioClamp, setPixelRatioClamp] = useState(1.5);
  const [viewportScale, setViewportScale] = useState(1.0);
  const [targetFps, setTargetFps] = useState(30);
  const [backgroundFps, setBackgroundFps] = useState(5);
  const getOptimizationInfo = () => {
    return mode === 'optimized' ? {
      fpsCap: 30,
      pixelRatioMax: 1.5,
      powerPreference: 'low-power',
      antialias: false,
      pauseOnHidden: true
    } : {
      fpsCap: 60,
      pixelRatioMax: 3,
      powerPreference: 'default/hi-perf',
      antialias: false,
      pauseOnHidden: true
    };
  };
  const [baselineAvg, setBaselineAvg] = useState(null);
  const [optimizedAvg, setOptimizedAvg] = useState(null);
  const [baselinePowerAvg, setBaselinePowerAvg] = useState(null);
  const [optimizedPowerAvg, setOptimizedPowerAvg] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // Create the Three.js scene
    const { cleanup, gpuMonitor: monitor, scene, renderer, setPerformanceMode, setTargetFps: setTfps, setBackgroundFps: setBfps, setPixelRatioClamp, setViewportScale, setTheme: setSceneTheme, getCurrentSettings, currentTheme } = createModelScene(mountRef.current);
    sceneRef.current = { cleanup, scene, renderer, setPerformanceMode, setTfps, setBfps, setPixelRatioClamp, setViewportScale, setSceneTheme, getCurrentSettings };
    setGpuMonitor(monitor);
    
    // Initialize stress test
    const test = new GPUStressTest(scene, renderer);
    setStressTest(test);

    return () => {
      if (sceneRef.current) {
        test.stopStressTest();
        sceneRef.current.cleanup();
      }
    };
  }, []);

  const toggleStressTest = () => {
    if (!stressTest) return;
    
    if (isStressTestRunning) {
      stressTest.stopStressTest();
      setIsStressTestRunning(false);
    } else {
      stressTest.startStressTest(50);
      setIsStressTestRunning(true);
    }
  };

  const handleIntensityChange = (intensity) => {
    if (stressTest) {
      stressTest.adjustIntensity(intensity);
    }
  };

  const toggleMode = async () => {
    if (!sceneRef.current) return;
    const next = mode === 'optimized' ? 'baseline' : 'optimized';
    sceneRef.current.setPerformanceMode(next);
    setMode(next);
  };

  // Sync scene controls when local states change
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setSceneTheme?.(theme);
  }, [theme]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setTfps?.(targetFps);
  }, [targetFps]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setBfps?.(backgroundFps);
  }, [backgroundFps]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setPixelRatioClamp?.(pixelRatioClamp);
  }, [pixelRatioClamp]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setViewportScale?.(viewportScale);
  }, [viewportScale]);

  // Measure averages over a window
  const measureAverages = (windowMs = 2000) => new Promise((resolve) => {
    if (!gpuMonitor) return resolve(null);
    const utilSamples = [];
    const powerSamples = [];
    const start = performance.now();
    const timer = setInterval(() => {
      const s = gpuMonitor.getStats();
      utilSamples.push(s.gpu.utilization);
      powerSamples.push(s.gpu.power);
      if (performance.now() - start >= windowMs) {
        clearInterval(timer);
        const avgUtil = utilSamples.reduce((a, b) => a + b, 0) / utilSamples.length || 0;
        const avgPower = powerSamples.reduce((a, b) => a + b, 0) / powerSamples.length || 0;
        resolve({
          utilization: Math.round(avgUtil),
          power: Math.round(avgPower)
        });
      }
    }, 100);
  });

  const runComparison = async () => {
    if (!sceneRef.current) return;
    // Baseline
    sceneRef.current.setPerformanceMode('baseline');
    await new Promise(r => setTimeout(r, 300));
    const base = await measureAverages(2000);
    setBaselineAvg(base ? base.utilization : null);
    setBaselinePowerAvg(base ? base.power : null);
    // Optimized
    sceneRef.current.setPerformanceMode('optimized');
    await new Promise(r => setTimeout(r, 300));
    const opt = await measureAverages(2000);
    setOptimizedAvg(opt ? opt.utilization : null);
    setOptimizedPowerAvg(opt ? opt.power : null);
    setMode('optimized');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <GPUStatsToggle onToggle={setShowStats} />
      {/* Floating Dashboard Open Button */}
      <button
        onClick={() => setShowDashboard(true)}
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          background: 'linear-gradient(135deg,rgb(238, 245, 241),rgb(231, 241, 224))',
          color: '#0b0b0b',
          border: 'none',
          padding: '12px 16px',
          borderRadius: '999px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '13px',
          zIndex: 1100,
          boxShadow: '0 12px 24px rgba(0,0,0,0.35)'
        }}
      >
        Open Sustainability Dashboard
      </button>
      {showStats && gpuMonitor && (
        <GPUStatsDisplay 
          gpuMonitor={gpuMonitor}
          mode={mode}
          optimizationInfo={getOptimizationInfo()}
          hasComparison={baselineAvg !== null || optimizedAvg !== null}
          extraControls={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={toggleMode} style={{ padding: '6px 10px' }}>
                  Mode: {mode === 'optimized' ? 'Optimized' : 'Baseline'}
                </button>
                <button onClick={runComparison} style={{ padding: '6px 10px' }}>
                  Compare (2s each)
                </button>
                <button onClick={() => setShowDashboard(v => !v)} style={{ padding: '6px 10px' }}>
                  {showDashboard ? 'Hide' : 'Show'} Dashboard
                </button>
                {(baselineAvg !== null || optimizedAvg !== null) && (
                  <div style={{ fontSize: '11px' }}>
                    Baseline: {baselineAvg ?? '-'}% | Optimized: {optimizedAvg ?? '-'}%
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11 }}>Theme</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '4px 6px', fontSize: 12 }}>
                    <option value="dark">Dark (energy-friendly)</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11 }}>Target FPS: {targetFps}</label>
                  <input type="range" min="15" max="60" value={targetFps} onChange={(e) => setTargetFps(parseInt(e.target.value))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11 }}>Background FPS: {backgroundFps}</label>
                  <input type="range" min="1" max="15" value={backgroundFps} onChange={(e) => setBackgroundFps(parseInt(e.target.value))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11 }}>Pixel Ratio Clamp: {pixelRatioClamp.toFixed(2)}</label>
                  <input type="range" min="0.5" max="3" step="0.1" value={pixelRatioClamp} onChange={(e) => setPixelRatioClamp(parseFloat(e.target.value))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11 }}>Viewport Scale: {(viewportScale * 100).toFixed(0)}%</label>
                  <input type="range" min="0.3" max="1" step="0.05" value={viewportScale} onChange={(e) => setViewportScale(parseFloat(e.target.value))} />
                </div>
              </div>
              {(baselinePowerAvg !== null && optimizedPowerAvg !== null) && (
                (() => {
                  const wattsSaved = Math.max(0, baselinePowerAvg - optimizedPowerAvg);
                  const gramsPerWh = 0.4; // 400 g/kWh
                  const gramsPerHour = Math.round(wattsSaved * gramsPerWh);
                  const pct = baselinePowerAvg > 0 ? Math.round((wattsSaved / baselinePowerAvg) * 100) : 0;
                  return (
                    <div style={{ fontSize: '11px' }}>
                      Savings: ~{wattsSaved} W ({pct}%) (~{gramsPerHour} g CO₂e/hour)
                    </div>
                  );
                })()
              )}
            </div>
          }
        />
      )}
      {/* Modal-style overlay Dashboard */}
      {showDashboard && gpuMonitor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6,10,12,0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}>
          <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
            background: 'linear-gradient(180deg,rgb(75, 160, 106), #0a0d0f)',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ top: 0, zIndex: 1, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', gap: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, color: 'white', fontWeight: 700 }}>Sustainability UI/UX Dashboard</div>
                <div style={{ position: 'absolute', right: 18 }}>
                  <button onClick={() => setShowDashboard(false)} style={{
                    background: 'rgba(248, 10, 10, 0.25)',
                    color: 'white',
                    border: '1px solid rgba(230, 12, 12, 0.25)',
                    borderRadius: 10,
                    fontWeight: 'bold',
                    padding: '8px 12px',
                    cursor: 'pointer'
                  }}>Close</button>
                </div>
              </div>
            </div>
            <GPUDashboard 
              inModal
              gpuMonitor={gpuMonitor}
              baselinePowerAvg={baselinePowerAvg}
              optimizedPowerAvg={optimizedPowerAvg}
              settings={{ theme, pixelRatioClamp, viewportScale, targetFps, backgroundFps }}
              onApplyOptimizations={() => {
                // Opinionated optimized preset
                setTheme('dark');
                setTargetFps(30);
                setBackgroundFps(5);
                setPixelRatioClamp(1.2);
                setViewportScale(0.8);
                if (sceneRef.current) {
                  sceneRef.current.setPerformanceMode('optimized');
                }
              }}
              onExportMetrics={() => {
                if (!gpuMonitor) return;
                const s = gpuMonitor.getStats();
                const csv = [
                  'metric,value',
                  `fps,${s.fps.toFixed(2)}`,
                  `frameTimeMs,${s.frameTime.toFixed(2)}`,
                  `gpuUtilizationPct,${s.gpu.utilization}`,
                  `gpuPowerW,${s.gpu.power}`,
                  `gpuTempC,${s.gpu.temperature?.toFixed(1)}`,
                  `drawCalls,${s.drawCalls}`,
                  `triangles,${s.triangles}`,
                  `textures,${s.textures}`,
                  `pixelRatioClamp,${pixelRatioClamp}`,
                  `viewportScale,${viewportScale}`,
                  `targetFps,${targetFps}`,
                  `backgroundFps,${backgroundFps}`,
                  `theme,${theme}`
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'sustainability-metrics.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        </div>
      )}
      <StressTestControls 
        stressTest={stressTest}
        isRunning={isStressTestRunning}
        onToggle={toggleStressTest}
        onIntensityChange={handleIntensityChange}
      />
    </div>
  );
}