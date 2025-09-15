import * as THREE from "three";

export class GPUStressTest {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.stressObjects = [];
    this.isRunning = false;
  }

  startStressTest(intensity = 100) {
    this.isRunning = true;
    this.clearStressObjects();
    
    // Create multiple complex geometries to stress the GPU
    const geometries = [
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.ConeGeometry(0.5, 1, 32),
      new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
      new THREE.TorusGeometry(0.5, 0.2, 16, 100)
    ];

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
      new THREE.MeshStandardMaterial({ color: 0x0000ff }),
      new THREE.MeshStandardMaterial({ color: 0xffff00 }),
      new THREE.MeshStandardMaterial({ color: 0xff00ff })
    ];

    // Create stress objects based on intensity
    for (let i = 0; i < intensity; i++) {
      const geometry = geometries[i % geometries.length];
      const material = materials[i % materials.length];
      const mesh = new THREE.Mesh(geometry, material);
      
      // Random positioning
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      this.stressObjects.push(mesh);
      this.scene.add(mesh);
    }

    // Start rotation animation for stress objects
    this.animateStressObjects();
  }

  animateStressObjects() {
    if (!this.isRunning) return;

    this.stressObjects.forEach((obj, index) => {
      obj.rotation.x += 0.01 * (index % 3 + 1);
      obj.rotation.y += 0.01 * (index % 2 + 1);
      obj.rotation.z += 0.01 * (index % 4 + 1);
    });

    requestAnimationFrame(() => this.animateStressObjects());
  }

  stopStressTest() {
    this.isRunning = false;
    this.clearStressObjects();
  }

  clearStressObjects() {
    this.stressObjects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    this.stressObjects = [];
  }

  adjustIntensity(newIntensity) {
    if (this.isRunning) {
      this.startStressTest(newIntensity);
    }
  }
}

import React, { useState } from 'react';

export function StressTestControls({ stressTest, isRunning, onToggle, onIntensityChange }) {
  const [intensity, setIntensity] = useState(50);

  const handleIntensityChange = (e) => {
    const newIntensity = parseInt(e.target.value);
    setIntensity(newIntensity);
    onIntensityChange(newIntensity);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      border: '1px solid #333',
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>GPU Stress Test</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={onToggle}
          style={{
            background: isRunning ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            width: '100%'
          }}
        >
          {isRunning ? 'Stop Stress Test' : 'Start Stress Test'}
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Intensity: {intensity}
        </label>
        <input
          type="range"
          min="10"
          max="500"
          value={intensity}
          onChange={handleIntensityChange}
          style={{
            width: '100%',
            accentColor: '#4CAF50'
          }}
        />
        <div style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>
          More objects = Higher GPU load
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#ccc' }}>
        {isRunning ? 'Stress test is running' : 'Click start to stress test GPU'}
      </div>
    </div>
  );
}