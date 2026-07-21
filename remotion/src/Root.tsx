import React from 'react';
import {Composition} from 'remotion';
import {QuranShort} from './QuranShort';
import quranConfig from './config/quran.config.json';
import {IslamicReflection} from './reflection/IslamicReflection';
import reflectionConfig from './config/reflection.config.json';
import './lib/fonts';

/**
 * Composition registry. Dimensions/timing are read from JSON configs, so a new
 * Short is a new config + assets — no code changes.
 *
 *  - IslamicReflection : original narrated reflection pipeline (monetizable)
 *  - QuranShort        : recitation-based cinematic Short
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IslamicReflection"
        component={IslamicReflection}
        durationInFrames={reflectionConfig.composition.durationInFrames}
        fps={reflectionConfig.composition.fps}
        width={reflectionConfig.composition.width}
        height={reflectionConfig.composition.height}
      />
      <Composition
        id="QuranShort"
        component={QuranShort}
        durationInFrames={quranConfig.composition.durationInFrames}
        fps={quranConfig.composition.fps}
        width={quranConfig.composition.width}
        height={quranConfig.composition.height}
      />
    </>
  );
};
