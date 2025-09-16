import React, { useEffect, useMemo, useRef, useState } from 'react';

function useRollingBuffer(size) {
  const ref = useRef([]);
  const push = (value) => {
    ref.current.push(value);
    if (ref.current.length > size) ref.current.shift();
  };
  return [ref, push];
}

function LineChart({ data, width = 300, height = 80, color = '#4CAF50', bg = 'rgba(255,255,255,0.06)', grid = true, min = 0, max = 100, showAxes = false, yTicks, xLabels }) {
  const paddingLeft = showAxes ? 34 : 8;
  const paddingBottom = showAxes ? 18 : 8;
  const paddingTopRight = 8;
  const w = width - paddingLeft - paddingTopRight;
  const h = height - paddingTopRight - paddingBottom;
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';
    const len = data.length;
    return data.map((v, i) => {
      const x = (i / Math.max(1, len - 1)) * w + paddingLeft;
      const clamped = Math.max(min, Math.min(max, v));
      const y = height - paddingBottom - ((clamped - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(' ');
  }, [data, w, h, height, paddingLeft, paddingBottom, min, max]);

  return (
    <svg width={width} height={height} style={{ display: 'block', background: bg, borderRadius: 8 }}>
      {grid && (
        <g opacity="0.15" stroke="#ffffff">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={paddingLeft} x2={width - paddingTopRight} y1={paddingTopRight + (h * t)} y2={paddingTopRight + (h * t)} />
          ))}
        </g>
      )}
      {showAxes && (
        <g>
          {/* Y axis */}
          <line x1={paddingLeft} y1={paddingTopRight} x2={paddingLeft} y2={height - paddingBottom} stroke="#9CA3AF" strokeWidth="1" />
          {/* X axis */}
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingTopRight} y2={height - paddingBottom} stroke="#9CA3AF" strokeWidth="1" />
          {/* Y ticks */}
          {(() => {
            const ticks = yTicks && yTicks.length ? yTicks : [min, (min + max) / 2, max];
            return ticks.map((tv, idx) => {
              const y = height - paddingBottom - ((tv - min) / (max - min)) * h;
              return (
                <g key={`yt-${idx}`}>
                  <line x1={paddingLeft - 4} x2={paddingLeft} y1={y} y2={y} stroke="#9CA3AF" strokeWidth="1" />
                  <text x={paddingLeft - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9CA3AF" fontFamily="monospace">{Math.round(tv)}</text>
                </g>
              );
            });
          })()}
          {/* X labels */}
          {xLabels && xLabels.length > 0 && xLabels.map((xl, idx) => {
            const len = Math.max(1, data.length - 1);
            const x = (xl.i / len) * w + paddingLeft;
            return (
              <text key={`xl-${idx}`} x={x} y={height - 2} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontFamily="monospace">{xl.label}</text>
            );
          })}
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
  const [co2HistRef, pushCo2Hist] = useRollingBuffer(60);
  const [powerHistRef, pushPowerHist] = useRollingBuffer(60);
  const bucketRef = useRef({ samples: [], lastTs: performance.now() });

  useEffect(() => {
    if (!gpuMonitor) return;
    const id = setInterval(() => {
      const s = gpuMonitor.getStats();
      setStats(s);
      pushFps(s.fps || 0);
      pushUtil(s.gpu.utilization || 0);
      pushTemp(s.gpu.temperature || 0);
      // Aggregate power samples into 5s CO2 buckets
      bucketRef.current.samples.push(s.gpu.power || 0);
      const now = performance.now();
      if (now - bucketRef.current.lastTs >= 5000) {
        const arr = bucketRef.current.samples;
        const avgPower = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        const co2PerHour = avgPower * gridFactorGramsPerWh; // grams/hour
        pushCo2Hist(co2PerHour);
        pushPowerHist(avgPower);
        bucketRef.current.samples = [];
        bucketRef.current.lastTs = now;
      }
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
    color: 'white'
  };

  const powerBase = baselinePowerAvg ?? stats?.gpu?.power ?? 0;
  const powerOpt = optimizedPowerAvg ?? stats?.gpu?.power ?? 0;
  const co2Base = powerBase * gridFactorGramsPerWh;
  const co2Opt = powerOpt * gridFactorGramsPerWh;

  return (
    <div style={{ position: 'relative', width: 720, maxWidth: '95vw', margin: '0 auto' }}>
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
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>CO2 (g/hour, 5s)</div>
            {co2HistRef.current.length > 0 && (
              <div style={{ fontFamily: 'monospace', fontSize: 14 }}>{co2HistRef.current[co2HistRef.current.length - 1].toFixed(0)} g/h</div>
            )}
          </div>
          <LineChart 
            data={[...co2HistRef.current]} 
            color="#FFA726" 
            min={0} 
            max={Math.max(20, Math.max(...(co2HistRef.current.length ? co2HistRef.current : [0])))} 
          />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>Energy (Avg Power, 5s)</div>
            {powerHistRef.current.length > 0 && (
              <div style={{ fontFamily: 'monospace', fontSize: 14 }}>{powerHistRef.current[powerHistRef.current.length - 1].toFixed(0)} W</div>
            )}
          </div>
          <LineChart
            data={[...powerHistRef.current]}
            height={150}
            color="#42A5F5"
            min={0}
            max={Math.max(150, Math.max(...(powerHistRef.current.length ? powerHistRef.current : [0])))}
            showAxes={true}
            yTicks={[0, 50, 100, 150, 200]}
            xLabels={[{ i: 0, label: 'T-5m' }, { i: Math.floor((powerHistRef.current.length - 1) / 2), label: 'T-2.5m' }, { i: Math.max(0, powerHistRef.current.length - 1), label: 'Now' }]}
          />
        </div>

        {/* <div style={{ ...cardStyle }}>
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
        </div> */}
      </div>
    </div>
  );
}


