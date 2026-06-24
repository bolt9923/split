import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Scissors, Sparkles, Video, Volume2, Maximize, AlertCircle } from 'lucide-react';
import { OverlayConfig, SplitConfig, SampleVideo } from '../types';

interface InteractiveTimelineProps {
  overlay: OverlayConfig;
  split: SplitConfig;
  onAIHooksSuggested: (hooks: Array<{ title: string; cliffhanger: string; viralFactor: string }>) => void;
}

const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'travel',
    title: '🏝️ Bali Adventure Vlog (9:16 Vertical Crop)',
    duration: 15, 
    aspectRatio: '9:16',
    category: 'Travel Vlog',
    videoUrl: 'https://cdn.pixabay.com/video/2021/09/10/88168-601449495_large.mp4', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'cyberpunk',
    title: '🌃 Futuristic Tech Hack (16:9 Landscape)',
    duration: 22,
    aspectRatio: '16:9',
    category: 'Tech / Gadgets',
    videoUrl: 'https://cdn.pixabay.com/video/2022/10/25/136368-763442371_large.mp4', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'podcast',
    title: '🎙️ Mindset Mastery Podcast (9:16 Vertical Crop)',
    duration: 25,
    aspectRatio: '9:16',
    category: 'Podcast / Interview',
    videoUrl: 'https://cdn.pixabay.com/video/2020/12/05/58368-490333280_large.mp4', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=120&q=80'
  }
];

export default function InteractiveTimeline({ overlay, split, onAIHooksSuggested }: InteractiveTimelineProps) {
  const [selectedVideo, setSelectedVideo] = useState<SampleVideo>(SAMPLE_VIDEOS[0]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSegment, setActiveSegment] = useState<number>(1);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState<boolean>(false);
  
  // Real video controller reference
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Custom uploaded video support
  const [uploadedVideo, setUploadedVideo] = useState<{ name: string; url: string; duration: number } | null>(null);

  // Determine current active video URL
  const activeVideoUrl = uploadedVideo ? uploadedVideo.url : selectedVideo.videoUrl;

  // Sync real video metadata
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegment(1);
    }
  }, [selectedVideo, uploadedVideo]);

  // Derive splitting details dynamically
  const maxDuration = uploadedVideo ? uploadedVideo.duration : selectedVideo.duration;
  const clipDuration = split.splitType === 'duration' ? split.durationSeconds : Math.ceil(maxDuration / split.targetPartsCount);
  const totalParts = Math.max(1, Math.ceil(maxDuration / clipDuration));

  // Native player time/status updates handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const liveTime = videoRef.current.currentTime;
      setCurrentTime(Math.floor(liveTime));
      
      const segmentOfNext = Math.ceil(liveTime / clipDuration) || 1;
      setActiveSegment(Math.min(segmentOfNext, totalParts));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.round(videoRef.current.duration) || 15;
      setVideoDuration(dur);
      if (uploadedVideo && uploadedVideo.duration !== dur) {
        setUploadedVideo(prev => prev ? { ...prev, duration: dur } : null);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log('Playback interrupted:', err));
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const maxDur = uploadedVideo ? uploadedVideo.duration : selectedVideo.duration;
    const targetSeconds = percentage * maxDur;
    
    setCurrentTime(Math.floor(targetSeconds));
    if (videoRef.current) {
      videoRef.current.currentTime = targetSeconds;
    }
    const segment = Math.ceil(targetSeconds / clipDuration) || 1;
    setActiveSegment(Math.min(segment, totalParts));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setUploadedVideo({
          name: file.name,
          url: url,
          duration: Math.round(tempVideo.duration) || 30
        });
        setCurrentTime(0);
        setActiveSegment(1);
      };
    }
  };

  const generateAIHooks = async () => {
    setIsGeneratingHooks(true);
    try {
      const res = await fetch('/api/gemini/suggest-viral-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedVideo.category,
          platform: split.platform === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels'
        })
      });
      const data = await res.json();
      onAIHooksSuggested(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Overlay styles translator for CSS class representation
  const getOverlayPositionClasses = () => {
    switch (overlay.position) {
      case 'top-center': return 'top-8 left-1/2 -translate-x-1/2';
      case 'bottom-center': return 'bottom-20 left-1/2 -translate-x-1/2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'top-left': return 'top-8 left-6';
      case 'top-right': return 'top-8 right-6';
      case 'bottom-left': return 'bottom-20 left-6';
      case 'bottom-right': return 'bottom-20 right-6';
      default: return 'top-8 left-1/2 -translate-x-1/2';
    }
  };

  const getOverlayBadgeStyles = () => {
    const font = 'font-sans';
    const textShadow = overlay.stylePreset === 'neon-glow' ? '0 0 10px rgba(168,85,247,0.8)' : 'none';
    
    let base = `px-4 py-2 rounded-lg font-bold tracking-wide transition-all uppercase text-center ${font}`;
    
    // Preset definitions
    switch (overlay.stylePreset) {
      case 'classic-badge':
        return {
          className: `${base} bg-slate-950/80 border border-slate-700 text-white shadow-xl backdrop-blur-sm`,
          style: { color: overlay.fontColor, backgroundColor: overlay.bgColor }
        };
      case 'neon-glow':
        return {
          className: `${base} bg-purple-950/50 border border-purple-500/80 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.4)]`,
          style: { color: overlay.fontColor, textShadow }
        };
      case 'minimal-text':
        return {
          className: `${base} bg-transparent text-slate-100 font-extrabold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`,
          style: { color: overlay.fontColor }
        };
      case 'bottom-banner':
        return {
          className: `${base} bg-black/90 w-full py-3.5 left-0 right-0 rounded-none border-y border-slate-800 text-center uppercase tracking-widest`,
          style: { color: overlay.fontColor, backgroundColor: 'rgba(0,0,0,0.85)' }
        };
      case 'cyberpunk':
        return {
          className: `${base} bg-yellow-400 text-black border-l-4 border-yellow-600 rounded-none skew-x-3 shadow-lg`,
          style: { color: '#000000', backgroundColor: '#FACC15' }
        };
      case 'tiktok-viral':
        return {
          className: `bg-transparent text-white font-extrabold italic tracking-tight text-center`,
          style: {
            fontSize: '2rem',
            fontFamily: 'Impact, Arial Black, sans-serif',
            color: '#FFFFFF',
            WebkitTextStroke: '2px #000000',
            textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 3px 3px 8px rgba(0,0,0,0.9)',
            letterSpacing: '-0.5px',
          }
        };
      default:
        return {
          className: `${base}`,
          style: {}
        };
    }
  };

  const customStyle = getOverlayBadgeStyles();
  const progressPercent = ((currentTime % clipDuration) / clipDuration) * 100;

  return (
    <div id="interactive-timeline-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            Interactive Segment Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Realtime high-quality video encoding preview. Play and scrub your video to check safe zone overlapping.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 transition cursor-pointer text-slate-200 px-4 py-2 rounded-xl text-sm font-medium border border-slate-700 text-center">
            📥 Upload Custom Video
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>
          {uploadedVideo && (
            <button 
              onClick={() => setUploadedVideo(null)}
              className="text-xs text-rose-400 underline hover:text-rose-300"
            >
              Clear Custom
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout: Video Live Preview vs. Segment List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Vertical Aspect Ratio Video Container (Simulated Player) */}
        <div className="lg:col-span-7 flex flex-col items-center bg-slate-950 rounded-xl p-4 border border-slate-800 relative justify-center min-h-[460px]">
          
          <div className="text-xs absolute top-3 left-4 text-slate-400 font-mono flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800 z-30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            HIGH QUALITY PREVIEW ({selectedVideo.aspectRatio})
          </div>

          {/* Active Platform UI Safe-Zone Indicators */}
          {overlay.safeZoneIndicators && (
            <div className="absolute top-2 right-4 text-xs font-mono text-purple-400 bg-slate-900/90 border border-purple-500/20 rounded px-2.5 py-1 z-30 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Target Platform Safe-Zones Active
            </div>
          )}

          {/* Frame Screen with correct Aspect Ratio limits */}
          <div 
            className={`relative transition-all duration-300 shadow-[0_0_35px_rgba(0,0,0,0.8)] overflow-hidden border-2 border-slate-700 rounded-lg flex items-center justify-center bg-slate-900 ${
              selectedVideo.aspectRatio === '9:16' ? 'w-[230px] h-[400px]' : 'w-[400px] h-[225px]'
            }`}
          >
            {/* Blurry Background simulation for Landscape Video under 9:16 Crop */}
            {overlay.addBlurBackground && selectedVideo.aspectRatio === '16:9' && (
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center filter blur-xl opacity-80 scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${selectedVideo.thumbnailUrl})` }}
              />
            )}

            {/* REAL VIDEO ELEMENT */}
            <video
              ref={videoRef}
              src={activeVideoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="absolute inset-0 w-full h-full object-cover z-0"
              playsInline
              loop
              muted
            />

            {/* Dark Gradient Overlay for optimal readability */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

            {/* Dynamic Watermark Text overlay (Representing what ffmpeg burns) */}
            <div className={`absolute z-20 transition-all ${getOverlayPositionClasses()} w-11/12 flex justify-center`}>
              <div 
                className={customStyle.className}
                style={customStyle.style}
              >
                {overlay.textTemplate
                  .replace('{n}', activeSegment.toString())
                  .replace('{part}', activeSegment.toString())
                  .replace('{total}', totalParts.toString())
                }
              </div>
            </div>

            {/* Simulated Live Seamless Video Progress bar on bottom */}
            {overlay.includeProgressBar && (
              <div className="absolute bottom-4 left-6 right-6 h-1 bg-white/20 rounded z-20 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 ease-linear"
                  style={{ 
                    width: `${progressPercent}%`, 
                    backgroundColor: overlay.progressBarColor 
                  }}
                />
              </div>
            )}

            {/* Simulated Instagram Interface Safe Zone Markers */}
            {overlay.safeZoneIndicators && split.platform === 'instagram' && (
              <div className="absolute inset-0 pointer-events-none border border-rose-500/30 z-20">
                {/* Simulated Right sidebar icons */}
                <div className="absolute right-2 bottom-24 flex flex-col gap-4 text-white/50 items-center scale-75">
                  <span className="text-xl">❤️</span>
                  <span className="text-xl">💬</span>
                  <span className="text-xl">✈️</span>
                </div>
                {/* Simulated bottom overlay profile header */}
                <div className="absolute left-3 bottom-8 text-left text-white/60 text-[10px] space-y-0.5">
                  <p className="font-bold">@creator_username</p>
                  <p className="max-w-[140px] truncate">Viral content description tag...</p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-7 bg-red-500/10 border-t border-red-500/20 flex items-center justify-center text-[9px] text-red-400 tracking-wider">
                  INSTAGRAM COMMENT BLOCK ZONE
                </div>
              </div>
            )}

            {/* Simulated Youtube Shorts Interface Safe Zone Markers */}
            {overlay.safeZoneIndicators && split.platform === 'youtube' && (
              <div className="absolute inset-0 pointer-events-none border border-cyan-500/30 z-20">
                {/* Simulated Right sidebar icons */}
                <div className="absolute right-1 bottom-16 flex flex-col gap-4 text-white/50 items-center scale-75">
                  <span className="text-xl">👍</span>
                  <span className="text-xl">👎</span>
                  <span className="text-xl">💬</span>
                  <span className="text-xl">↪️</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-10 bg-cyan-500/10 border-t border-cyan-500/20 flex items-center justify-center text-[9px] text-cyan-400 tracking-wider">
                  SHORTS CHANNEL LOGO & CAPTION BLOCKED
                </div>
              </div>
            )}

            {/* Interactive play state centered feedback icon */}
            <button 
              onClick={togglePlay}
              className="absolute z-20 w-12 h-12 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center hover:bg-purple-600 transition text-white shadow-lg backdrop-blur-sm group"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-slate-100" />
              ) : (
                <Play className="w-5 h-5 translate-x-0.5 text-slate-100 group-hover:scale-110 transition" />
              )}
            </button>

            {/* Interactive scrub notification / aspect spec */}
            <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-1 rounded">
              {uploadedVideo ? 'Custom Upload Active' : selectedVideo.title}
            </div>
          </div>

          {/* Time scrubber controller */}
          <div className="w-full mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span className="text-purple-400 font-semibold bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded">
                Active Clip Frame: segment {activeSegment} of {totalParts}
              </span>
              <span>{formatTime(currentTime)} / {formatTime(uploadedVideo ? uploadedVideo.duration : selectedVideo.duration)}</span>
            </div>

            {/* Visual Custom Cut Track */}
            <div 
              className="relative h-6 bg-slate-800 hover:bg-slate-700 transition rounded-lg cursor-pointer border border-slate-700 select-none"
              onClick={handleTimelineClick}
            >
              {/* Segment Slices ticks */}
              {Array.from({ length: totalParts }).map((_, i) => {
                const maxVal = uploadedVideo ? uploadedVideo.duration : selectedVideo.duration;
                const pctLeft = ((i * clipDuration) / maxVal) * 100;
                return (
                  <div 
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-dashed border-purple-500/45 text-[9px] px-1 pt-0.5 text-slate-400 font-mono"
                    style={{ left: `${pctLeft}%` }}
                  >
                    Part {i+1}
                  </div>
                );
              })}

              {/* Played active Track background bar */}
              <div 
                className="absolute top-0 bottom-0 bg-purple-600/20 border-r border-purple-500 z-10 transition-all duration-300"
                style={{ 
                  width: `${(currentTime / (uploadedVideo ? uploadedVideo.duration : selectedVideo.duration)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Video Selector, Segment Listing & AI Sparkles Hooks */}
        <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
          
          {/* Preset Video Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              Select Demo Media Loop
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_VIDEOS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVideo(v);
                    setUploadedVideo(null);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                    selectedVideo.id === v.id && !uploadedVideo
                      ? 'bg-slate-800 border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-slate-100'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <img src={v.thumbnailUrl} alt="" className="w-12 h-12 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate text-slate-200">{v.title}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-purple-400 border border-purple-950">
                        {v.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatTime(v.duration)} sec
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Segment Listing Information */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              Clip Encoding Structure ({totalParts} total parts)
            </h4>
            
            <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {Array.from({ length: totalParts }).map((_, idx) => {
                const partNum = idx + 1;
                const isPartActive = activeSegment === partNum;
                const partStart = idx * clipDuration;
                const rawDur = uploadedVideo ? uploadedVideo.duration : selectedVideo.duration;
                const partEnd = Math.min((idx + 1) * clipDuration, rawDur);
                const durVal = partEnd - partStart;

                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      setCurrentTime(partStart);
                      if (videoRef.current) {
                        videoRef.current.currentTime = partStart;
                      }
                      setActiveSegment(partNum);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-mono transition ${
                      isPartActive 
                        ? 'bg-purple-950/60 border border-purple-500/50 text-slate-100' 
                        : 'bg-slate-900/60 border border-transparent hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isPartActive ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span>Part {partNum} / {totalParts}</span>
                    </div>
                    <span>{formatTime(partStart)} - {formatTime(partEnd)} ({durVal}s)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium Gemini AI Hook Generator Trigger */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-purple-900/35 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-900/30 border border-purple-500/20 text-purple-300">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 leading-none">
                  AI Viral Caption & Cliffhangers
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Analyze script hooks optimized for {selectedVideo.category} content to retain retention metrics.
                </p>
              </div>
            </div>

            <button
              onClick={generateAIHooks}
              disabled={isGeneratingHooks}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
            >
              {isGeneratingHooks ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating high retention hooks...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  Suggest Viral Hooks with Gemini 3.5
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
