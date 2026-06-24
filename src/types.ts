export type PlatformPreset = 'instagram' | 'youtube' | 'custom';

export type OverlayPosition = 'top-center' | 'bottom-center' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type StylePreset = 'classic-badge' | 'neon-glow' | 'minimal-text' | 'bottom-banner' | 'cyberpunk' | 'tiktok-viral';

export type SplitType = 'duration' | 'parts';

export type QualityPreset = 'ultra-hd' | 'full-hd' | 'medium-fast';

export interface OverlayConfig {
  textTemplate: string; // e.g. "PART {n}" or "Ep. {n}"
  position: OverlayPosition;
  stylePreset: StylePreset;
  fontSize: number; // in pixels for simulated preview
  fontColor: string; // hex
  bgColor: string; // rgba
  includeProgressBar: boolean;
  progressBarColor: string;
  addBlurBackground: boolean; // For landscape videos, pad top/bottom with blur
  safeZoneIndicators: boolean; // Show guidelines for Instagram/YouTube UI overlapping elements
}

export interface SplitConfig {
  platform: PlatformPreset;
  splitType: SplitType;
  durationSeconds: number; // e.g. 59 for Shorts, 90 for Reels
  targetPartsCount: number; // e.g. split into 4 equal parts
  qualityPreset: QualityPreset;
}

export interface BotState {
  token: string;
  isActive: boolean;
  botUsername: string;
  webhookUrl: string;
}

export interface SampleVideo {
  id: string;
  title: string;
  duration: number; // total seconds
  aspectRatio: '16:9' | '9:16' | '1:1';
  thumbnailUrl: string;
  videoUrl: string; // fallback preview image or styling
  category: string;
}
