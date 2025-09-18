# Sustainable UX Dashboard

A comprehensive GPU monitoring and sustainability visualization tool built with React and Three.js. This project demonstrates how different UI themes, rendering settings, and performance optimizations impact energy consumption and carbon emissions in real-time.

## 🌟 Features

### Real-time GPU Monitoring
- **Performance Metrics**: FPS, frame time, GPU utilization, temperature, and power consumption
- **Memory Tracking**: JS heap usage, WebGL resources, and GPU memory utilization
- **Dynamic Charts**: Live line charts with area fills for power and CO₂ trends
- **Interactive Controls**: Real-time adjustment of rendering parameters

### Sustainability Focus
- **Theme-based Energy Modeling**: Different themes (Light, Dark, OLED, E-Ink, High-Contrast) with realistic power baselines
- **Carbon Footprint Tracking**: Real-time CO₂ emissions calculation based on power consumption
- **Optimization Recommendations**: Built-in suggestions for energy-efficient settings
- **Comparative Analysis**: Side-by-side baseline vs optimized performance metrics

### Advanced Rendering Controls
- **Adaptive Resolution**: Dynamic pixel ratio clamping and viewport scaling
- **FPS Management**: Separate foreground and background frame rate controls
- **Performance Modes**: Baseline (high-performance) vs Optimized (energy-efficient) presets
- **3D Model Interaction**: Interactive car model with mouse/touch controls

### Professional Dashboard
- **Multi-panel Layout**: Organized cards showing different metrics and comparisons
- **Export Functionality**: CSV export of all metrics for analysis
- **Responsive Design**: Works on desktop and mobile devices
- **Modal Interface**: Full-screen dashboard with overlay controls

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Modern web browser with WebGL support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sustainable-ux
   ```

2. **Update and Build the dependencies**
   ```bash
   npm --force update
   # followed by 
   npm run build
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.


## 📊 Project Structure

```
src/
├── App.js                 # Main application component
├── GPUDashboard.js        # Comprehensive dashboard with charts and metrics
├── GPUMonitor.js          # Core GPU monitoring and power estimation
├── GPUStatsDisplay.js     # Compact stats overlay component
├── GPUStressTest.js       # GPU stress testing functionality
├── ThreeDModelScene.js    # Three.js scene setup and theme management
├── ThreeSceneWithGPU.js   # Main scene component with controls
├── renderTicker.worker.js # Web worker for background processing
└── index.css              # Global styles

public/
├── models/
│   └── car.glb           # 3D car model for visualization
└── index.html            # HTML template
```

## 🎮 Usage Guide

### Basic Navigation

1. **Scene Controls**: Use the "Scene Settings" overlay in the top-left to adjust rendering parameters
2. **GPU Stats**: Toggle the "Show GPU Stats" button to display real-time performance metrics
3. **Dashboard**: Click "Open Sustainability Dashboard" for comprehensive analytics
4. **3D Interaction**: Click and drag to rotate the car model

### Theme Selection

Switch between different UI themes to see their energy impact:

- **Light**: Standard bright theme (14W baseline)
- **Dark**: Energy-friendly dark theme (9W baseline)
- **OLED**: Pure black theme for OLED displays (6W baseline)
- **E-Ink**: Grayscale theme mimicking e-ink displays (7W baseline)
- **High-Contrast**: High contrast for accessibility (11W baseline)

### Performance Optimization

1. **Apply Optimizations**: Use the "Apply recommended optimizations" button in the dashboard
2. **Manual Tuning**: Adjust individual parameters:
   - Target FPS: Lower values reduce energy consumption
   - Pixel Ratio Clamp: Limits rendering resolution
   - Viewport Scale: Reduces effective rendering area
   - Background FPS: Controls performance when tab is hidden

### Comparison Mode

1. Click "Compare (2s each)" to run automated baseline vs optimized comparison
2. View side-by-side metrics in the dashboard
3. See energy savings and CO₂ reduction calculations

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_GRID_FACTOR=0.4  # CO₂ grams per Wh (default: 0.4)
REACT_APP_BASE_POWER=80    # Base power estimation in watts
```

### Custom Themes

Add new themes by modifying the `themeBaselineWatts` object in `GPUMonitor.js`:

```javascript
this.themeBaselineWatts = {
  light: 14,
  dark: 9,
  'high-contrast': 11,
  eink: 7,
  oled: 6,
  'your-theme': 8  // Add your custom theme
};
```

### Model Replacement

Replace the 3D model by:
1. Adding your `.glb` file to `public/models/`
2. Updating the model path in `ThreeDModelScene.js`:

```javascript
loader.load(
  '/models/your-model.glb',  // Update this path
  // ... rest of the loader configuration
);
```

## 📈 Metrics Explained

### Power Estimation
- **Theme Baseline**: Base power consumption for each theme
- **Dynamic Component**: Additional power based on GPU utilization
- **Formula**: `themeBase + (dynamicWatts × utilization / 100)`

### CO₂ Emissions
- **Calculation**: `power × gridFactorGramsPerWh`
- **Grid Factor**: Default 0.4 g/Wh (varies by region)
- **Time Base**: Per-hour emissions

### GPU Utilization
- **Estimation**: Based on frame time, draw calls, and triangle count
- **Range**: 0-100% with color-coded indicators
- **Temperature**: Modeled based on utilization level

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start development server
npm run build      # Create production build
npm test           # Run test suite
npm run eject      # Eject from Create React App (irreversible)
```

### Code Architecture

- **React Hooks**: Functional components with hooks for state management
- **Three.js Integration**: WebGL rendering with performance monitoring
- **Web Workers**: Background processing for non-blocking operations
- **Responsive Design**: CSS Grid and Flexbox for adaptive layouts

### Performance Considerations

- **Frame Rate Limiting**: Prevents excessive GPU usage
- **Memory Management**: Proper cleanup of Three.js resources
- **Efficient Updates**: Throttled monitoring to reduce overhead
- **Adaptive Rendering**: Dynamic quality adjustment based on performance

## 🌍 Sustainability Impact

This tool demonstrates how UI design choices affect energy consumption:

- **Dark themes** can reduce display power by 15-30% on OLED screens
- **Lower frame rates** significantly reduce GPU power consumption
- **Reduced resolution** decreases both GPU and display energy usage
- **Efficient rendering** techniques can cut power consumption by 40-60%

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## 🙏 Acknowledgments

- **Three.js** for 3D rendering capabilities
- **React** for component-based architecture
- **WebGL** for hardware-accelerated graphics
- **Sustainability research** for energy modeling insights

## 📞 Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Check the documentation in the code comments
- Review the example configurations

---

**Built with ❤️ for sustainable web development**
