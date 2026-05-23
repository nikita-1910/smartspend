import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  dark: {
    '--bg':       '#0d0f14', '--bg2': '#12151c', '--bg3': '#181c25',
    '--surface':  '#1e2330', '--surface2': '#232838',
    '--border':   'rgba(255,255,255,0.06)', '--border2': 'rgba(255,255,255,0.10)',
    '--text':     '#f0f2f8', '--text2': '#9aa3b8', '--text3': '#5c6478',
    '--accent':   '#6c8fff', '--accent2': '#8b5cf6', '--accent-glow': 'rgba(108,143,255,0.08)',
    '--green':    '#34d399', '--green-bg': 'rgba(52,211,153,0.10)',
    '--red':      '#f87171', '--red-bg':   'rgba(248,113,113,0.10)',
    '--amber':    '#fbbf24', '--amber-bg': 'rgba(251,191,36,0.10)',
    '--blue':     '#60a5fa', '--blue-bg':  'rgba(96,165,250,0.10)',
  },
  light: {
    '--bg':       '#f5f6fa', '--bg2': '#ffffff', '--bg3': '#eef0f6',
    '--surface':  '#ffffff', '--surface2': '#f0f2f8',
    '--border':   'rgba(0,0,0,0.07)', '--border2': 'rgba(0,0,0,0.12)',
    '--text':     '#0f1117', '--text2': '#4a5068', '--text3': '#9aa3b8',
    '--accent':   '#4c6ef5', '--accent2': '#7c3aed', '--accent-glow': 'rgba(76,110,245,0.08)',
    '--green':    '#059669', '--green-bg': 'rgba(5,150,105,0.10)',
    '--red':      '#dc2626', '--red-bg':   'rgba(220,38,38,0.10)',
    '--amber':    '#d97706', '--amber-bg': 'rgba(217,119,6,0.10)',
    '--blue':     '#2563eb', '--blue-bg':  'rgba(37,99,235,0.10)',
  },
  midnight: {
    '--bg':       '#070910', '--bg2': '#0d0f18', '--bg3': '#111420',
    '--surface':  '#161928', '--surface2': '#1c2033',
    '--border':   'rgba(255,255,255,0.05)', '--border2': 'rgba(255,255,255,0.08)',
    '--text':     '#e8eaf6', '--text2': '#8890b0', '--text3': '#4a5070',
    '--accent':   '#818cf8', '--accent2': '#a78bfa', '--accent-glow': 'rgba(129,140,248,0.08)',
    '--green':    '#6ee7b7', '--green-bg': 'rgba(110,231,183,0.10)',
    '--red':      '#fca5a5', '--red-bg':   'rgba(252,165,165,0.10)',
    '--amber':    '#fcd34d', '--amber-bg': 'rgba(252,211,77,0.10)',
    '--blue':     '#93c5fd', '--blue-bg':  'rgba(147,197,253,0.10)',
  },
  forest: {
    '--bg':       '#0a120e', '--bg2': '#0f1a13', '--bg3': '#142118',
    '--surface':  '#1a2b20', '--surface2': '#203528',
    '--border':   'rgba(255,255,255,0.06)', '--border2': 'rgba(255,255,255,0.10)',
    '--text':     '#e8f5ec', '--text2': '#8aab94', '--text3': '#4a6652',
    '--accent':   '#4ade80', '--accent2': '#22c55e', '--accent-glow': 'rgba(74,222,128,0.08)',
    '--green':    '#34d399', '--green-bg': 'rgba(52,211,153,0.12)',
    '--red':      '#f87171', '--red-bg':   'rgba(248,113,113,0.10)',
    '--amber':    '#fbbf24', '--amber-bg': 'rgba(251,191,36,0.10)',
    '--blue':     '#60a5fa', '--blue-bg':  'rgba(96,165,250,0.10)',
  },
};

export const THEME_LABELS = {
  dark:     { label: 'Dark',     emoji: '🌙' },
  light:    { label: 'Light',    emoji: '☀️' },
  midnight: { label: 'Midnight', emoji: '🌌' },
  forest:   { label: 'Forest',   emoji: '🌲' },
};

function applyTheme(theme) {
  const vars = THEMES[theme] || THEMES.dark;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ss_theme') || 'dark');

  useEffect(() => { applyTheme(theme); }, [theme]);

  function changeTheme(t) {
    setTheme(t);
    localStorage.setItem('ss_theme', t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, themes: THEME_LABELS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
