import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { roundMoney } from '../../utils/calculations';
import { adjustItemStock, createItem, fetchInventory, saveItem } from './inventorySlice';

export function useInventory() {
  const dispatch = useDispatch();
  const { byId, allIds, status, error } = useSelector((s) => s.inventory);
  const list = useMemo(() => allIds.map((id) => byId[id]).filter(Boolean), [allIds, byId]);
  const totalValue = useMemo(
    () => roundMoney(list.reduce((sum, i) => sum + Number(i.stockValue || 0), 0)),
    [list],
  );

  return {
    list,
    byId,
    status,
    error,
    totalValue,
    load: () => dispatch(fetchInventory()),
    create: (data) => dispatch(createItem(data)),
    save: (id, data) => dispatch(saveItem({ id, data })),
    adjust: (payload) => dispatch(adjustItemStock(payload)),
  };
}
