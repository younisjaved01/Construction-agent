import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {QuranConfig} from '../config/types';
import {dbToLinear} from '../lib/animations';

/**
 * Audio mix. The recitation is played completely untouched at full volume,
 * offset to its start frame. The ambience bed (river / birds / wind) loops
 * quietly underneath at the configured dB so it never competes with the voice.
 */
export const AudioLayer: React.FC<{audio: QuranConfig['audio']}> = ({audio}) => {
  return (
    <>
      <Sequence from={audio.recitationStartFrame} name="Recitation">
        <Audio src={staticFile(audio.recitation)} />
      </Sequence>

      {audio.ambience ? (
        <Audio
          src={staticFile(audio.ambience)}
          volume={dbToLinear(audio.ambienceDb)}
          loop
        />
      ) : null}
    </>
  );
};
