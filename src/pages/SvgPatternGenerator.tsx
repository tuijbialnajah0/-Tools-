import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  Settings2, 
  Download, 
  Copy, 
  RefreshCw, 
  Layers, 
  Palette, 
  Maximize2, 
  Code, 
  FileJson,
  Check,
  Zap,
  Sparkles,
  Eye,
  Type,
  Square,
  Circle,
  Hash,
  Waves
} from 'lucide-react';
import { ToolActivator } from '../components/ToolActivator';

type PatternType = 'dots' | 'lines' | 'grid' | 'waves' | 'zigzag' | 'hexagons' | 'cross' | 'triangles' | 'noise';

interface PatternConfig {
  type: PatternType;
  scale: number;
  spacing: number;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  color: string;
  secondaryColor: string;
  bgColor: string;
  blendMode: string;
}

const PRESETS: Record<string, PatternConfig> = {
  'Modern Dots': {
    type: 'dots',
    scale: 4,
    spacing: 24,
    strokeWidth: 2,
    opacity: 0.4,
    rotation: 0,
    color: '#6366f1',
    secondaryColor: '#a855f7',
    bgColor: '#0f172a',
    blendMode: 'normal'
  },
  'Cyber Grid': {
    type: 'grid',
    scale: 1,
    spacing: 40,
    strokeWidth: 1,
    opacity: 0.2,
    rotation: 0,
    color: '#06b6d4',
    secondaryColor: '#22d3ee',
    bgColor: '#000000',
    blendMode: 'screen'
  },
  'Soft Waves': {
    type: 'waves',
    scale: 10,
    spacing: 50,
    strokeWidth: 2,
    opacity: 0.3,
    rotation: 0,
    color: '#ec4899',
    secondaryColor: '#f43f5e',
    bgColor: '#fdf2f8',
    blendMode: 'multiply'
  },
  'Blueprint': {
    type: 'grid',
    scale: 1,
    spacing: 20,
    strokeWidth: 0.5,
    opacity: 0.5,
    rotation: 0,
    color: '#ffffff',
    secondaryColor: '#ffffff',
    bgColor: '#1e40af',
    blendMode: 'normal'
  }
};

export default function SvgPatternGenerator() {
  const [config, setConfig] = useState<PatternConfig>(PRESETS['Modern Dots']);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);

  const generateSvgContent = (cfg: PatternConfig, id: string = 'pattern') => {
    const { type, scale, spacing, strokeWidth, opacity, rotation, color, secondaryColor } = cfg;
    const size = spacing;
    
    let patternHtml = '';
    
    switch (type) {
      case 'dots':
        patternHtml = `<circle cx="${size/2}" cy="${size/2}" r="${scale}" fill="${color}" fill-opacity="${opacity}" />`;
        break;
      case 'lines':
        patternHtml = `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`;
        break;
      case 'grid':
        patternHtml = `
          <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />
          <circle cx="0" cy="0" r="${strokeWidth * 1.5}" fill="${secondaryColor}" fill-opacity="${opacity}" />
        `;
        break;
      case 'waves':
        patternHtml = `<path d="M 0 ${size/2} Q ${size/4} ${size/2 - scale*2}, ${size/2} ${size/2} T ${size} ${size/2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`;
        break;
      case 'zigzag':
        patternHtml = `<path d="M 0 ${size/2} L ${size/4} ${size/2 - scale} L ${size/2} ${size/2} L ${size*0.75} ${size/2 + scale} L ${size} ${size/2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`;
        break;
      case 'cross':
        patternHtml = `
          <line x1="${size/2}" y1="${size/2 - scale}" x2="${size/2}" y2="${size/2 + scale}" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />
          <line x1="${size/2 - scale}" y1="${size/2}" x2="${size/2 + scale}" y2="${size/2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />
        `;
        break;
      case 'triangles':
        patternHtml = `<path d="M ${size/2} ${size/2 - scale} L ${size/2 + scale} ${size/2 + scale} L ${size/2 - scale} ${size/2 + scale} Z" fill="${color}" fill-opacity="${opacity}" />`;
        break;
      case 'hexagons':
        patternHtml = `<path d="M ${size/2} 0 L ${size} ${size/4} L ${size} ${size*0.75} L ${size/2} ${size} L 0 ${size*0.75} L 0 ${size/4} Z" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`;
        break;
      case 'noise':
        const noiseId = `noise-${id}`;
        return `<filter id="${noiseId}"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#${noiseId})" opacity="${opacity * 0.2}"/>`;
    }

    return `
      <pattern id="${id}" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotation})">
        ${patternHtml}
      </pattern>
      <rect width="100%" height="100%" fill="url(#${id})" />
    `;
  };

  const svgCode = useMemo(() => {
    const content = generateSvgContent(config);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="${config.bgColor}" />
  ${content}
</svg>`;
  }, [config]);

  const cssCode = useMemo(() => {
    const encoded = btoa(svgCode);
    return `background-color: ${config.bgColor};
background-image: url("data:image/svg+xml;base64,${encoded}");`;
  }, [svgCode, config.bgColor]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const randomize = () => {
    const types: PatternType[] = ['dots', 'lines', 'grid', 'waves', 'zigzag', 'hexagons', 'cross', 'triangles'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const randomBg = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    setConfig({
      ...config,
      type: randomType,
      scale: Math.floor(Math.random() * 20) + 1,
      spacing: Math.floor(Math.random() * 80) + 20,
      strokeWidth: Math.floor(Math.random() * 5) + 1,
      opacity: Math.random() * 0.8 + 0.1,
      rotation: Math.floor(Math.random() * 360),
      color: randomColor,
      bgColor: randomBg
    });
  };

  const downloadSvg = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bje-pattern-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-32">
      <ToolActivator name="Advanced SVG Pattern Generator" path="svg-pattern-generator" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-6 text-indigo-600 dark:text-indigo-400"
          >
            <Grid className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight"
          >
            Advanced SVG <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Pattern Generator</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-400 font-medium"
          >
            Create stunning, high-performance SVG backgrounds for your websites and designs. 
            Customize every detail and export as CSS, SVG, or React code.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pattern Type Selection */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                Pattern Type
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {(['dots', 'lines', 'grid', 'waves', 'zigzag', 'hexagons', 'cross', 'triangles', 'noise'] as PatternType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setConfig({ ...config, type: t })}
                    className={`p-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                      config.type === t
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-indigo-500/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Sliders */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                  Adjustments
                </div>
                <button 
                  onClick={randomize}
                  className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                  title="Randomize"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </h2>
              
              <div className="space-y-6">
                <ControlSlider 
                  label="Scale / Size" 
                  value={config.scale} 
                  min={1} max={50} 
                  onChange={(v) => setConfig({...config, scale: v})} 
                />
                <ControlSlider 
                  label="Spacing" 
                  value={config.spacing} 
                  min={10} max={200} 
                  onChange={(v) => setConfig({...config, spacing: v})} 
                />
                <ControlSlider 
                  label="Stroke Width" 
                  value={config.strokeWidth} 
                  min={0.1} max={10} step={0.1}
                  onChange={(v) => setConfig({...config, strokeWidth: v})} 
                />
                <ControlSlider 
                  label="Opacity" 
                  value={config.opacity} 
                  min={0} max={1} step={0.01}
                  onChange={(v) => setConfig({...config, opacity: v})} 
                />
                <ControlSlider 
                  label="Rotation" 
                  value={config.rotation} 
                  min={0} max={360} 
                  onChange={(v) => setConfig({...config, rotation: v})} 
                />
              </div>
            </div>

            {/* Color Palette */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500" />
                Colors
              </h2>
              <div className="space-y-4">
                <ColorInput 
                  label="Primary Color" 
                  value={config.color} 
                  onChange={(v) => setConfig({...config, color: v})} 
                />
                <ColorInput 
                  label="Secondary Color" 
                  value={config.secondaryColor} 
                  onChange={(v) => setConfig({...config, secondaryColor: v})} 
                />
                <ColorInput 
                  label="Background Color" 
                  value={config.bgColor} 
                  onChange={(v) => setConfig({...config, bgColor: v})} 
                />
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Export */}
          <div className="lg:col-span-8 space-y-6">
            {/* Preview Area */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col min-h-[600px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline-block mr-2" />
                    Live Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'code' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Code className="w-4 h-4 inline-block mr-2" />
                    Get Code
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={downloadSvg}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"
                    title="Download SVG"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'preview' ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 transition-colors duration-500"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      <div className="w-full h-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" className="w-full h-full">
                          <g dangerouslySetInnerHTML={{ __html: generateSvgContent(config, 'preview-pattern') }} />
                        </svg>
                      </div>
                      {/* Floating Presets */}
                      <div className="absolute bottom-6 left-6 right-6 flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {Object.keys(PRESETS).map(name => (
                          <button
                            key={name}
                            onClick={() => setConfig(PRESETS[name])}
                            className="px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full text-xs font-black text-slate-900 dark:text-white whitespace-nowrap hover:scale-105 transition-transform shadow-xl"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="code"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-0 p-8 overflow-y-auto bg-slate-950 text-slate-300 font-mono text-sm"
                    >
                      <div className="space-y-8">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-indigo-400 font-bold flex items-center gap-2">
                              <Hash className="w-4 h-4" />
                              CSS Background
                            </h3>
                            <button 
                              onClick={() => handleCopy(cssCode, 'css')}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition-colors"
                            >
                              {copied === 'css' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copied === 'css' ? 'Copied!' : 'Copy CSS'}
                            </button>
                          </div>
                          <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap break-all">
                            {cssCode}
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                              <FileJson className="w-4 h-4" />
                              SVG Source
                            </h3>
                            <button 
                              onClick={() => handleCopy(svgCode, 'svg')}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition-colors"
                            >
                              {copied === 'svg' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
                            </button>
                          </div>
                          <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
                            {svgCode}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Features Info */}
            <div className="grid sm:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Zap className="text-amber-500" />}
                title="Ultra Fast"
                desc="Pure SVG rendering. No heavy images or external assets."
              />
              <FeatureCard 
                icon={<Sparkles className="text-purple-500" />}
                title="Infinite Scale"
                desc="SVG patterns stay sharp at any resolution or screen size."
              />
              <FeatureCard 
                icon={<Code className="text-indigo-500" />}
                title="Dev Ready"
                desc="Copy-paste ready CSS and SVG code for your projects."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({ label, value, min, max, step = 1, onChange }: { 
  label: string, value: number, min: number, max: number, step?: number, onChange: (v: number) => void 
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{value}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
        />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-20 bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg">
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
