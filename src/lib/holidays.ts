export interface Holiday {
  date: Date;
  name: string;
}

export function getCzechHolidays(year: number): Holiday[] {
  // Static holidays (month is 0-indexed in JS Dates)
  const staticHolidays = [
    { month: 0, day: 1, name: 'Nový rok / Den obnovy samostatného českého státu' },
    { month: 4, day: 1, name: 'Svátek práce' },
    { month: 4, day: 8, name: 'Den vítězství' },
    { month: 6, day: 5, name: 'Den slovanských věrozvěstů Cyrila a Metoděje' },
    { month: 6, day: 6, name: 'Den upálení mistra Jana Husa' },
    { month: 8, day: 28, name: 'Den české státnosti' },
    { month: 9, day: 28, name: 'Den vzniku samostatného československého státu' },
    { month: 10, day: 17, name: 'Den boje za svobodu a demokracii' },
    { month: 11, day: 24, name: 'Štědrý den' },
    { month: 11, day: 25, name: '1. svátek vánoční' },
    { month: 11, day: 26, name: '2. svátek vánoční' },
  ];

  const holidays: Holiday[] = staticHolidays.map(h => ({
    date: new Date(year, h.month, h.day),
    name: h.name
  }));

  // Calculate Easter using Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterSunday = new Date(year, month, day);
  
  // Good Friday is 2 days before Easter Sunday
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  
  // Easter Monday is 1 day after Easter Sunday
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  holidays.push({ date: goodFriday, name: 'Velký pátek' });
  holidays.push({ date: easterMonday, name: 'Velikonoční pondělí' });

  return holidays;
}

export function getHolidayForDate(date: Date): string | null {
  const holidays = getCzechHolidays(date.getFullYear());
  const holiday = holidays.find(h => 
    h.date.getDate() === date.getDate() && 
    h.date.getMonth() === date.getMonth()
  );
  return holiday ? holiday.name : null;
}
