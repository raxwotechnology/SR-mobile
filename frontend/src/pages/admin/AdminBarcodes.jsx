import { useState, useEffect } from 'react';
import { Barcode, Search, Download, Calendar, Filter, Clock, User, Package } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getBarcodeLogs } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';

const AdminBarcodes = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, roleFilter, startDate, endDate]);

  const fetchLogs = async (searchVal) => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (searchVal || search) params.search = searchVal || search;
      if (roleFilter) params.role = roleFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const { data } = await getBarcodeLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load barcode logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs(search);
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const rows = [
      ['Date', 'Time', 'User', 'Role', 'Product', 'SKU', 'Barcode', 'Quantity', 'Printer'].join(','),
      ...logs.map(l => [
        new Date(l.createdAt).toLocaleDateString(),
        new Date(l.createdAt).toLocaleTimeString(),
        l.generatedByName,
        l.generatedByRole,
        `"${l.productName}"`,
        l.sku || 'N/A',
        l.barcode,
        l.quantity,
        `"${l.printerName || 'Default'}"`,
      ].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `barcode_activity_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    cashier: 'bg-amber-100 text-amber-700',
  };

  return (
    <DashboardLayout navItems={navItems} title="Mobile Hub Admin Panel">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Barcode size={24} /> Barcode Activity Log
            </h1>
            <p className="text-muted-text text-sm mt-1">Track all barcode generation activity ({total} total records)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 bg-dark-navy hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-muted-text block mb-1">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Product, user, SKU, barcode..."
                  className="w-full border border-card-border rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-text block mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-text block mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-text block mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-text">
              <Barcode size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No barcode activity found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-muted-text">
                      <div className="flex items-center gap-1"><Clock size={13} /> Date & Time</div>
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">
                      <div className="flex items-center gap-1"><User size={13} /> Generated By</div>
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">Role</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">
                      <div className="flex items-center gap-1"><Package size={13} /> Product</div>
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">SKU</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">Barcode</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-text">Printer</th>
                    <th className="text-center px-5 py-3 font-medium text-muted-text">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {logs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-dark-navy">{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-text">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-dark-navy">{log.generatedByName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[log.generatedByRole] || 'bg-gray-100 text-gray-600'}`}>
                          {log.generatedByRole}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-dark-navy max-w-48 truncate">{log.productName}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-text">{log.sku || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-text">{log.barcode}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-text font-medium">{log.printerName || 'Default'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          {log.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-card-border bg-gray-50">
              <p className="text-xs text-muted-text">
                Page {page} of {totalPages} ({total} records)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-card-border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-card-border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBarcodes;
