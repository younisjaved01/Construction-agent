import {Config} from '@remotion/cli/config';

// Cinematic export defaults. CLI flags in package.json scripts can override.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(null); // auto
