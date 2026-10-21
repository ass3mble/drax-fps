export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export type GraphicsPreset = {
  pixelRatioCap: number;
  rainCount: number;
  shadowMapSize: number;
  bloomStrength: number;
  bloomRadius: number;
  ambientOcclusion: boolean;
  aoIntensity: number;
  aoRadius: number;
  aoSamples: number;
  gradeStrength: number;
  vignetteStrength: number;
  grainStrength: number;
  smaa: boolean;
  sharpenStrength: number;
};

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
  low: {
    pixelRatioCap: 0.85,
    rainCount: 280,
    shadowMapSize: 1024,
    bloomStrength: 0.012,
    bloomRadius: 0.05,
    ambientOcclusion: false,
    aoIntensity: 0,
    aoRadius: 0.25,
    aoSamples: 4,
    gradeStrength: 0.42,
    vignetteStrength: 0.075,
    grainStrength: 0.0025,
    smaa: false,
    sharpenStrength: 0,
  },
  medium: {
    pixelRatioCap: 1,
    rainCount: 520,
    shadowMapSize: 1024,
    bloomStrength: 0.022,
    bloomRadius: 0.08,
    ambientOcclusion: false,
    aoIntensity: 0,
    aoRadius: 0.28,
    aoSamples: 4,
    gradeStrength: 0.58,
    vignetteStrength: 0.095,
    grainStrength: 0.0035,
    smaa: true,
    sharpenStrength: 0.08,
  },
  high: {
    pixelRatioCap: 1.25,
    rainCount: 760,
    shadowMapSize: 2048,
    bloomStrength: 0.038,
    bloomRadius: 0.12,
    ambientOcclusion: true,
    aoIntensity: 0.7,
    aoRadius: 0.32,
    aoSamples: 8,
    gradeStrength: 0.78,
    vignetteStrength: 0.12,
    grainStrength: 0.0045,
    smaa: true,
    sharpenStrength: 0.14,
  },
  ultra: {
    pixelRatioCap: 1.5,
    rainCount: 900,
    shadowMapSize: 4096,
    bloomStrength: 0.055,
    bloomRadius: 0.16,
    ambientOcclusion: true,
    aoIntensity: 0.9,
    aoRadius: 0.38,
    aoSamples: 12,
    gradeStrength: 1,
    vignetteStrength: 0.145,
    grainStrength: 0.0055,
    smaa: true,
    sharpenStrength: 0.18,
  },
};
