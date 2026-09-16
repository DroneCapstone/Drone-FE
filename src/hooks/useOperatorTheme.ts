import { useEffect, useState } from 'react';

export function useOperatorTheme() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('operator-theme') !== 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('operator-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark((value) => !value) };
}
