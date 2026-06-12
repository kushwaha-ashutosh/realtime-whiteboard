export type ThemeMode = 'dark' | 'light';

export interface Theme {
  mode: ThemeMode;
  canvasBg: string;
  panelBg: string;
  panelBorder: string;
  btnDefault: string;
  btnHover: string;
  btnActive: string;
  text: string;
  textMuted: string;
  accent: string;
  danger: string;
  success: string;
  divider: string;
  gridDot: string;
  gridLine: string;
  inputBg: string;
}

export const dark: Theme = {
  mode: 'dark',
  canvasBg: '#0f0f17',
  panelBg: '#1e1e2e',
  panelBorder: '#374151',
  btnDefault: '#2d2d3f',
  btnHover: '#3a3a52',
  btnActive: '#6366f1',
  text: '#ffffff',
  textMuted: '#9ca3af',
  accent: '#6366f1',
  danger: '#7f1d1d',
  success: '#065f46',
  divider: '#444',
  gridDot: 'rgba(255,255,255,0.18)',
  gridLine: 'rgba(255,255,255,0.07)',
  inputBg: '#2d2d3f',
};

export const light: Theme = {
  mode: 'light',
  canvasBg: '#f8fafc',
  panelBg: '#ffffff',
  panelBorder: '#e2e8f0',
  btnDefault: '#f1f5f9',
  btnHover: '#e2e8f0',
  btnActive: '#6366f1',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#6366f1',
  danger: '#fee2e2',
  success: '#d1fae5',
  divider: '#e2e8f0',
  gridDot: 'rgba(0,0,0,0.12)',
  gridLine: 'rgba(0,0,0,0.07)',
  inputBg: '#f8fafc',
};
