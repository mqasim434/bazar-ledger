import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createClient, fetchClients, saveClient, setClientsFilters } from './clientsSlice';

export function useClients() {
  const dispatch = useDispatch();
  const { byId, allIds, status, error, filters } = useSelector((s) => s.clients);

  const list = useMemo(() => allIds.map((id) => byId[id]).filter(Boolean), [allIds, byId]);

  const filtered = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    return list.filter((c) => {
      if (filters.activeOnly && !c.active) return false;
      if (filters.salesmanId && c.salesmanId !== filters.salesmanId) return false;
      if (filters.city && c.city !== filters.city) return false;
      if (!q) return true;
      return (
        c.shopName?.toLowerCase().includes(q) ||
        c.serialNumber?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.ownerName?.toLowerCase().includes(q)
      );
    });
  }, [list, filters]);

  const cities = useMemo(
    () => [...new Set(list.map((c) => c.city).filter(Boolean))].sort(),
    [list],
  );

  return {
    list,
    filtered,
    cities,
    byId,
    status,
    error,
    filters,
    load: () => dispatch(fetchClients()),
    create: (data) => dispatch(createClient(data)),
    save: (id, data) => dispatch(saveClient({ id, data })),
    setFilters: (next) => dispatch(setClientsFilters(next)),
  };
}
