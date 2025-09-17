import React, { useState, useEffect } from 'react';

export function GPUStatsDisplay({ gpuMonitor, extraControls, mode, optimizationInfo, hasComparison }) {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isHidden, setIsHidden] = useState(typeof document !== 'undefined' ? document.hidden : false);
  
  useEffect(() => {
    if (!gpuMonitor) return;
    
    const updateStats = () => {
      const currentStats = gpuMonitor.getStats();
      setStats(currentStats);
    };
    
    // Update stats every 100ms
    const interval = setInterval(updateStats, 100);
    
    return () => clearInterval(interval);
  }, [gpuMonitor]);

  useEffect(() => {
    const onVis = () => setIsHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  
  if (!stats || !isVisible) return null;
  
  const getUtilizationColor = (utilization) => {
    if (utilization < 30) return '#4CAF50'; // Green
    if (utilization < 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  const getTemperatureColor = (temp) => {
    if (temp < 50) return '#4CAF50'; // Green
    if (temp < 70) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: '0px',
      right: '10px',
      background: 'linear-gradient(180deg, rgba(236, 253, 245, 0.85), rgba(209, 250, 229, 0.8))',
      color: '#073b28',
      padding: '12px',
      borderRadius: '12px',
      fontFamily: 'monospace',
      fontSize: '11px',
      minWidth: hasComparison ? '160px' : '200px',
      zIndex: 1000,
      border: '1px solid rgba(16,185,129,0.35)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <h3 style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>GPU Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(16,185,129,0.35)',
            color: '#065f46',
            borderRadius: 6,
            padding: '2px 6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '6px', color: '#064e3b' }}>
        <strong>Performance:</strong>
        <div style={{ marginLeft: '8px' }}>
          <div>FPS: <span style={{ color: '#0ea5e9' }}>{stats.fps.toFixed(1)}</span></div>
          <div>Frame Time: {stats.frameTime.toFixed(2)}ms</div>
        </div>
      </div>

      {extraControls && (
        <div style={{ marginBottom: '6px' }}>
          {extraControls}
        </div>
      )}

      {mode === 'baseline' && isHidden && (
        <div style={{
          background: 'rgba(253, 230, 138, 0.8)',
          color: '#78350f',
          padding: '4px 6px',
          borderRadius: '4px',
          marginBottom: '6px',
          border: '1px solid rgba(251,191,36,0.8)'
        }}>
          Background rendering may be throttled by the browser when hidden.
        </div>
      )}

      {optimizationInfo && (
        <div style={{ marginBottom: '8px', color: '#064e3b' }}>
          <strong>Optimizations ({mode === 'optimized' ? 'Optimized' : 'Baseline'}):</strong>
          <div style={{ marginLeft: '10px' }}>
            <div>FPS Cap: {optimizationInfo.fpsCap} FPS</div>
            <div>Pixel Ratio Clamp: {optimizationInfo.pixelRatioMax}</div>
            <div>Power Preference: {optimizationInfo.powerPreference}</div>
            <div>Antialiasing: {optimizationInfo.antialias ? 'On' : 'Off'}</div>
            <div>Pause on Hidden: {optimizationInfo.pauseOnHidden ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '6px' }}>
        <strong style={{ color: '#064e3b' }}>GPU Utilization:</strong>
        <div style={{ marginLeft: '8px' }}>
          <div style={{ 
            color: getUtilizationColor(stats.gpu.utilization),
            fontWeight: 'bold'
          }}>
            {stats.gpu.utilization}%
          </div>
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: 'rgba(16,185,129,0.2)', 
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '2px'
          }}>
            <div style={{
              width: `${stats.gpu.utilization}%`,
              height: '100%',
              background: getUtilizationColor(stats.gpu.utilization),
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <strong style={{ color: '#064e3b' }}>GPU Temperature:</strong>
        <div style={{ 
          marginLeft: '8px',
          color: getTemperatureColor(stats.gpu.temperature),
          fontWeight: 'bold'
        }}>
          {stats.gpu.temperature.toFixed(1)}°C
        </div>
      </div>
      
      <div style={{ marginBottom: '0' }}>
        <strong style={{ color: '#064e3b' }}>GPU Power:</strong>
        <div style={{ marginLeft: '8px' }}>
          ~{stats.gpu.power}W
        </div>
      </div>
      
      
    </div>
  );
}

export function GPUStatsToggle({ onToggle }) {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleStats = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle(newVisibility);
  };
  
  return (
    <button
      onClick={toggleStats}
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: isVisible ? '#4CAF50' : '#333',
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1001,
        transition: 'background-color 0.3s ease'
      }}
    >
      {isVisible ? 'Hide GPU Stats' : 'Show GPU Stats'}
    </button>
  );
}