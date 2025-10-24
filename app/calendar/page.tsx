'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ViewMode, getRange, enumerateDays, addDays, isWeekend,
} from '../_lib/calendar-range';

type GEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function toISO(d: Date) { return d.toISOString(); }
function dayKey(d: Date) { return d.toISOString().slice(0,10); }
function fmtDateTime(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
}
function fmtTime(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [workdaysOnly, setWorkdaysOnly] = useState(true);
  const [events, setEvents] = useState<GEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const { from, to } = useMemo(() => getRange(anchor, view), [anchor, view]);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams({
          timeMin: toISO(from),
          timeMax: toISO(to),
        });
        const res = await fetch(`/api/google/calendar/query?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        setEvents(json.events || []);
      } catch (e:any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [from, to]);

  const days = useMemo(() => {
    const all = enumerateDays(from, to);
    return workdaysOnly && view !== 'day' ? all.filter(d => !isWeekend(d)) : all;
  }, [from, to, workdaysOnly, view]);

  // události po dnech
  const byDay = useMemo(() => {
    const map: Record<string,GEvent[]> = {};
    for (const d of days) map[dayKey(d)] = [];
    for (const ev of events) {
      const s = ev.start?.dateTime || ev.start?.date;
      if (!s) continue;
      const k = s.slice(0,10);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    }
    Object.values(map).forEach(arr => arr.sort((a,b) => {
      const as = a.start?.dateTime || a.start?.date || '';
      const bs = b.start?.dateTime || b.start?.date || '';
      return as.localeCompare(bs);
    }));
    return map;
  }, [events, days]);

  function prev() {
    if (view === 'day') setAnchor(addDays(anchor, -1));
    else if (view === 'week') setAnchor(addDays(anchor, -7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()-1, 1));
  }
  function next() {
    if (view === 'day') setAnchor(addDays(anchor, +1));
    else if (view === 'week') setAnchor(addDays(anchor, +7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()+1, 1));
  }
  function today() { setAnchor(new Date()); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold mr-4">Google Calendar</h1>
        <div className="flex gap-2">
          <button onClick={prev} className="ease-outline-btn">‹</button>
          <button onClick={today} className="ease-outline-btn">Today</button>
          <button onClick={next} className="ease-outline-btn">›</button>
        </div>
        <div className="ml-4 flex gap-2">
          <button
            className={`ease-outline-btn ${view==='month' ? 'ring-1 ring-[--accent]' : ''}`}
            onClick={() => setView('month')}
          >Month</button>
          <button
            className={`ease-outline-btn ${view==='week' ? 'ring-1 ring-[--accent]' : ''}`}
            onClick={() => setView('week')}
          >Week</button>
          <button
            className={`ease-outline-btn ${view==='day' ? 'ring-1 ring-[--accent]' : ''}`}
            onClick={() => setView('day')}
          >Day</button>
        </div>
        {view !== 'day' && (
          <label className="ml-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={workdaysOnly} onChange={e => setWorkdaysOnly(e.target.checked)} />
            Workdays only
          </label>
        )}
        <a className="ml-auto ease-outline-btn" href="/api/google/oauth/start">
          Connect / Reconnect
        </a>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Chyba: {error}</div>}

      {!loading && !error && (
        <>
          {view === 'month' && <MonthView days={days} byDay={byDay} />}
          {view === 'week' && <WeekView days={days} byDay={byDay} />}
          {view === 'day' && <DayView day={from} events={byDay[dayKey(from)] || []} />}
        </>
      )}
    </div>
  );
}

function MonthView({ days, byDay }:{days:Date[]; byDay:Record<string,GEvent[]>}) {
  // mřížka 7 sloupců (po-pá + víkend, případně odfiltrované pracovní dny)
  const cols = Math.min(7, days.length); // když jsou jen pracovní dny, bude 5
  return (
    <div className={`grid gap-2`} style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`}}>
      {days.map(d => {
        const key = d.toISOString();
        const list = byDay[key.slice(0,10)] || [];
        return (
          <div key={key} className="border rounded-lg p-2 min-h-[120px]">
            <div className="text-xs mb-2 opacity-70">{d.toLocaleDateString(undefined,{weekday:'short', day:'numeric', month:'short'})}</div>
            <div className="space-y-1">
              {list.slice(0,3).map(ev => (
                <div key={ev.id} className="text-xs line-clamp-1">{ev.summary || '(no title)'}</div>
              ))}
              {list.length > 3 && <div className="text-[11px] opacity-60">+{list.length-3} more…</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ days, byDay }:{days:Date[]; byDay:Record<string,GEvent[]>}) {
  return (
    <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${days.length}, minmax(0,1fr))`}}>
      {days.map(d => {
        const k = d.toISOString().slice(0,10);
        const list = byDay[k] || [];
        return (
          <div key={k} className="border rounded-lg p-3">
            <div className="text-sm font-medium mb-2">{d.toLocaleDateString(undefined,{weekday:'short', day:'numeric', month:'short'})}</div>
            <div className="space-y-2">
              {list.map(ev => (
                <div key={ev.id} className="border rounded p-2">
                  <div className="text-xs opacity-70">{fmtTime(ev.start?.dateTime || ev.start?.date)}–{fmtTime(ev.end?.dateTime || ev.end?.date)}</div>
                  <div className="text-sm font-medium">{ev.summary || '(no title)'}</div>
                </div>
              ))}
              {list.length === 0 && <div className="text-sm opacity-60">No events</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ day, events }:{day:Date; events:GEvent[]}) {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">
        {day.toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long', year:'numeric'})}
      </div>
      {events.length === 0 && <div>No events today</div>}
      {events.map(ev => (
        <div key={ev.id} className="border rounded-lg p-3">
          <div className="text-sm opacity-70">{fmtDateTime(ev.start?.dateTime || ev.start?.date)} – {fmtTime(ev.end?.dateTime || ev.end?.date)}</div>
          <div className="font-medium">{ev.summary || '(no title)'}</div>
          {ev.location && <div className="text-sm opacity-80">{ev.location}</div>}
          {ev.htmlLink && <a className="text-sm underline" href={ev.htmlLink} target="_blank" rel="noreferrer">Open in Google Calendar</a>}
          {ev.description && <div className="text-sm mt-2 whitespace-pre-wrap">{ev.description}</div>}
        </div>
      ))}
    </div>
  );
}
