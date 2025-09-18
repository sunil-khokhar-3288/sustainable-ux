import React, { useEffect, useMemo, useRef, useState } from 'react';

function useRollingBuffer(size) {
  const ref = useRef([]);
  const push = (value) => {
    ref.current.push(value);
    if (ref.current.length > size) ref.current.shift();
  };
  return [ref, push];
}

function LineChart({ data, width = 300, height = 80, color = '#4CAF50', bg = 'rgba(255,255,255,0.06)', grid = true, min = 0, max = 100, strokeWidth = 2, area = false, areaOpacity = 0.15, yAxis = true, yTicks }) {
  const padding = 8;
  const yAxisSpace = yAxis ? 28 : 0;
  const w = width - padding * 2 - yAxisSpace;
  const h = height - padding * 2;
  const tickValues = React.useMemo(() => (yTicks && yTicks.length ? yTicks : [0, 20, 40, 60, 80, 100]), [yTicks]);
  const visibleTickValues = React.useMemo(() => tickValues.filter((v) => v >= min && v <= max), [tickValues, min, max]);
  const denom = Math.max(1e-6, max - min);
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';
    const len = data.length;
    return data.map((v, i) => {
      const x = (i / Math.max(1, len - 1)) * w + padding + yAxisSpace;
      const clamped = Math.max(min, Math.min(max, v));
      const y = height - padding - ((clamped - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(' ');
  }, [data, w, h, height, padding, min, max, yAxisSpace]);
  const areaPoints = useMemo(() => {
    if (!data || data.length === 0) return '';
    const len = data.length;
    const baselineY = height - padding;
    const leftX = padding + yAxisSpace;
    const rightX = width - padding;
    const linePts = data.map((v, i) => {
      const x = (i / Math.max(1, len - 1)) * w + padding + yAxisSpace;
      const clamped = Math.max(min, Math.min(max, v));
      const y = height - padding - ((clamped - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(' ');
    return `${leftX},${baselineY} ${linePts} ${rightX},${baselineY}`;
  }, [data, w, h, height, padding, min, max, yAxisSpace]);

  return (
    <svg width={width} height={height} style={{ display: 'block', background: bg, borderRadius: 8 }}>
      {grid && (
        <g opacity="0.15" stroke="#ffffff">
          {visibleTickValues.map((tick) => {
            const t = (tick - min) / denom; // 0..1 from bottom
            const yPos = height - padding - (t * h);
            return (
              <line key={`g-${tick}`} x1={padding + yAxisSpace} x2={width - padding} y1={yPos} y2={yPos} />
            );
          })}
        </g>
      )}
      {yAxis && (
        <g>
          <line x1={padding + yAxisSpace} x2={padding + yAxisSpace} y1={padding} y2={height - padding} stroke="#ffffff" opacity="0.25" />
          {visibleTickValues.map((tick) => {
            const t = (tick - min) / denom; // 0..1 from bottom
            const yPos = height - padding - (t * h);
            return (
              <g key={`y-${tick}`}>
                <line x1={padding + yAxisSpace - 4} x2={padding + yAxisSpace} y1={yPos} y2={yPos} stroke="#ffffff" opacity="0.35" />
                <text x={padding + yAxisSpace - 6} y={yPos} textAnchor="end" dominantBaseline="middle" fill="#ffffff" fontFamily="monospace" fontSize="10" opacity="0.7">
                  {tick}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {area && (
        <polygon fill={color} opacity={areaOpacity} points={areaPoints} />
      )}
      <polyline fill="none" stroke={color} strokeWidth={strokeWidth} points={points} />
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

export default function GPUDashboard({ gpuMonitor, baselinePowerAvg, optimizedPowerAvg, gridFactorGramsPerWh = 0.4, settings, inModal = false, onApplyOptimizations, onExportMetrics }) {
  const [stats, setStats] = useState(gpuMonitor ? gpuMonitor.getStats() : null);
  const [fpsBuf, pushFps] = useRollingBuffer(120);
  const [utilBuf, pushUtil] = useRollingBuffer(120);
  const [tempBuf, pushTemp] = useRollingBuffer(120);
  const [powerBuf, pushPower] = useRollingBuffer(120);
  const [co2Buf, pushCo2] = useRollingBuffer(120);

  useEffect(() => {
    if (!gpuMonitor) return;
    const id = setInterval(() => {
      const s = gpuMonitor.getStats();
      setStats(s);
      pushFps(s.fps || 0);
      pushUtil(s.gpu.utilization || 0);
      pushTemp(s.gpu.temperature || 0);
      const p = s.gpu.power || 0;
      pushPower(p);
      pushCo2(p * gridFactorGramsPerWh);
    }, 200);
    return () => clearInterval(id);
  }, [gpuMonitor]);

  if (!stats) return null;

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(16,18,24,0.95), rgba(12,14,18,0.92))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: 16,
    padding: 18,
    color: 'white',
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
  };

  const powerBase = baselinePowerAvg ?? stats?.gpu?.power ?? 0;
  const powerOpt = optimizedPowerAvg ?? stats?.gpu?.power ?? 0;
  const co2Base = powerBase * gridFactorGramsPerWh;
  const co2Opt = powerOpt * gridFactorGramsPerWh;
  const energyReductionPct = powerBase > 0 ? ((powerBase - powerOpt) / powerBase) * 100 : 0;
  const co2ReductionPct = co2Base > 0 ? ((co2Base - co2Opt) / co2Base) * 100 : 0;

  // Estimate theme/resolution influence (illustrative model)
  const themeFactor = settings?.theme === 'dark' ? 0.9 : settings?.theme === 'oled' ? 0.85 : settings?.theme === 'eink' ? 0.88 : settings?.theme === 'high-contrast' ? 0.96 : 1.0;
  const resolutionFactor = (settings ? (Math.min(3, Math.max(0.5, settings.pixelRatioClamp || 1.5)) / 3) : (1.5/3))
    * (settings ? (Math.min(1, Math.max(0.3, settings.viewportScale || 1))) : 1);
  const fpsFactor = settings ? Math.min(1, (settings.targetFps || 30) / 60) : 0.5;
  const estimatedRelativeEnergy = Math.max(0.15, themeFactor * (0.6 * resolutionFactor + 0.4 * fpsFactor));
  const estimatedPower = Math.round(80 * estimatedRelativeEnergy);

  const outerStyle = inModal
    ? { width: '100%', maxWidth: 1240, margin: '0 auto' }
    : { position: 'fixed', inset: 'auto 10px 10px auto', width: 720, maxWidth: '95vw', zIndex: 1002 };

  return (
    <div style={outerStyle}>
      {/* KPI Row - multi-color palette */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, padding: inModal ? '18px' : '0', paddingBottom: 0 }}>
        {/* Energy (kWh) - amber */}
        <div style={{ ...cardStyle, padding: 16, background: 'linear-gradient(145deg, rgba(120,53,15,0.5), rgba(245,158,11,0.25))', border: '1px solid rgba(245,158,11,0.35)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85 }}>Energy (W)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#FACC15' }}>{(stats.gpu.power).toFixed(2)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>W</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Theme: {settings?.theme ?? 'n/a'}</div>
        </div>

        {/* GPU Utilization - green */}
        <div style={{ ...cardStyle, padding: 16, background: 'linear-gradient(145deg, rgba(6,95,70,0.5), rgba(16,185,129,0.25))', border: '1px solid rgba(16,185,129,0.35)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85 }}>GPU Utilization</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#10B981' }}>{stats.gpu.utilization}%</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Temp: {stats.gpu.temperature?.toFixed(1)}°C</div>
        </div>

        {/* Memory - blue */}
        <div style={{ ...cardStyle, padding: 16, background: 'linear-gradient(145deg, rgba(30,58,138,0.5), rgba(59,130,246,0.25))', border: '1px solid rgba(59,130,246,0.35)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85 }}>Memory (JS heap used)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#60A5FA' }}>{(stats.memory?.jsHeap?.used / 1048576).toFixed(1)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>MB</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Textures: {stats.memory?.webgl?.textures || 0}</div>
        </div>

        {/* CO2 - red */}
        <div style={{ ...cardStyle, padding: 16, background: 'linear-gradient(145deg, rgba(127,29,29,0.5), rgba(239,68,68,0.25))', border: '1px solid rgba(239,68,68,0.35)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85 }}>CO₂ Emission (per hour)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#F87171' }}>{(stats.gpu.power * gridFactorGramsPerWh).toFixed(1)}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>g</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Est. power: {estimatedPower} W</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr', gap: 18, padding: inModal ? '18px' : '0' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>FPS</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.fps.toFixed(1)}</div>
          </div>
          <LineChart data={[...fpsBuf.current]} color="#00E5FF" min={0} max={50} yTicks={[0,10,20,30,40,50]} width={400} height={100}/>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>GPU Utilization</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.gpu.utilization}%</div>
          </div>
          <LineChart data={[...utilBuf.current]} color="#34D399" min={0} max={110} yTicks={[0,20,40,60,80,100]} width={650} height={100} />
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.85 }}>GPU Temperature</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18 }}>{stats.gpu.temperature?.toFixed(1)}°C</div>
          </div>
          <LineChart data={[...tempBuf.current]} color="#F59E0B" max={90} width={400} height={150}/>
        </div>

        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'linear-gradient(145deg, rgba(120,53,15,0.5), rgba(245,158,11,0.25))' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Power</div>
            <PieChart value={Math.min(100, (stats.gpu.power / 80) * 100)} color="#8B5CF6" />
            <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{stats.gpu.power} W</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Textures</div>
            <PieChart value={Math.min(100, (stats.memory?.webgl?.textures || 0) / 64 * 100)} color="#22D3EE" />
            <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{stats.memory?.webgl?.textures || 0}</div>
          </div>
        </div>

        {/* Energy Breakdown Pie (UI components) - moved up */}
        <div style={{ ...cardStyle, background: 'linear-gradient(145deg, rgba(27, 219, 55, 0.5), rgba(239,68,68,0.25))' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Energy Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'conic-gradient(#22D3EE 0 30%, #10B981 30% 65%, #F59E0B 65% 80%, #F43F5E 80% 100%)',
              margin: '0 auto',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'monospace', fontSize: 14 }}>UI</div>
            </div>
            <div style={{ display: 'grid', gap: 6, fontFamily: 'monospace', fontSize: 12 }}>
              <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22D3EE', borderRadius: 2, marginRight: 6 }}></span> Rendering — 30%</div>
              <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10B981', borderRadius: 2, marginRight: 6 }}></span> Media — 35%</div>
              <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#F59E0B', borderRadius: 2, marginRight: 6 }}></span> Networking — 15%</div>
              <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#F43F5E', borderRadius: 2, marginRight: 6 }}></span> Other — 20%</div>
            </div>
          </div>
        </div>

        {/* Trends (Power & CO₂) */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Trends (Power & CO₂)</div>
          {(() => {
            const powerData = [...powerBuf.current];
            const co2Data = [...co2Buf.current];
            const dynPowerMax = Math.max(50, Math.max(...powerData, 0) * 1.2);
            const dynCo2Max = Math.max(50, Math.max(...co2Data, 0) * 1.2);
            return (
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Power (W)</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{(powerData[powerData.length - 1] || 0).toFixed(0)} W</div>
                  </div>
                  <LineChart data={powerData} color="#8B5CF6" min={0} max={dynPowerMax} width={680} height={110} strokeWidth={2.5} area areaOpacity={0.18} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>CO₂ (g/hour)</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{(co2Data[co2Data.length - 1] || 0).toFixed(0)} g</div>
                  </div>
                  <LineChart data={co2Data} color="#22D3EE" min={0} max={dynCo2Max} width={680} height={110} strokeWidth={2.5} area areaOpacity={0.18} />
                </div>
              </div>
            );
          })()}
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Rendering Comparison</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Light vs Dark</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Light</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{Math.round(estimatedPower * 1.1)} W</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Dark</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{Math.round(estimatedPower * 0.9)} W</div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Viewport Scale</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>100%</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{Math.round(estimatedPower * 1.0)} W</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>80%</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{Math.round(estimatedPower * 0.85)} W</div>
                </div>
              </div>
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
            colorLeft="#F43F5E"
            colorRight="#10B981"
          />
          <div style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 6, color: energyReductionPct >= 0 ? '#10B981' : '#F43F5E' }}>
            {energyReductionPct >= 0 ? 'Reduction' : 'Increase'}: {Math.abs(energyReductionPct).toFixed(1)}%
          </div>
          <div style={{ height: 12 }} />
          <BarComparison
            title="CO₂ Emissions (per hour)"
            leftLabel="Baseline"
            rightLabel="Optimized"
            leftValue={co2Base}
            rightValue={co2Opt}
            unit=" g"
            max={Math.max(co2Base, co2Opt, 1)}
            colorLeft="#F59E0B"
            colorRight="#22D3EE"
          />
          <div style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 6, color: co2ReductionPct >= 0 ? '#10B981' : '#F43F5E' }}>
            {co2ReductionPct >= 0 ? 'Reduction' : 'Increase'}: {Math.abs(co2ReductionPct).toFixed(1)}%
          </div>
          <div style={{ height: 12 }} />
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.9 }}>
            Estimated power with current settings: <strong>{estimatedPower} W</strong>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            Theme factor: {themeFactor.toFixed(2)} • Resolution factor: {resolutionFactor.toFixed(2)} • FPS factor: {fpsFactor.toFixed(2)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Memory</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>JS Heap Used</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.jsHeap?.used / 1048576).toFixed(1)} MB</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>JS Heap Total</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.jsHeap?.total / 1048576).toFixed(1)} MB</div>
            </div>
            {/* <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>GPU Mem Used</div>
              <div style={{ fontSize: 16 }}>{(stats.memory?.used / 1048576).toFixed(1)} MB</div>
            </div> */}
          </div>
        </div>
        

        {/* Geometry & Draw Calls - moved down */}
        <div style={{ ...cardStyle, background: 'linear-gradient(145deg, rgba(239, 189, 160, 0.5), rgba(128, 100, 229, 0.25))' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Geometry & Draw Calls</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Draw Calls</div>
              <div style={{ fontSize: 16 }}>{stats.drawCalls}</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Triangles</div>
              <div style={{ fontSize: 16 }}>{stats.triangles}</div>
            </div>
          </div>
        </div>
        {/* Right column: Quick Actions & Tips */}
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 10, opacity: 0.9 }}>Quick Actions</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {/* <button onClick={onApplyOptimizations} style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#0b0b0b',
                border: 'none',
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 13
              }}>Apply recommended optimizations</button> */}
              <button onClick={onExportMetrics} style={{
                background: 'transparent',
                color: '#E0F2F1',
                border: '1px solid rgba(224,242,241,0.25)',
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 13
              }}>Export metrics (CSV)</button>
            </div>
          </div>
        </div>

        {/* Context & Tips moved as its own card so it occupies the right column */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 10, opacity: 0.9 }}>Context & Tips</div>
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6, opacity: 0.85 }}>
            <li>Use dark mode on OLED to reduce display energy.</li>
            <li>Prefer WebP/AVIF for images to reduce bytes transferred.</li>
            <li>Virtualization saves rendering cost for large lists.</li>
            <li>Lazy-load videos and images; avoid autoplay.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


