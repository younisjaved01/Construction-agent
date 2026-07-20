// Shape of quran.config.json — everything about a Short is described here.

export interface VerseItem {
  arabic: string;
  translation: string;
  startFrame: number;
  endFrame: number;
}

export interface BackgroundGrade {
  warmth: number;      // 0..1 warm colour push
  saturation: number;  // css saturate() multiplier
  contrast: number;    // css contrast() multiplier
  brightness: number;  // css brightness() multiplier
  scrim: number;       // 0..1 uniform dark overlay (cinematic exposure drop)
  vignette: number;    // 0..1 edge darkening strength
  bloom: number;       // 0..1 soft highlight bloom
  fog: number;         // 0..1 drifting fog opacity
}

export interface BackgroundConfig {
  type: 'images' | 'video';
  sources: string[];
  kenBurnsZoom: number;    // extra zoom over a photo's screen time (e.g. 0.12 = +12%)
  crossfadeFrames: number; // crossfade length between photos
  grade: BackgroundGrade;
}

export interface QuranConfig {
  composition: {
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  surah: {
    name: string;
    nameArabic: string;
    number: number;
    verseRange: string;
  };
  audio: {
    recitation: string;
    recitationStartFrame: number;
    ambience: string | null;
    ambienceDb: number;
  };
  background: BackgroundConfig;
  particles: {
    count: number;
    opacity: number;
  };
  opening: {
    startFrame: number;
    durationInFrames: number;
    bismillah: string;
    subtitle: string;
  };
  ending: {
    startFrame: number;
    durationInFrames: number;
    dua: string;
  };
  verses: VerseItem[];
}
