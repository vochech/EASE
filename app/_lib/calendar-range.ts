export type ViewMode = 'month' | 'week' | 'day';

export function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
export function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23,59,59,999); return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate()+n); return x;
}
export function startOfWeek(d: Date, weekStartsOn: 0|1 = 1) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  return addDays(x, -diff);
}
export function endOfWeek(d: Date, weekStartsOn: 0|1 = 1) {
  return addDays(endOfDay(startOfWeek(d, weekStartsOn)), 6);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth()+1, 0));
}

export function getRange(anchor: Date, view: ViewMode) {
  if (view === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === 'week') return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export function enumerateDays(from: Date, to: Date) {
  const days: Date[] = [];
  let d = startOfDay(from);
  while (d <= to) { days.push(d); d = addDays(d, 1); }
  return days;
}

export function isWeekend(d: Date) {
  const n = d.getDay(); return n === 0 || n === 6;
}
