import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, API_BASE_URL } from '../../../services/api';
import { Download, Printer } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

const StaffReports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const tabs = [
    { id: 'overview', label: 'My Overview', endpoint: '/staff/reports/overview' },
    { id: 'product-usage', label: 'My Product Usage', endpoint: '/staff/reports/product-usage' },
  ];

  useEffect(() => {
    loadReport();
  }, [activeTab, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    const tab = tabs.find(t => t.id === activeTab);
    const query = new URLSearchParams({ start_date: dateRange.start_date, end_date: dateRange.end_date });
    try {
      const res = await fetchApi(`${tab.endpoint}?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    const tab = tabs.find(t => t.id === activeTab);
    if (!tab) return;
    const query = new URLSearchParams({ 
      start_date: dateRange.start_date, 
      end_date: dateRange.end_date,
      format 
    });
    
    setExporting(true);
    try {
      const res = await fetchApi(`${tab.endpoint}?${query.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-${tab.id}-${dateRange.start_date}_${dateRange.end_date}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('The report export failed. Please check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = (items) => {
    if (!items || items.length === 0) return <div className="p-8 text-center text-text-muted">No data found for this period.</div>;
    const keys = Object.keys(items[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-text-primary">
          <thead className="bg-lavender text-primary-purple">
            <tr>
              {keys.map(k => (
                <th key={k} className="px-4 py-3 font-semibold uppercase whitespace-nowrap">
                  {k.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {keys.map(k => (
                  <td key={k} className="px-4 py-3 whitespace-nowrap">
                    {(k.includes('amount') || k.includes('price') || k.includes('value')) && item[k] !== null ? formatMoney(item[k]) : item[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout role="staff">
      <div className="print-friendly">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
          <div><h1 className="page-title">My Reports</h1><p className="mt-2 text-sm text-text-muted">Review your completed work and product usage.</p></div>
          <div className="flex flex-wrap gap-2">
            <button 
              disabled={exporting} 
              onClick={() => handleExport('csv')} 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-text-primary hover:bg-gray-50 flex items-center text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exporting...' : 'CSV'}
            </button>
            <button 
              disabled={exporting} 
              onClick={() => handleExport('pdf')} 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-text-primary hover:bg-gray-50 flex items-center text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exporting...' : 'PDF'}
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep flex items-center text-sm font-bold">
              <Printer className="w-4 h-4 mr-2" /> Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 no-print">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-primary-purple text-primary-purple' : 'border-transparent text-text-muted hover:text-text-primary hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-100 bg-white p-4 sm:flex-row sm:items-end no-print">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Start Date</label>
              <input type="date" value={dateRange.start_date} onChange={e => setDateRange({...dateRange, start_date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">End Date</label>
              <input type="date" value={dateRange.end_date} onChange={e => setDateRange({...dateRange, end_date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="p-6 min-h-[400px]">
            {/* Print Header */}
            <div className="hidden print-block mb-8">
              <h2 className="text-2xl font-bold text-primary-purple mb-2">Poise Hair Center - {tabs.find(t=>t.id===activeTab).label}</h2>
              <p className="text-sm text-gray-500">Period: {dateRange.start_date} to {dateRange.end_date}</p>
            </div>

            {loading ? (
              <div className="text-center text-text-muted py-12">Loading report data...</div>
            ) : (
              <div>
                {activeTab === 'overview' && data ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(data).map(([key, val]) => (
                      <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-text-muted uppercase mb-1">{key.replace(/_/g, ' ')}</p>
                        <p className="text-2xl font-bold text-primary-deep">{key.includes('value') || key.includes('amount') ? formatMoney(val) : val}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  Array.isArray(data) && renderTable(data)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffReports;
