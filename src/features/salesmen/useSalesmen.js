import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import {
  createSalesman,
  fetchSalesmen,
  saveSalesman,
  setSalesmanActive,
  setSalesmenFilters,
} from './salesmenSlice';

export function useSalesmen() {
  const dispatch = useDispatch();
  const { byId, allIds, status, error, filters } = useSelector((s) => s.salesmen);

  const list = useMemo(() => allIds.map((id) => byId[id]).filter(Boolean), [allIds, byId]);

  const filtered = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    return list.filter((s) => {
      if (filters.activeOnly && !s.active) return false;
      if (filters.area && s.area !== filters.area) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.route?.toLowerCase().includes(q) ||
        s.contact?.toLowerCase().includes(q)
      );
    });
  }, [list, filters]);

  const areas = useMemo(
    () => [...new Set(list.map((s) => s.area).filter(Boolean))].sort(),
    [list],
  );

  return {
    list,
    filtered,
    areas,
    byId,
    status,
    error,
    filters,
    load: (opts) => dispatch(fetchSalesmen(opts)),
    create: (data) => dispatch(createSalesman(data)),
    save: (id, data) => dispatch(saveSalesman({ id, data })),
    setActive: (id, active) => dispatch(setSalesmanActive({ id, active })),
    setFilters: (next) => dispatch(setSalesmenFilters(next)),
  };
}
