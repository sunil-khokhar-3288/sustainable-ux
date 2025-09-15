import React, { useEffect, useMemo, useRef, useState } from 'react';

function useRollingBuffer(size) {
  const ref = useRef([]);
  const push = (value) => {
    ref.current.push(value);
    if (ref.current.length > size) ref.current.shift();
  };
  return [ref, push];
}

function LineChart({ data, width = 300, height = 80, color = '#4CAF50', bg = 'rgba(255,255,255,0.06)', grid = true, min = 0, max = 100 }) {
  const padding = 8;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';
    const len = data.length;
    return data.map((v, i) => {
      const x = (i / Math.max(1, len - 1)) * w + padding;
      const clamped = Math.max(min, Math.min(max, v));
      const y = height - padding - ((clamped - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(' ');
  }, [data, w, h, height, padding, min, max]);

  return (
    <svg width={width} height={height} style={{ display: 'block', background: bg, borderRadius: 8 }}>
      {grid && (
        <g opacity="0.15" stroke="#ffffff">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={padding} x2={width - padding} y1={padding + (h * t)} y2={padding + (h * t)} />
          ))}
        </g>
      )}
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

function PieChart({ value = 0, width = 140, height = 140, stroke = 12, color = '#4CAF50', bg = 'rgba(255,255,255,0.1)' }) {
  const radius = Math.min(width, height) / 2 - stroke;
  const cx = width / 2;
  const cy = height / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={radius} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontFamily="monospace" fontSize="18">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

function BarComparison({ title, leftLabel, rightLabel, leftValue, rightValue, max, colorLeft = '#42A5F5', colorRight = '#FF7043', unit = '' }) {
  const safeMax = Math.max(max || 1, leftValue || 0, rightValue || 0, 1);
  const leftPct = Math.min(100, Math.round(((leftValue || 0) / safeMax) * 100));
  const rightPct = Math.min(100, Math.round(((rightValue || 0) / safeMax) * 100));
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, opacity: 0.85 }}>{leftLabel} — {(leftValue ?? 0).toFixed(0)}{unit}</div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${leftPct}%`, height: '100%', background: colorLeft }} />
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, opacity: 0.85 }}>{rightLabel} — {(rightValue ?? 0).toFixed(0)}{unit}</div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${rightPct}%`, height: '100%', background: colorRight }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GPUDashboard({ gpuMonitor, baselinePowerAvg, optimizedPowerAvg, gridFactorGramsPerWh = 0.4 }) {
  const [stats, setStats] = useState(gpuMonitor ? gpuMonitor.getStats() : null);
  const [fpsBuf, pushFps] = useRollingBuffer(120);
  const [utilBuf, pushUtil] = useRollingBuffer(120);
  const [tempBuf, pushTemp] = useRollingBuffer(120);

  useEffect(() => {
    if (!gpuMonitor) return;
    const id = setInterval(() => {
      const s = gpuMonitor.getStats();
      setStats(s);
      pushFps(s.fps || 0);
      pushUtil(s.gpu.utilization || 0);
      pushTemp(s.gpu.temperature || 0);
    }, 200);
    return () => clearInterval(id);
  }, [gpuMonitor]);

  if (!stats) return null;

  const cardStyle = {
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
  };

  const powerBase = baselinePowerAvg ?? stats?.gpu?.power ?? 0;
  const powerOpt = optimizedPowerAvg ?? stats?.gpu?.power ?? 0;
  const co2Base = powerBase * gridFactorGramsPerWh;
  const co2Opt = powerOpt * gridFactorGramsPerWh;

  return (
    <div style={{ position: 'fixed', inset: 'auto 10px 10px auto', width: 720, maxWidth: '95vw', zIndex: 1002 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>FPS</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.fps.toFixed(1)}</div>
          </div>
          <LineChart data={[...fpsBuf.current]} color="#00E5FF" max={120} />
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>GPU Utilization</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.gpu.utilization}%</div>
          </div>
          <LineChart data={[...utilBuf.current]} color="#4CAF50" />
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>GPU Temperature</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.gpu.temperature?.toFixed(1)}°C</div>
          </div>
          <LineChart data={[...tempBuf.current]} color="#FF7043" max={90} />
        </div>

        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Power</div>
            <PieChart value={Math.min(100, (stats.gpu.power / 80) * 100)} color="#AB47BC" />
            <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{stats.gpu.power} W</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Textures</div>
            <PieChart value={Math.min(100, (stats.memory?.webgl?.textures || 0) / 64 * 100)} color="#26A69A" />
            <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{stats.memory?.webgl?.textures || 0}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Memory</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>JS Heap Used</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.jsHeap?.used / 1048576).toFixed(1)} MB</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>JS Heap Total</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.jsHeap?.total / 1048576).toFixed(1)} MB</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>GPU Mem Used</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.used / 1048576).toFixed(1)} MB</div>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle }}>
          <BarComparison
            title="Energy (Average Power)"
            leftLabel="Baseline"
            rightLabel="Optimized"
            leftValue={powerBase}
            rightValue={powerOpt}
            unit=" W"
            max={Math.max(powerBase, powerOpt, 1)}
            colorLeft="#EF5350"
            colorRight="#66BB6A"
          />
          <div style={{ height: 12 }} />
          <BarComparison
            title="CO₂ Emissions (per hour)"
            leftLabel="Baseline"
            rightLabel="Optimized"
            leftValue={co2Base}
            rightValue={co2Opt}
            unit=" g"
            max={Math.max(co2Base, co2Opt, 1)}
            colorLeft="#FFA726"
            colorRight="#26A69A"
          />
        </div>
      </div>
    </div>
  );
}


