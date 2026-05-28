import React from 'react';
import { Type, Layout, Palette, Sliders, Eye } from 'lucide-react';
import { OverlayConfig, OverlayPosition, StylePreset } from '../types';

interface OverlayDesignerProps {
  overlay: OverlayConfig;
  onChange: (updates: Partial<OverlayConfig>) => void;
}

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center', label: 'Absolute Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' }
];

const STYLES: { value: StylePreset; label: string; desc: string }[] = [
  { value: 'classic-badge', label: 'Classic Rounded Badge', desc: 'Symmetric solid dark background with rounded container margins.' },
  { value: 'neon-glow', label: 'Neon Cyber Glow', desc: 'Glowing purple/magenta borders suited for modern podcast transcripts.' },
  { value: 'minimal-text', label: 'Minimal Dynamic Text', desc: 'No background container, uses elegant bold styling directly on frame.' },
  { value: 'bottom-banner', label: 'Cinematic Wide Banner', desc: 'Spans horizontally to capture cinematic look.' },
  { value: 'cyberpunk', label: 'Industrial Cyberpunk', desc: 'High-contrast black text on premium neon yellow solid backgrounds.' }
];

export default function OverlayDesigner({ overlay, onChange }: OverlayDesignerProps) {
  return (
    <div id="overlay-designer-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-400" />
          Watermark & Style Overlay
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Customize part counters, fonts, sizes, and active safe zones for high click-through retention.
        </p>
      </div>

      {/* Text Template Configuration */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Type className="w-3.5 h-3.5" />
          Text Template Preset
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={overlay.textTemplate}
            onChange={(e) => onChange({ textTemplate: e.target.value })}
            placeholder="e.g. PART {n} OF {total}"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          Use <code className="text-purple-400 bg-slate-950 px-1 py-0.5 rounded font-mono font-semibold">{`{n}`}</code> for Part number or <code className="text-purple-400 bg-slate-950 px-1 py-0.5 rounded font-mono font-semibold">{`{total}`}</code> for total count.
        </p>
      </div>

      {/* Common Templates Quick Tags Helper */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {[
          'PART {n}',
          'EPISODE {n}',
          'PART {n} / {total}',
          'WATCH TILL END {n}',
          'MUST WATCH {n}'
        ].map((tpl) => (
          <button
            key={tpl}
            type="button"
            onClick={() => onChange({ textTemplate: tpl })}
            className="text-[10px] font-mono bg-slate-950 hover:bg-slate-850 px-2.5 py-1 rounded-md text-slate-300 border border-slate-850 transition"
          >
            {tpl}
          </button>
        ))}
      </div>

      {/* Theme Presets */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layout className="w-3.5 h-3.5" />
          Design Preset Styling
        </label>

        <div className="grid grid-cols-1 gap-2">
          {STYLES.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => onChange({ stylePreset: st.value })}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                overlay.stylePreset === st.value
                  ? 'bg-purple-950/40 border-purple-500 text-slate-100'
                  : 'bg-slate-955/80 border-slate-800 hover:border-slate-700 text-slate-450'
              }`}
            >
              <span className="text-xs font-bold text-slate-200">{st.label}</span>
              <span className="text-[10px] text-slate-400 mt-1 leading-relaxed">{st.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Position Selection */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layout className="w-3.5 h-3.5" />
          Screen Placement (Burn-in Position)
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => onChange({ position: pos.value })}
              className={`p-2 rounded-lg border text-[10px] font-medium text-center transition truncate ${
                overlay.position === pos.value
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Sliders & Colors (For Preview customization) */}
      <div className="space-y-4 pt-3 border-t border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5" />
          Visual Tuning Parameters
        </label>

        {/* Font Color */}
        <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <span className="text-xs text-slate-300">Font Overlay Color</span>
          <div className="flex items-center gap-2">
            <input 
              type="color" 
              value={overlay.fontColor} 
              onChange={(e) => onChange({ fontColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-slate-800"
            />
            <span className="text-xs font-mono uppercase text-slate-400">{overlay.fontColor}</span>
          </div>
        </div>

        {/* Container Background Color */}
        <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <span className="text-xs text-slate-300">Overlay Background Pill</span>
          <div className="flex items-center gap-2">
            <input 
              type="color" 
              value={overlay.bgColor.startsWith('rgba') ? '#000000' : overlay.bgColor} 
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-slate-800"
              disabled={overlay.stylePreset === 'minimal-text'}
            />
            <span className="text-xs font-mono uppercase text-slate-400">
              {overlay.stylePreset === 'minimal-text' ? 'Disabled' : overlay.bgColor}
            </span>
          </div>
        </div>

        {/* Safe-Zone check indicators */}
        <div className="space-y-2 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Safety Frame Outlines</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Show Reels / Shorts UI overlay boundaries</span>
            </div>
            <input
              type="checkbox"
              checked={overlay.safeZoneIndicators}
              onChange={(e) => onChange({ safeZoneIndicators: e.target.checked })}
              className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-800 rounded focus:ring-purple-500 accent-purple-500"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-850 pt-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Include Active Progress Bar</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Draw micro-progress indicator on bottom margin</span>
            </div>
            <input
              type="checkbox"
              checked={overlay.includeProgressBar}
              onChange={(e) => onChange({ includeProgressBar: e.target.checked })}
              className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-800 rounded focus:ring-purple-500 accent-purple-500"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-850 pt-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Add Blurred Outer Backing</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Pads 16:9 videos on vertical canvases</span>
            </div>
            <input
              type="checkbox"
              checked={overlay.addBlurBackground}
              onChange={(e) => onChange({ addBlurBackground: e.target.checked })}
              className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-800 rounded focus:ring-purple-500 accent-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
