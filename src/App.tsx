import React, { useState } from 'react';
import { Sparkles, Terminal, Sliders, Play, Settings, Shield, ChevronRight, HelpCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { OverlayConfig, SplitConfig } from './types';
import InteractiveTimeline from './components/InteractiveTimeline';
import PlatformPresets from './components/PlatformPresets';
import OverlayDesigner from './components/OverlayDesigner';
import TelegramBotConfig from './components/TelegramBotConfig';
import SocialAutoUploader from './components/SocialAutoUploader';
import DeploymentGuide from './components/DeploymentGuide';

export default function App() {
  // Config state for dynamic live rendering
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    platform: 'instagram',
    splitType: 'duration',
    durationSeconds: 90,
    targetPartsCount: 4,
    qualityPreset: 'ultra-hd'
  });

  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    textTemplate: 'Part-{n}',
    position: 'top-center',
    stylePreset: 'tiktok-viral',
    fontSize: 24,
    fontColor: '#FFFFFF',
    bgColor: 'rgba(0,0,0,0.7)',
    includeProgressBar: true,
    progressBarColor: '#A855F7', // Cyan/Purple neon base
    addBlurBackground: true,
    safeZoneIndicators: true
  });

  // Viral AI suggestions suggested by Gemini
  const [viralHooks, setViralHooks] = useState<Array<{ title: string; cliffhanger: string; viralFactor: string }>>([
    {
      title: 'Wait for the ending... Part {part}',
      cliffhanger: 'Cut right before showing the final result or revealing the answer.',
      viralFactor: 'Curiosity gap. People click to get direct payoff.'
    },
    {
      title: 'Mind-Blowing Secret! (Part {part})',
      cliffhanger: 'Stop as you introduce the third tip. "Tip three is what changed my life..."',
      viralFactor: 'Friction-less retention and anticipation loops.'
    },
    {
      title: 'Stop Scrolling... (Part {part})',
      cliffhanger: 'Splicing exactly where the narrator starts asking a challenging question.',
      viralFactor: 'Disrupts muscle memory scrolling habit loops.'
    }
  ]);

  const handleAIHooksSuggested = (suggested: Array<{ title: string; cliffhanger: string; viralFactor: string }>) => {
    if (suggested && suggested.length > 0) {
      setViralHooks(suggested);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 antialiased">
      
      {/* Visual Workspace Hero Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">TeleSplit Studio</h1>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-850">
                  v2.5 Release
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">High-Quality Social Reels & Shorts Splicing Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-850 font-mono">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              Gemini 3.5 Assistant Active
            </span>
            <a 
              href="#telegram-bot-config-panel"
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-purple-950/40"
            >
              Configure Bot Telegram
            </a>
          </div>
        </div>
      </header>

      {/* Main Body Layout container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 w-full">
        
        {/* Workspace Quick Warning Information Tip Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 self-start md:self-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Automatic Video Splicer & Overlays builder</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Design custom text positions, safety zones, progress bars, and render highly optimized Python/Node bot templates.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="#platform-presets-panel"
              className="text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-850 px-3 py-1.5 rounded-lg transition border border-slate-850"
            >
              Configure splits
            </a>
            <a 
              href="#interactive-timeline-panel"
              className="text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-850 px-3 py-1.5 rounded-lg transition border border-slate-850"
            >
              Interactive timeline
            </a>
          </div>
        </div>

        {/* Live Simulator View (Primary Area) */}
        <div className="grid grid-cols-1 gap-6">
          <InteractiveTimeline 
            overlay={overlayConfig}
            split={splitConfig}
            onAIHooksSuggested={handleAIHooksSuggested}
          />
        </div>

        {/* Automatic Social Splitting Input & Auto Publishing Controls */}
        <SocialAutoUploader
          splitConfig={splitConfig}
          overlayConfig={overlayConfig}
          onSplitConfigChange={(updates) => setSplitConfig(prev => ({ ...prev, ...updates }))}
          videoUrl="https://cdn.pixabay.com/video/2021/09/10/88168-601449495_large.mp4"
          videoDuration={15}
        />

        {/* Studio Designer controls grid: Platform Presets VS. Custom Overlay Designer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlatformPresets 
            config={splitConfig} 
            onChange={(updates) => setSplitConfig(prev => ({ ...prev, ...updates }))} 
          />

          <OverlayDesigner 
            overlay={overlayConfig} 
            onChange={(updates) => setOverlayConfig(prev => ({ ...prev, ...updates }))} 
          />
        </div>

        {/* AI Suggested Titles and Cliffhanger tips section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              AI-Generated Cliffhangers & Viral Hooks (Gemini Suggestion)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Use these structured titles in your watermark text overlay to maximize swipe retention and visual loop engagement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {viralHooks.map((hook, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 hover:border-purple-900/40 transition cursor-pointer group"
                onClick={() => setOverlayConfig(o => ({ ...o, textTemplate: hook.title }))}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono bg-purple-950 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-900/30">
                    Hook Design #{idx + 1}
                  </span>
                  <span className="text-[10px] text-purple-400 font-medium group-hover:underline flex items-center gap-0.5">
                    Apply template <ChevronRight className="w-3 h-3" />
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-200 font-mono tracking-tight break-all">
                    {hook.title}
                  </h4>
                  <div className="text-[11px] text-slate-450 space-y-1">
                    <p className="leading-relaxed"><strong className="text-[10px] text-slate-400 block uppercase font-sans tracking-wider">Perfect Splicing Scene Cue:</strong> {hook.cliffhanger}</p>
                    <p className="text-purple-400/90 leading-relaxed pt-1 border-t border-slate-900/50"><strong className="text-[10px] text-slate-400 block uppercase font-sans tracking-wider">Viral Psychology:</strong> {hook.viralFactor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telegram Config Block Section */}
        <TelegramBotConfig 
          overlay={overlayConfig}
          split={splitConfig}
        />

        {/* Deploy & GitHub/Heroku Guide Panel */}
        <DeploymentGuide />

        {/* Comprehensive Help / F.A.Q Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              Frequently Asked Questions (FAQ)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">How does the Telegram bot process videos?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you or your audience uploads a video to your custom Telegram Bot, the server uses FFmpeg commands to slice the video at exact seconds set in your platform configuration. Simultaneously, it uses dynamic drawtext coordinates to render labels directly inside output video frames without quality loss.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">Why are safe zones important?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Social media applications like Instagram and YouTube contain user interfaces (profile icons, captions, share buttons, comment modules) that overlap visual content. If your text is too close to margins, it gets covered. Safety-Zones highlight these areas so you can reposition watermarks perfectly.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">Can I customize the clip duration?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes! Select the <strong>"Custom Setup"</strong> tab in the Split Configuration panel. You can define exact slicing intervals (from 15 to 150 seconds) or split the video into a fixed number of equal parts.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">What is the optimal FFmpeg quality setting?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                We default to <strong>Ultra HD</strong> or <strong>Full HD</strong> with <code>crf 18/19</code>. This specifies a constant rate factor that retains crisp text overlays and vibrant colorspaces optimal for high-retention mobile viewing.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Styled Footer Block */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-8 mt-12 text-center text-xs text-slate-500">
        <p className="max-w-7xl mx-auto px-6">
          © 2026 TeleSplit Studio. High-Fidelity Splicing Systems designed for optimal retention loops. Powered by Gemini 3.5.
        </p>
      </footer>
    </div>
  );
}
