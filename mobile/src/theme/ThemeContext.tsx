import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './tokens';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof colors.light;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDark: false,
  colors: colors.light,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: ThemeMode }> = ({
  children,
  initialTheme
}) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    initialTheme || (systemScheme === 'dark' ? 'dark' : 'light')
  );

  useEffect(() => {
    if (initialTheme) {
      setThemeModeState(initialTheme);
    }
  }, [initialTheme]);

  const toggleTheme = () => {
    setThemeModeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const isDark = themeMode === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors: currentColors,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
