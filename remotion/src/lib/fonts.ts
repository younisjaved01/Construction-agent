// Local font files bundled via @fontsource (no network fetch at render time).
// Arabic uses Amiri (Qur'anic-grade shaping). Drop in "Uthmanic Hafs" as a
// local @font-face and swap FONT_ARABIC if you have the licence for it.
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/playfair-display/500.css';

export const FONT_ARABIC = "'Amiri Quran', 'Amiri', serif";
export const FONT_ENGLISH = "'Cormorant Garamond', 'Playfair Display', serif";
export const FONT_DISPLAY = "'Playfair Display', 'Cormorant Garamond', serif";

// Gold palette from the brief.
export const GOLD_1 = '#F7D774';
export const GOLD_2 = '#C99A2E';
export const GOLD_GRADIENT = `linear-gradient(180deg, ${GOLD_1} 0%, #E9C25A 48%, ${GOLD_2} 100%)`;
export const IVORY = '#F6F4EE';
