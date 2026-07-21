// Elegant palette + fonts for the Islamic Reflection pipeline.
// Fonts are bundled locally via @fontsource (no network fetch at render time).
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

export const COLORS = {
  gold: '#D4AF37',
  goldLight: '#F1D98B',
  goldDeep: '#A67C21',
  white: '#FFFFFF',
  ivory: '#F5F2E9',
  charcoal: '#141518',
  glow: 'rgba(212,175,55,0.45)', // soft warm glow
};

export const GOLD_GRADIENT = `linear-gradient(180deg, ${COLORS.goldLight} 0%, ${COLORS.gold} 50%, ${COLORS.goldDeep} 100%)`;

export const FONTS = {
  arabic: "'Amiri Quran', 'Amiri', serif",
  serif: "'Cormorant Garamond', serif", // luxury translation type
  sans: "'Poppins', system-ui, sans-serif", // Captions.ai-style caption type
};

// Shorts safe area: keep key content within the central column, clear of the
// top search bar and bottom action rail.
export const SAFE = {
  top: 240,
  bottom: 470,
  side: 90,
};
