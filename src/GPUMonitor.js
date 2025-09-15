import * as THREE from "three";

export class GPUMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
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
      
      // Get GPU memory info if available (NVX extension constants)
      try {
        const GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX = 0x9049 - 0x0002; // 0x9047
        const GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX = 0x904A - 0x0002; // 0x9048
        if (this.gl.getParameter) {
          const total = this.gl.getParameter(GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX);
          const avail = this.gl.getParameter(GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX);
          if (typeof total === 'number' && typeof avail === 'number') {
            this.stats.memory.total = total;
            this.stats.memory.available = avail;
            this.stats.memory.used = Math.max(0, total - avail);
          }
        }
      } catch (_) {
        // ignore if not supported
      }
      
      console.log('GPU Info:', {
        renderer: rendererInfo,
        vendor: vendorInfo,
        memory: this.stats.memory
      });
      
    } catch (error) {
      console.warn('Could not get GPU info:', error);
    }
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

    // Power estimate scaled with utilization
    const baseWatts = 15;
    const dynamicWatts = 60; // headroom
    this.stats.gpu.power = Math.round(baseWatts + dynamicWatts * (utilization / 100));
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