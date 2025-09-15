import React, { useEffect, useRef, useState } from 'react';
import { createDoorScene } from './doorScene';
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
    const { cleanup, gpuMonitor: monitor, scene, renderer, setPerformanceMode } = createDoorScene(mountRef.current);
    sceneRef.current = { cleanup, scene, renderer, setPerformanceMode };
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
      {showDashboard && gpuMonitor && (
        <GPUDashboard 
          gpuMonitor={gpuMonitor}
          baselinePowerAvg={baselinePowerAvg}
          optimizedPowerAvg={optimizedPowerAvg}
        />
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