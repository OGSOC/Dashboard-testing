import { useState } from 'react';
import type { DividendScheduleEntry } from '@stockdash/shared';
import { addMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { useMe } from '../../api/hooks/useAuth';
import { currencySymbol } from '../../lib/currency';

interface DividendCalendarProps {
  entries: DividendScheduleEntry[];
}

export function DividendCalendar({ entries }: DividendCalendarProps) {
  const [cursor, setCursor] = useState(new Date());
  const { data: user } = useMe();
  const symbol = currencySymbol(user?.displayCurrency);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const entriesByDay = new Map<string, { ticker: string; type: 'ex' | 'pay'; amount: number }[]>();
  for (const e of entries) {
    const exKey = e.exDividendDate;
    if (!entriesByDay.has(exKey)) entriesByDay.set(exKey, []);
    entriesByDay.get(exKey)!.push({ ticker: e.ticker, type: 'ex', amount: e.amount });
    if (e.payDate) {
      if (!entriesByDay.has(e.payDate)) entriesByDay.set(e.payDate, []);
      entriesByDay.get(e.payDate)!.push({ ticker: e.ticker, type: 'pay', amount: e.amount });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="btn" onClick={() => setCursor(addMonths(cursor, -1))}>
          ← Prev
        </button>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <button className="btn" onClick={() => setCursor(addMonths(cursor, 1))}>
          Next →
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 12 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-muted" style={{ textAlign: 'center', fontWeight: 600, padding: '4px 0' }}>
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              style={{
                minHeight: 74,
                border: '1px solid var(--gridline)',
                borderRadius: 6,
                padding: 4,
                background: isToday ? 'color-mix(in srgb, var(--series-1) 8%, var(--surface-1))' : 'var(--surface-1)',
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(day, 'd')}</div>
              {dayEntries.slice(0, 3).map((e, i) => (
                <div
                  key={i}
                  title={`${e.ticker} — ${e.type === 'ex' ? 'ex-dividend' : 'pay date'} — ${symbol}${e.amount.toFixed(2)}/sh`}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    marginTop: 2,
                    padding: '1px 4px',
                    borderRadius: 3,
                    background: e.type === 'ex' ? 'color-mix(in srgb, var(--series-1) 18%, transparent)' : 'color-mix(in srgb, var(--good) 18%, transparent)',
                    color: e.type === 'ex' ? 'var(--series-1)' : 'var(--delta-good)',
                  }}
                >
                  {e.ticker} {e.type === 'ex' ? 'Ex' : 'Pay'}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }} className="text-secondary">
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--series-1)', marginRight: 4 }} />
          Ex-dividend date
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--good)', marginRight: 4 }} />
          Pay date
        </span>
      </div>
    </div>
  );
}
