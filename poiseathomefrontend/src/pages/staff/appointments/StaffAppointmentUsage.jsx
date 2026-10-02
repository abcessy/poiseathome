import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import { Plus } from 'lucide-react';
import { useAppDialog } from '../../../context/AppDialogContext';

export const StaffAppointmentUsage = ({ appointmentId, status, usages, loadApp }) => {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ product_id: '', quantity: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const { confirmDialog, messageDialog } = useAppDialog();

  useEffect(() => {
    if (showModal) loadProducts();
  }, [showModal]);

  const loadProducts = async () => {
    try {
      const res = await fetchApi('/staff/inventory');
      if (res.ok) setProducts((await res.json()).data);
    } catch(e) {}
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchApi(`/staff/appointments/${appointmentId}/product-usages`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ product_id: '', quantity: '', notes: '' });
        loadApp();
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'The product usage could not be recorded.');
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const reverseUsage = async (usageId) => {
    if (!await confirmDialog('Reverse this product usage and restore the inventory quantity?', { title: 'Reverse product usage', confirmLabel: 'Reverse usage', tone: 'danger' })) return;
    try {
      const res = await fetchApi(`/staff/appointments/${appointmentId}/product-usages/${usageId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Staff reversed' })
      });
      if (res.ok) loadApp();
      else await messageDialog((await res.json()).message || 'The product usage could not be reversed.');
    } catch(e) {}
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Products Used</h3>
        {status === 'in_progress' && (
          <button onClick={() => setShowModal(true)} className="btn-outline !min-h-9 !px-3 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Record Usage
          </button>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-3 font-semibold text-text-muted text-xs">Product</th>
              <th className="p-3 font-semibold text-text-muted text-xs text-right">Qty</th>
              <th className="p-3 font-semibold text-text-muted text-xs text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {usages.map(u => (
              <tr key={u.id} className={u.reversed_at ? 'opacity-50' : ''}>
                <td className="p-3 font-medium">{u.product?.name}</td>
                <td className="p-3 text-right font-mono text-xs">
                  {parseFloat(u.quantity)} {u.product?.unit}
                </td>
                <td className="p-3 text-center">
                  {u.reversed_at ? (
                    <span className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-1 rounded">Reversed</span>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded block">Applied</span>
                      {status === 'in_progress' && (
                        <button onClick={() => reverseUsage(u.id)} className="block mt-2 mx-auto text-[10px] text-red-600 hover:underline">Reverse</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {usages.length === 0 && (
              <tr><td colSpan="3" className="p-4 text-center text-text-muted text-xs">No products recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="form-surface mx-auto my-8 w-[calc(100%-2rem)] max-w-3xl rounded-2xl p-6 sm:p-8 md:my-10">
            <h2 id="usage-dialog-title" className="text-xl font-semibold mb-1">Record Product Usage</h2>
            <p className="mb-5 text-sm text-text-muted">Enter the exact amount used for this appointment.</p>
            <form onSubmit={handleRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Product</label>
                <select required className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})}>
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.inventory_status === 'out_of_stock'}>
                      {p.name} ({parseFloat(p.inventory?.available_quantity || 0)} {p.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Quantity Used ({selectedProduct.unit})</label>
                  <input required type="number" step="0.001" min="0.001" max={selectedProduct.inventory?.available_quantity} className="w-full px-3 py-2 border rounded-lg" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Notes (Optional)</label>
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowModal(false)} disabled={loading} className="btn-secondary">Back to appointment</button>
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Recording...' : 'Record usage'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
