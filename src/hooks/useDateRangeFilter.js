import { useMemo, useState } from 'react';
import { todayKey } from '../utils/formatters';

/** Sentinel: empty start means "from the beginning of time" (full history). */
export const FROM_START = '';

const DEFAULT_START = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export function useDateRangeFilter(initial) {
  const [start, setStart] = useState(
    initial?.fromStart ? FROM_START : initial?.start ?? DEFAULT_START(),
  );
  const [end, setEnd] = useState(initial?.end || todayKey());

  const fromStart = start === FROM_START || start === null || start === undefined || start === '';

  const inRange = useMemo(() => {
    return (dateKey) => {
      if (!dateKey) return false;
      if (!fromStart && start && dateKey < start) return false;
      if (end && dateKey > end) return false;
      return true;
    };
  }, [start, end, fromStart]);

  function setFromStart() {
    setStart(FROM_START);
  }

  function setThisMonth() {
    setStart(DEFAULT_START());
    setEnd(todayKey());
  }

  return {
    start,
    end,
    setStart,
    setEnd,
    inRange,
    fromStart,
    setFromStart,
    setThisMonth,
    range: { start: fromStart ? '' : start, end, fromStart },
  };
}
