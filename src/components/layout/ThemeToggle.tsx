import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import IconButton from '../ui/IconButton';
import Tabs from '../ui/Tabs';

const ORDER: ThemeMode[] = ['light', 'dark', 'system'];
const NEXT_LABEL: Record<ThemeMode, string> = {
  light: 'Přepnout na tmavý režim',
  dark: 'Přepnout na systémový režim',
  system: 'Přepnout na světlý režim',
};
const ICONS: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/** Compact cycling icon button, for desktop top bar. */
export function ThemeToggleButton() {
  const { mode, setMode } = useTheme();
  const Icon = ICONS[mode];

  const cycle = () => {
    const idx = ORDER.indexOf(mode);
    setMode(ORDER[(idx + 1) % ORDER.length]);
  };

  return <IconButton icon={Icon} label={NEXT_LABEL[mode]} onClick={cycle} />;
}

/** Full segmented control, for mobile "Více" sheet or settings page. */
export function ThemeToggleTabs() {
  const { mode, setMode } = useTheme();
  return (
    <Tabs
      value={mode}
      onChange={(v) => setMode(v as ThemeMode)}
      items={[
        { value: 'light', label: 'Světlý', icon: Sun },
        { value: 'dark', label: 'Tmavý', icon: Moon },
        { value: 'system', label: 'Systém', icon: Monitor },
      ]}
    />
  );
}
