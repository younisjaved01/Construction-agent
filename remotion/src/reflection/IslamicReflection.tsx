import React from 'react';
import {AbsoluteFill} from 'remotion';
import rawConfig from '../config/reflection.config.json';
import {ReflectionConfig} from '../config/reflection.types';
import './lib/theme';
import {BackgroundAnimation} from './components/BackgroundAnimation';
import {ParticleSystem} from './components/ParticleSystem';
import {VerseDisplay} from './components/VerseDisplay';
import {Translation} from './components/Translation';
import {Reflection} from './components/Reflection';
import {CaptionAnimation} from './components/CaptionAnimation';
import {Narration} from './components/Narration';
import {Bismillah} from './components/Bismillah';
import {Outro} from './components/Outro';

const cfg = rawConfig as unknown as ReflectionConfig;

/**
 * The full Islamic Reflection Short. Layer order (back to front):
 * background → particles → Arabic verse → translation / reflection / closing
 * captions → intro & outro cards → narration audio.
 */
export const IslamicReflection: React.FC = () => {
  const verseStart = cfg.intro.durationInFrames - 12;
  const verseEnd = cfg.outro.startFrame;

  return (
    <AbsoluteFill style={{backgroundColor: '#0b0c0f'}}>
      <BackgroundAnimation
        source={cfg.background.source}
        zoom={cfg.background.kenBurnsZoom}
        grade={cfg.background.grade}
      />
      <ParticleSystem count={cfg.particles.count} opacity={cfg.particles.opacity} />

      <VerseDisplay
        arabic={cfg.verse.arabic}
        reference={cfg.verse.reference}
        startFrame={verseStart}
        endFrame={verseEnd}
      />

      <Translation section={cfg.translation} />
      <Reflection section={cfg.reflection} />

      {/* closing line ("May Allah guide us all.") as a centered gold caption */}
      <CaptionAnimation
        words={cfg.closing.words}
        centerY={980}
        fontSize={56}
        maxWords={5}
      />

      <Bismillah durationInFrames={cfg.intro.durationInFrames} />
      <Outro
        startFrame={cfg.outro.startFrame}
        durationInFrames={cfg.outro.durationInFrames}
        lines={cfg.outro.lines}
      />

      <Narration file={cfg.narration.file} startFrame={cfg.narration.startFrame} />
    </AbsoluteFill>
  );
};
