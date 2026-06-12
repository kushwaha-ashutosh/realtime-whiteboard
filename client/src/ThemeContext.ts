import { createContext, useContext } from 'react';
import { light, type Theme } from './theme';

export const ThemeContext = createContext<Theme>(light);
export const useTheme = () => useContext(ThemeContext);
