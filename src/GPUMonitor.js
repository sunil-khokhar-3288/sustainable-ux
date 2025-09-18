import * as THREE from "three";

export class GPUMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
    this.currentTheme = 'light';
    this.themeBaselineWatts = {
      light: 14,
      dark: 9,
      'high-contrast': 11,
      eink: 7,
      oled: 6
    };
    this.stats = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      memory: {
        // NVX GPU memory (if available)
        used: 0,
        total: 0,
        available: 0,
        // JS heap memory (if available)
        jsHeap: {
          used: 0,
          total: 0,
          limit: 0
        },
        // WebGL resource counts
        webgl: {
          geometries: 0,
          textures: 0,
          programs: 0
        }
      },
      gpu: {
        temperature: null,
        utilization: null,
        power: null
      }
    };
    
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameTimes = [];
    this.lastRenderNow = 0;
    this.fpsSamples = [];
    this.dynamicPeakFps = 60;
    
    // Initialize WebGL extensions for monitoring
    this.initWebGLExtensions();
    
    // Start monitoring
    this.startMonitoring();
  }

  setTheme(theme) {
    this.currentTheme = theme || 'light';
  }
  
  initWebGLExtensions() {
    // Check for available WebGL extensions
    const extensions = this.gl.getSupportedExtensions();
    
    // Memory info extension (if available)
    if (extensions.includes('WEBGL_debug_renderer_info')) {
      this.debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    }
    
    // Performance extension (if available)
    if (extensions.includes('EXT_disjoint_timer_query')) {
      this.timerQuery = this.gl.getExtension('EXT_disjoint_timer_query');
    }
    
    // Memory info extension (if available)
    if (extensions.includes('WEBGL_lose_context')) {
      this.loseContext = this.gl.getExtension('WEBGL_lose_context');
    }
    
    // Get GPU information
    this.getGPUInfo();
  }
  
  getGPUInfo() {
    try {
      // Get renderer info
      const rendererInfo = this.gl.getParameter(this.gl.RENDERER);
      const vendorInfo = this.gl.getParameter(this.gl.VENDOR);
      
      // Attempt to populate GPU memory via NVX extension
      this.updateNVXMemory();
      
      console.log('GPU Info:', {
        renderer: rendererInfo,
        vendor: vendorInfo,
        memory: this.stats.memory
      });
      
    } catch (error) {
      console.warn('Could not get GPU info:', error);
    }
  }

  updateNVXMemory() {
    try {
      // NVX constants per spec (values are in KB)
      const GPU_MEMORY_INFO_DEDICATED_VIDMEM_NVX = 0x9047;
      const GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX = 0x9048;
      const GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX = 0x9049;
      if (this.gl && this.gl.getParameter) {
        const totalKb = this.gl.getParameter(GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX);
        const availKb = this.gl.getParameter(GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX);
        if (typeof totalKb === 'number' && typeof availKb === 'number' && isFinite(totalKb) && isFinite(availKb)) {
          const totalBytes = totalKb * 1024;
          const availBytes = availKb * 1024;
          this.stats.memory.total = totalBytes;
          this.stats.memory.available = availBytes;
          this.stats.memory.used = Math.max(0, totalBytes - availBytes);
        }
        const dedicatedKb = (() => { try { return this.gl.getParameter(GPU_MEMORY_INFO_DEDICATED_VIDMEM_NVX); } catch (_) { return null; } })();
        if (typeof dedicatedKb === 'number' && isFinite(dedicatedKb)) {
          this.stats.memory.dedicated = dedicatedKb * 1024;
        }
        return true;
      }
    } catch (_) {
      // ignore if not supported
    }
    return false;
  }
  
  startMonitoring() {
    this.monitorLoop();
  }
  
  monitorLoop() {
    const currentTime = performance.now();
    // Update WebGL stats
    this.updateWebGLStats();
    
    // Estimate GPU utilization based on frame time and complexity
    this.estimateGPUUtilization();
    
    this.lastTime = currentTime;
    
    requestAnimationFrame(() => this.monitorLoop());
  }

  // Call this from the render loop to record actual rendered frame cadence
  onFrameRendered(now) {
    if (!this.lastRenderNow) {
      this.lastRenderNow = now;
      return;
    }
    const delta = now - this.lastRenderNow;
    this.lastRenderNow = now;
    // Keep last 60 render frame times
    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    if (avgFrameTime && isFinite(avgFrameTime)) {
      this.stats.frameTime = avgFrameTime;
      this.stats.fps = 1000 / avgFrameTime;
      // Track FPS samples for dynamic peak calculation
      this.fpsSamples.push(this.stats.fps);
      if (this.fpsSamples.length > 120) { // ~2s window at 60fps
        this.fpsSamples.shift();
      }
      // Dynamic peak FPS based on recent window
      const recentPeak = Math.max(...this.fpsSamples);
      if (isFinite(recentPeak) && recentPeak > 0) {
        this.dynamicPeakFps = recentPeak;
      }
    }
  }
  
  updateWebGLStats() {
    try {
      // Get current WebGL state
      const info = this.renderer.info;
      
      this.stats.drawCalls = info.render.calls;
      this.stats.triangles = info.render.triangles;
      this.stats.textures = info.memory.textures;
      // WebGL resources
      if (info.memory) {
        this.stats.memory.webgl.geometries = info.memory.geometries || 0;
        this.stats.memory.webgl.textures = info.memory.textures || 0;
      }
      // Programs length if available
      if (Array.isArray(info.programs)) {
        this.stats.memory.webgl.programs = info.programs.length;
      }
      // JS Heap memory (Chrome-only)
      if (performance && performance.memory) {
        this.stats.memory.jsHeap.used = performance.memory.usedJSHeapSize || 0;
        this.stats.memory.jsHeap.total = performance.memory.totalJSHeapSize || 0; 
        this.stats.memory.jsHeap.limit = performance.memory.jsHeapSizeLimit || 0;
      }

      // Refresh NVX memory readings if available; otherwise estimate to avoid showing zero
      const hasNVX = this.updateNVXMemory();
      if (!hasNVX) {
        const estTexturesBytes = (this.stats.memory.webgl.textures || 0) * 6 * 1024 * 1024; // ~6 MiB per texture
        const estGeometriesBytes = (this.stats.memory.webgl.geometries || 0) * 1.5 * 1024 * 1024; // ~1.5 MiB per geometry
        const estTrianglesBytes = (this.stats.triangles || 0) * 100; // ~100 bytes per triangle heuristic
        const estimatedUsed = Math.max(estTexturesBytes + estGeometriesBytes, estTrianglesBytes);
        if (!this.stats.memory.used || this.stats.memory.used === 0) {
          this.stats.memory.used = estimatedUsed;
        }
      }
      
    } catch (error) {
      console.warn('Could not update WebGL stats:', error);
    }
  }
  
  estimateGPUUtilization() {
    // Approximate utilization relative to recent peak FPS
    // With an FPS cap, FPS drops but GPU work per frame stays similar, so
    // using relative FPS to recent peak gives a visible utilization change.
    const fps = Math.max(1, this.stats.fps || 0);
    const peak = Math.max(1, this.dynamicPeakFps || 60);
    const relativeFps = Math.min(1, fps / peak); // 0..1
    // Complexity hint keeps some variation when FPS is steady
    const complexity = Math.min(1, (this.stats.drawCalls / 200) + (this.stats.triangles / 500000));
    let utilization = (relativeFps * 0.7 + complexity * 0.3) * 100;
    utilization = Math.max(5, Math.min(100, utilization));

    this.stats.gpu.utilization = Math.round(utilization);

    // Temperature model with softer response
    const baseTemp = 40; // idle baseline
    const tempSpan = 35; // range up to ~75C
    this.stats.gpu.temperature = baseTemp + (tempSpan * (utilization / 100));

    // Power estimate: theme baseline + dynamic component scaled by utilization data
    const themeBase = this.themeBaselineWatts[this.currentTheme] ?? 10;
    const dynamicWatts = 70; // headroom for load-dependent power
    this.stats.gpu.power = Math.round(themeBase + dynamicWatts * (utilization / 100));
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  resetStats() {
    this.frameCount = 0;
    this.frameTimes = [];
    this.lastTime = performance.now();
  }
  
  destroy() {
    // Cleanup if needed
  }
}