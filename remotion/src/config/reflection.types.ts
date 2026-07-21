// Config for the Islamic Reflection pipeline. The `generate` script fills the
// word timings + frame numbers from the TTS output; everything downstream
// (captions, section reveals, total duration) is derived from this file.

export interface CaptionWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface Section {
  text: string;
  words: CaptionWord[];
  startFrame: number;
  endFrame: number;
}

export interface ReflectionGrade {
  warmth: number;
  saturation: number;
  contrast: number;
  brightness: number;
  scrim: number;
  vignette: number;
  bloom: number;
  fog: number;
  lightRays: number;
}

export interface ReflectionConfig {
  composition: {
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  background: {
    source: string;
    kenBurnsZoom: number;
    grade: ReflectionGrade;
  };
  particles: {
    count: number;
    opacity: number;
  };
  intro: {
    durationInFrames: number;
    title: string;
  };
  verse: {
    arabic: string;
    reference: string; // e.g. "Ash-Sharh 94:5-6"
  };
  narration: {
    file: string | null; // public/ path, or null (silent placeholder)
    startFrame: number;
    provider: string;
  };
  // Spoken sections, in order. Captions/translation/reflection read these.
  translation: Section;
  reflection: Section;
  closing: Section;
  outro: {
    startFrame: number;
    durationInFrames: number;
    lines: string[];
  };
}
