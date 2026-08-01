import {describe, it, expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildCaptions} from '../src/editor/captions.js';
import {buildTimeline} from '../src/editor/timeline.js';

describe('captions (.ass)', () => {
  it('emits one dialogue per scene with correct timing', () => {
    const ass = buildCaptions([
      {index: 1, script: 'hello world', keyframePath: '', start: 0, duration: 3},
      {index: 2, script: 'second line', keyframePath: '', start: 3, duration: 4},
    ]);
    expect(ass).toContain('hello world');
    expect(ass).toContain('0:00:00.00,0:00:03.00');
    expect(ass).toContain('0:00:03.00,0:00:07.00');
  });
});

describe('timeline', () => {
  it('lays scenes back-to-back with the default duration when no voice', async () => {
    const kf = join(tmpdir(), `kf-${randomUUID()}.png`);
    writeFileSync(kf, 'x'); // just needs to exist
    const tl = await buildTimeline(
      {
        scenes: [
          {index: 1, script: 'a', keyframe: {uri: `local://${kf}`}},
          {index: 2, script: 'b', keyframe: {uri: `local://${kf}`}},
        ],
      },
      {defaultDuration: 4},
    );
    expect(tl.total).toBe(8);
    expect(tl.scenes[0]!.start).toBe(0);
    expect(tl.scenes[1]!.start).toBe(4);
  });
});
