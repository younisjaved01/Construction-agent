import React from 'react';
import {Composition} from 'remotion';
import {QuranShort} from './QuranShort';
import config from './config/quran.config.json';
import './lib/fonts';

/**
 * Composition registry. All dimensions/timing are read from quran.config.json,
 * so a new Short is just a new config + assets — no code changes.
 */
export const RemotionRoot: React.FC = () => {
  const {width, height, fps, durationInFrames} = config.composition;
  return (
    <Composition
      id="QuranShort"
      component={QuranShort}
      durationInFrames={durationInFrames}
      fps={fps}
      width={width}
      height={height}
    />
  );
};
