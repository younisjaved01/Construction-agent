import React from 'react';
import {AbsoluteFill} from 'remotion';
import rawConfig from './config/quran.config.json';
import {QuranConfig} from './config/types';
import {Background} from './components/Background';
import {Particles} from './components/Particles';
import {VerseAnimation} from './components/VerseAnimation';
import {ArabicVerse} from './components/ArabicVerse';
import {EnglishSubtitle} from './components/EnglishSubtitle';
import {Opening} from './components/Opening';
import {Ending} from './components/Ending';
import {AudioLayer} from './components/AudioLayer';

const cfg = rawConfig as unknown as QuranConfig;

/**
 * The full cinematic Short. Layer order (back to front):
 * background → particles → verse subtitles → opening/ending cards → audio.
 */
export const QuranShort: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#04050a'}}>
      <Background
        config={cfg.background}
        totalFrames={cfg.composition.durationInFrames}
      />

      <Particles count={cfg.particles.count} opacity={cfg.particles.opacity} />

      {cfg.verses.map((v, i) => (
        <VerseAnimation key={i} startFrame={v.startFrame} endFrame={v.endFrame}>
          <ArabicVerse text={v.arabic} />
          <EnglishSubtitle text={v.translation} />
        </VerseAnimation>
      ))}

      <Opening {...cfg.opening} />

      <Ending
        startFrame={cfg.ending.startFrame}
        durationInFrames={cfg.ending.durationInFrames}
        surah={cfg.surah}
        dua={cfg.ending.dua}
      />

      <AudioLayer audio={cfg.audio} />
    </AbsoluteFill>
  );
};
