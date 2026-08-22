import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Search, Loader } from 'lucide-react';
import { InventoryBadge } from '../../admin/catalog/AdminInventory';

const StaffInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/staff/inventory');
      if (res.ok) setProducts((await res.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="staff">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Operational Inventory</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">SKU / Product</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Available</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-text-muted">{p.sku}</p>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{p.name}</p>
                    </td>
                    <td className="p-4 text-sm text-text-muted">{p.category?.name}</td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-bold text-text-primary">{parseFloat(p.inventory?.available_quantity || 0)}</span>
                      <span className="text-xs text-text-muted ml-1 capitalize">{p.unit === 'piece' ? 'pcs' : p.unit}</span>
                    </td>
                    <td className="p-4">
                      <InventoryBadge status={p.inventory_status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-text-muted">No inventory records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffInventory;
