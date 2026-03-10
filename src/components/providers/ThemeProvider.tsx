'use client';

import { useTheme } from '@/hooks/useTheme';
import { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className={theme} suppressHydrationWarning>
      {children}
    </div>
  );
}
