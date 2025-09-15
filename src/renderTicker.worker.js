// Simple worker that posts ticks at a target interval
let intervalId = null;

self.onmessage = (e) => {
  const { type, fps } = e.data || {};
  if (type === 'start') {
    if (intervalId) clearInterval(intervalId);
    const targetMs = Math.max(5, Math.floor(1000 / (fps || 60)));
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick', now: performance.now() });
    }, targetMs);
  } else if (type === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};


