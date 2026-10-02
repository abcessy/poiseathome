import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Package, AlertTriangle, XCircle, Search, Eye, Loader } from 'lucide-react';

export const InventoryBadge = ({ status }) => {
  if (status === 'out_of_stock') return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Out of Stock</span>;
  if (status === 'low_stock') return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" /> Low Stock</span>;
  return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800">In Stock</span>;
};

const AdminInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/inventory');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const totalActive = products.length;
  const lowCount = products.filter(p => p.inventory_status === 'low_stock').length;
  const outCount = products.filter(p => p.inventory_status === 'out_of_stock').length;

  const filtered = products
    .filter(p => !filter || p.inventory_status === filter)
    .filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="page-title">Product Inventory</h1><p className="mt-2 text-sm text-text-muted">Current available quantities and stock alerts.</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-muted">Total Products</p>
            <p className="text-2xl font-bold">{totalActive}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-muted">Low Stock</p>
            <p className="text-2xl font-bold text-orange-600">{lowCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mr-4">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-muted">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">{outCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {['', 'in_stock', 'low_stock', 'out_of_stock'].map(s => (
              <button 
                key={s} 
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors ${filter === s ? 'bg-primary-purple text-white border-primary-purple' : 'bg-white text-text-muted border-gray-200 hover:bg-gray-50'}`}
              >
                {s === '' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64"
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
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
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
                      <p className="text-[10px] text-text-muted mt-1 uppercase">Threshold: {parseFloat(p.low_stock_threshold)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/admin/inventory/${p.id}`} className="p-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-text-muted">No inventory records found.</td>
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

export default AdminInventory;
