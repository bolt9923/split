import React from 'react';
import { Youtube, Instagram, Settings, Layers, Flame, Gauge } from 'lucide-react';
import { PlatformPreset, SplitType, QualityPreset, SplitConfig } from '../types';

interface PlatformPresetsProps {
  config: SplitConfig;
  onChange: (updates: Partial<SplitConfig>) => void;
}

export default function PlatformPresets({ config, onChange }: PlatformPresetsProps) {
  
  // Platform pre-sets setting details
  const applyPlatformPreset = (platform: PlatformPreset) => {
    switch (platform) {
      case 'instagram':
        onChange({
          platform,
          splitType: 'duration',
          durationSeconds: 90, // Reels limit up to 90s standard
          qualityPreset: 'ultra-hd'
        });
        break;
      case 'youtube':
        onChange({
          platform,
          splitType: 'duration',
          durationSeconds: 59, // Shorts limit up to 59s standard
          qualityPreset: 'full-hd'
        });
        break;
      case 'custom':
        onChange({
          platform,
          splitType: 'parts',
          targetPartsCount: 3,
          qualityPreset: 'medium-fast'
        });
        break;
    }
  };

  return (
    <div id="platform-presets-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          Split Configuration
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Pick your targeting platform preset or set manual split durations for seamless social publishing.
        </p>
      </div>

      {/* Target Destination Presets Buttons */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Target Social Network
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => applyPlatformPreset('instagram')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
              config.platform === 'instagram'
                ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <Instagram className="w-6 h-6 mb-1 text-pink-500" />
            <span className="text-sm font-semibold">Instagram</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Reels max 90s</span>
          </button>

          <button
            type="button"
            onClick={() => applyPlatformPreset('youtube')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
              config.platform === 'youtube'
                ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <Youtube className="w-6 h-6 mb-1 text-red-500" />
            <span className="text-sm font-semibold">YouTube</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Shorts max 59s</span>
          </button>

          <button
            type="button"
            onClick={() => applyPlatformPreset('custom')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
              config.platform === 'custom'
                ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <Layers className="w-6 h-6 mb-1 text-cyan-400" />
            <span className="text-sm font-semibold">Custom Setup</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Manual splits</span>
          </button>
        </div>
      </div>

      {/* Split logic choose */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Split Rules Selection
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ splitType: 'duration' })}
            className={`p-2.5 rounded-lg border text-xs font-medium transition ${
              config.splitType === 'duration'
                ? 'bg-slate-800 border-purple-500 text-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-450 hover:bg-slate-900/'
            }`}
          >
            ✂️ Split by Fixed Seconds
          </button>

          <button
            type="button"
            onClick={() => onChange({ splitType: 'parts' })}
            className={`p-2.5 rounded-lg border text-xs font-medium transition ${
              config.splitType === 'parts'
                ? 'bg-slate-800 border-purple-500 text-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-450 hover:bg-slate-900/'
            }`}
          >
            🔢 Split into Equal Parts
          </button>
        </div>

        {config.splitType === 'duration' ? (
          <div className="space-y-1.5 pt-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Duration per Clip:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={config.durationSeconds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 15;
                    onChange({ durationSeconds: Math.max(5, Math.min(600, val)) });
                  }}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-center font-mono text-purple-400 focus:outline-none focus:border-purple-500 font-semibold"
                />
                <span className="text-purple-400 font-mono font-semibold">seconds</span>
              </div>
            </div>
            <input
              type="range"
              min="15"
              max="150"
              step="5"
              value={config.durationSeconds}
              onChange={(e) => onChange({ durationSeconds: parseInt(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-normal">
              Videos will be sliced recursively every {config.durationSeconds} seconds. Perfect for strict social shorts limits. You can type any duration from 5 to 600 seconds.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Target segment count:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={config.targetPartsCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 3;
                    onChange({ targetPartsCount: Math.max(2, Math.min(50, val)) });
                  }}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-center font-mono text-purple-400 focus:outline-none focus:border-purple-500 font-semibold"
                />
                <span className="text-purple-400 font-mono font-semibold">Parts</span>
              </div>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              step="1"
              value={config.targetPartsCount}
              onChange={(e) => onChange({ targetPartsCount: parseInt(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-normal">
              Divides the entire media length into exactly {config.targetPartsCount} balanced parts regardless of initial duration. You can type any number from 2 to 50 parts.
            </p>
          </div>
        )}
      </div>

      {/* Rendering quality profile */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          FFmpeg Encoding Quality Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['ultra-hd', 'full-hd', 'medium-fast'] as QualityPreset[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChange({ qualityPreset: q })}
              className={`p-2 rounded-lg border text-[10px] font-mono tracking-wider transition uppercase ${
                config.qualityPreset === q
                  ? 'bg-purple-950/50 border-purple-500/70 text-purple-200'
                  : 'bg-slate-955/80 border-slate-800 text-slate-450 hover:border-slate-700'
              }`}
            >
              {q === 'ultra-hd' ? '💎 Ultra HD' : q === 'full-hd' ? '🎬 Full HD' : '⚡ Fast Encoding'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {config.qualityPreset === 'ultra-hd' && "Optimal 1080p60 high CRF render profile (Max bitrate details for maximum visual retention)."}
          {config.qualityPreset === 'full-hd' && "Standard high fidelity 1080p encoding. Perfectly balanced color spaces for mobile viewports."}
          {config.qualityPreset === 'medium-fast' && "Blazing fast encoding with dynamic downscaling to ensure instant processing speeds."}
        </p>
      </div>
    </div>
  );
}
