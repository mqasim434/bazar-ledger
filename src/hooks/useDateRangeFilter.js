import { useMemo, useState } from 'react';
import { todayKey } from '../utils/formatters';

const DEFAULT_START = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export function useDateRangeFilter(initial) {
  const [start, setStart] = useState(initial?.start || DEFAULT_START());
  const [end, setEnd] = useState(initial?.end || todayKey());

  const inRange = useMemo(() => {
    return (dateKey) => {
      if (!dateKey) return false;
      if (start && dateKey < start) return false;
      if (end && dateKey > end) return false;
      return true;
    };
  }, [start, end]);

  return { start, end, setStart, setEnd, inRange, range: { start, end } };
}
