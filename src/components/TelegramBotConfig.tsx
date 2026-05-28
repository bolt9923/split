import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, Copy, Code, Terminal, BookOpen, ArrowRight, Zap, Info } from 'lucide-react';
import { OverlayConfig, SplitConfig } from '../types';

interface TelegramBotConfigProps {
  overlay: OverlayConfig;
  split: SplitConfig;
}

export default function TelegramBotConfig({ overlay, split }: TelegramBotConfigProps) {
  const [token, setToken] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    botUser?: string;
    botName?: string;
    error?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'python' | 'node'>('python');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Script storage
  const [generatedPython, setGeneratedPython] = useState<string>('');
  const [generatedNode, setGeneratedNode] = useState<string>('');
  const [isGeneratingScripts, setIsGeneratingScripts] = useState<boolean>(false);

  const handleVerifyToken = async () => {
    if (!token) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/telegram-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.ok) {
        setVerificationResult({
          success: true,
          botUser: data.botUser,
          botName: data.botName
        });
      } else {
        setVerificationResult({
          success: false,
          error: data.error
        });
      }
    } catch (e: any) {
      setVerificationResult({
        success: false,
        error: `Network failure connecting to API: ${e.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const generateLiveScripts = async () => {
    setIsGeneratingScripts(true);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlay, split, token })
      });
      const data = await res.json();
      setGeneratedPython(data.pythonScript);
      setGeneratedNode(data.nodeScript);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingScripts(false);
    }
  };

  const handleCopyCode = () => {
    const code = activeTab === 'python' ? generatedPython : generatedNode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Run automatically when overlay/split changes or token input
  React.useEffect(() => {
    generateLiveScripts();
  }, [overlay, split, token]);

  return (
    <div id="telegram-bot-config-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            Telegram Video Splicing Bot
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Build, test, and deploy a direct Telegram Bot that accepts long video files and automatically replies with high quality split parts decorated with your dynamic watermark design!
          </p>
        </div>
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Fully Deployable Bot Script
        </span>
      </div>

      {/* STEP 1: Live Verification of Telegram credentials */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono">1</span>
          Configure Bot API Token Credentials
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="text-xs text-slate-400">
            Paste your token from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-purple-400 font-semibold underline hover:text-purple-300">@BotFather</a>:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="button"
              onClick={handleVerifyToken}
              disabled={isVerifying || !token}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-medium text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
            >
              {isVerifying ? 'Verifying...' : 'Test live validation'}
            </button>
          </div>
        </div>

        {/* Verification Alert Message output */}
        {verificationResult && (
          <div className={`p-4 rounded-xl border text-xs flex gap-3 ${
            verificationResult.success 
              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/20 text-rose-300'
          }`}>
            {verificationResult.success ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Bot connection verified successfully!</p>
                  <p className="text-[11px] text-slate-300">
                    Username: <span className="font-mono text-purple-400">@{verificationResult.botUser}</span> | Name: {verificationResult.botName}
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-450 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Invalid or inactive Telegram Bot Token</p>
                  <p className="text-[11px] text-slate-300">Error response: {verificationResult.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Render script tabs & code blocks */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono">2</span>
            Fidelity Splitting Bot Controller Source
          </div>

          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-850">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                activeTab === 'python' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🐍 Python Script
            </button>
            <button
              onClick={() => setActiveTab('node')}
              className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                activeTab === 'node' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Node.js Script
            </button>
          </div>
        </div>

        {/* Info box displaying that overlay changes dynamically feed this script */}
        <div className="bg-purple-950/20 border border-purple-900/30 p-3 rounded-lg text-[11px] text-purple-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-purple-400" />
          <span>
            This script automatically matches the current active <strong>{split.platform}</strong> platform preset ({split.splitType === 'duration' ? `${split.durationSeconds}s` : `${split.targetPartsCount} equal parts`}) with burned-in <strong>"{overlay.textTemplate}"</strong> overlays in <strong>FFmpeg libx264 profile</strong>.
          </span>
        </div>

        {/* Script Display Code Block */}
        <div className="relative">
          <pre className="p-4 bg-slate-900 rounded-xl overflow-x-auto max-h-[380px] text-xs font-mono text-slate-300 border border-slate-800 leading-relaxed scrollbar-thin">
            <code>
              {activeTab === 'python' ? generatedPython : generatedNode}
            </code>
          </pre>

          <button
            onClick={handleCopyCode}
            disabled={!generatedPython && !generatedNode}
            className="absolute top-3 right-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 p-2 rounded-lg text-xs flex items-center gap-1.5 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Script'}
          </button>
        </div>
      </div>

      {/* STEP 3: Simple & clear Host / Deployment steps */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono">3</span>
          Easy 3-Step Deploy & Setup Guide
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-purple-950 border border-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">A</span>
              Install Dependencies
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ensure you have <strong className="text-purple-400">FFmpeg</strong> installed on your system.
            </p>
            <div className="bg-slate-950 p-1.5 rounded text-[10px] font-mono text-slate-300 mt-1">
              {activeTab === 'python' ? 'pip install python-telegram-bot' : 'npm install telegraf fluent-ffmpeg fs-extra'}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-purple-950 border border-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">B</span>
              Insert & Run Bot
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Create a file called <span className="font-mono text-purple-400">bot.py</span> or <span className="font-mono text-purple-400">bot.js</span>, paste the code above, and launch:
            </p>
            <div className="bg-slate-950 p-1.5 rounded text-[10px] font-mono text-slate-300 mt-1">
              {activeTab === 'python' ? 'python bot.py' : 'node bot.js'}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-purple-950 border border-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">C</span>
              Upload & Distribute!
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open your newly configured bot on Telegram, upload any video. It immediately slices and responds with active watermark templates!
            </p>
          </div>

        </div>

        {/* FFmpeg tips note banner */}
        <div className="bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-xl text-[11px] text-amber-300 flex items-start gap-2.5">
          <BookOpen className="w-4.5 h-4.5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Important FFmpeg Requirements For Overlay Rendering</p>
            <p className="text-slate-400 leading-relaxed">
              This automated flow is highly custom: we configure <span className="text-purple-400 font-semibold font-mono">yuv420p</span> colorspaces and the standard <span className="text-purple-400 font-semibold">libx264</span> encoder profiles, forcing optimal compatibility with native Instagram Reels swipe-up algorithms and YouTube Shorts native render structures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
