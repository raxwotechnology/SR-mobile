import { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar, Download, BarChart3, Eye, FileText } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminNavGroups as navItems } from './adminNavItems';
import { getCashierSalesReport, getAdminOrders } from '../../services/api';
import { toast } from 'react-toastify';
import useAdminStoreStore from '../../store/adminStoreStore';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';

const AdminSalesTracking = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useAdminStoreStore();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Cashier Summary Modal States
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [cashierOrders, setCashierOrders] = useState([]);
  const [cashierOrdersLoading, setCashierOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detailed');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const res = await getCashierSalesReport(params);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedStoreId]);

  const handleOpenSummary = async (cashierData) => {
    setSelectedCashier(cashierData);
    setShowSummaryModal(true);
    setCashierOrdersLoading(true);
    try {
      const params = {
        cashierId: cashierData.cashier._id,
        startDate,
        endDate,
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data: orders } = await getAdminOrders(params);
      setCashierOrders(orders || []);
    } catch (err) {
      toast.error('Failed to load cashier sales details');
    } finally {
      setCashierOrdersLoading(false);
    }
  };

  const exportPDFReport = () => {
    if (!data?.cashiers?.length) return;
    const cols = [
      { label: 'Cashier Name', accessor: (r) => r.cashier.name },
      { label: 'Email', accessor: (r) => r.cashier.email },
      { label: 'Total Sales', accessor: (r) => `Rs. ${r.totalSales?.toLocaleString()}` },
      { label: 'Transactions', accessor: 'transactionCount' },
      { label: 'Items Sold', accessor: 'totalItems' },
      { label: 'Avg Transaction', accessor: (r) => `Rs. ${r.avgTransaction?.toLocaleString()}` },
      { label: 'Cash Sales', accessor: (r) => `Rs. ${r.cashSales?.toLocaleString()}` },
      { label: 'Card Sales', accessor: (r) => `Rs. ${r.cardSales?.toLocaleString()}` }
    ];
    exportToPDF(data.cashiers, cols, 'Cashier Sales Performance');
  };

  const maxSales = data?.cashiers?.length ? Math.max(...data.cashiers.map((c) => c.totalSales)) : 0;

  // Aggregate items from cashier orders for detailed summary
  const getAggregatedItems = () => {
    const itemsMap = new Map();
    cashierOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.productId || item.name;
        const existing = itemsMap.get(key);
        const imeis = item.imei || [];
        if (existing) {
          existing.quantity += item.quantity;
          existing.imeis = [...existing.imeis, ...imeis];
        } else {
          itemsMap.set(key, {
            name: item.name,
            quantity: item.quantity,
            imeis: [...imeis]
          });
        }
      });
    });
    return Array.from(itemsMap.values());
  };

  const aggregatedItems = getAggregatedItems();

  const getDetailedItemsList = () => {
    const list = [];
    cashierOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        list.push({
          date: order.createdAt,
          invoiceNumber: order.invoiceNumber || order.invoiceNo || order._id.toString().slice(-6).toUpperCase(),
          name: item.name,
          unitPrice: item.price || 0,
          quantity: item.quantity || 1,
          totalPrice: (item.price || 0) * (item.quantity || 1),
          imeis: item.imei || [],
          paymentMethod: order.paymentMethod || 'cash'
        });
      });
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const detailedItems = getDetailedItemsList();

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#1f1f1f' }}>📊 Cashier Sales Tracking</h1>
            <p style={{ margin: 0, color: '#7b6f69', fontSize: '0.85rem' }}>Cashier POS performance monitoring and detailed summaries</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #eaded6', fontSize: '0.82rem' }} />
            <span style={{ color: '#7b6f69' }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #eaded6', fontSize: '0.82rem' }} />
            
            <button onClick={exportPDFReport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #dc2626', background: '#dc2626', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {data?.totals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total POS Sales', value: `Rs. ${data.totals.totalSales.toLocaleString()}`, icon: DollarSign, color: '#d946a0', bg: '#fdf2f8' },
              { label: 'Transactions', value: data.totals.totalTransactions, icon: ShoppingCart, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Items Sold', value: data.totals.totalItems, icon: BarChart3, color: '#059669', bg: '#d1fae5' },
              { label: 'Cashiers Logged', value: data.cashiers?.length || 0, icon: Users, color: '#ea580c', bg: '#fff7ed' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaded6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.icon size={18} style={{ color: c.color }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#7b6f69', textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1f1f1f' }}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Visual Bar Chart */}
        {data?.cashiers?.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eaded6', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#1f1f1f' }}>Cashier Performance Comparison</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.cashiers.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ minWidth: '120px', fontSize: '0.82rem', fontWeight: 600, color: '#1f1f1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cashier.name}</span>
                  <div style={{ flex: 1, height: '28px', background: '#f5f0ec', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${maxSales > 0 ? (c.totalSales / maxSales * 100) : 0}%`, background: `linear-gradient(90deg, #d946a0, #c026d3)`, borderRadius: '8px', transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                      {c.totalSales / maxSales > 0.3 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>Rs. {c.totalSales.toLocaleString()}</span>}
                    </div>
                  </div>
                  {c.totalSales / maxSales <= 0.3 && <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d946a0' }}>Rs. {c.totalSales.toLocaleString()}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Table */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eaded6', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#7b6f69' }}>Loading...</div>
          ) : !data?.cashiers?.length ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#7b6f69' }}>No POS sales data for this period</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#fdf2f8', borderBottom: '1px solid #eaded6' }}>
                    {['#', 'Cashier', 'Total Sales', 'Transactions', 'Items', 'Avg Trans.', 'Cash', 'Card', 'Last Sale', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 0.8rem', textAlign: 'left', fontWeight: 700, color: '#7b6f69', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cashiers.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f0ec' }}>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#7b6f69', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '0.7rem 0.8rem' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>{c.cashier.name}</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#7b6f69' }}>{c.cashier.email}</p>
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem', fontWeight: 700, color: '#d946a0' }}>Rs. {c.totalSales.toLocaleString()}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#1f1f1f' }}>{c.transactionCount}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#1f1f1f' }}>{c.totalItems}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#7b6f69' }}>Rs. {c.avgTransaction.toLocaleString()}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#059669' }}>Rs. {c.cashSales.toLocaleString()}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: '#7c3aed' }}>Rs. {c.cardSales.toLocaleString()}</td>
                      <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.78rem', color: '#7b6f69' }}>{c.lastSale ? new Date(c.lastSale).toLocaleDateString() : '—'}</td>
                      
                      {/* View Summary button */}
                      <td style={{ padding: '0.7rem 0.8rem' }}>
                        <button
                          onClick={() => handleOpenSummary(c)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #3b82f6',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} /> Summary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Summary Modal */}
        {showSummaryModal && selectedCashier && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-card-border shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-card-border flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-dark-navy text-sm">📋 Cashier Sales Summary - {selectedCashier.cashier.name}</h3>
                  <p className="text-[10px] text-muted-text mt-0.5">Date Range: {startDate} to {endDate}</p>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-muted-text hover:text-dark-navy font-bold text-base"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {cashierOrdersLoading ? (
                  <div className="py-12 text-center text-muted-text">Loading detailed sales summary...</div>
                ) : (activeTab === 'detailed' ? detailedItems.length === 0 : aggregatedItems.length === 0) ? (
                  <div className="py-12 text-center text-muted-text">No items sold by this cashier in the selected period.</div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div className="border border-card-border rounded-xl p-3 bg-gray-50">
                        <span className="text-[10px] text-muted-text uppercase font-bold block">Transactions Handled</span>
                        <span className="text-lg font-bold text-dark-navy">{selectedCashier.transactionCount}</span>
                      </div>
                      <div className="border border-card-border rounded-xl p-3 bg-gray-50">
                        <span className="text-[10px] text-muted-text uppercase font-bold block">Total Amount Collected</span>
                        <span className="text-lg font-bold text-emerald-600">Rs. {selectedCashier.totalSales.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-gray-150 mb-4 gap-2">
                      <button
                        onClick={() => setActiveTab('detailed')}
                        className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'detailed' ? 'border-blue-500 text-blue-600 font-extrabold' : 'border-transparent text-gray-400'}`}
                      >
                        Detailed Sales Ledger
                      </button>
                      <button
                        onClick={() => setActiveTab('aggregated')}
                        className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'aggregated' ? 'border-blue-500 text-blue-600 font-extrabold' : 'border-transparent text-gray-400'}`}
                      >
                        Aggregated Product Summary
                      </button>
                    </div>

                    {activeTab === 'detailed' ? (
                      <div>
                        <p className="text-[10px] font-bold text-dark-navy mb-2 uppercase tracking-wide">Detailed Ledger (Line Items)</p>
                        <div className="border border-card-border rounded-xl overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-card-border text-left text-[10px] uppercase font-bold text-muted-text">
                                <th className="p-3">Date</th>
                                <th className="p-3">Invoice No</th>
                                <th className="p-3">Product Name</th>
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3">IMEIs</th>
                                <th className="p-3">Payment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {detailedItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                  <td className="p-3 font-semibold text-blue-600">{item.invoiceNumber}</td>
                                  <td className="p-3 font-semibold text-dark-navy">{item.name}</td>
                                  <td className="p-3 text-right font-medium">Rs. {item.unitPrice.toLocaleString()}</td>
                                  <td className="p-3 text-center font-bold text-gray-800">{item.quantity}</td>
                                  <td className="p-3 text-right font-bold text-emerald-600">Rs. {item.totalPrice.toLocaleString()}</td>
                                  <td className="p-3 font-mono text-[10px] text-gray-500 max-w-[120px] truncate" title={item.imeis.join(', ')}>
                                    {item.imeis.length > 0 ? item.imeis.join(', ') : '—'}
                                  </td>
                                  <td className="p-3 uppercase font-bold text-[10px] text-purple-600">{item.paymentMethod}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold text-dark-navy mb-2 uppercase tracking-wide">Product Quantities Sold</p>
                        <div className="border border-card-border rounded-xl overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-card-border text-left text-[10px] uppercase font-bold text-muted-text">
                                <th className="p-3">Product Name</th>
                                <th className="p-3 text-center">Qty Sold</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">IMEIs / Serial Numbers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {aggregatedItems.map((item, idx) => {
                                const isMobile = item.imeis.length > 0;
                                return (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 font-semibold text-dark-navy">{item.name}</td>
                                    <td className="p-3 text-center font-bold text-primary-blue">{item.quantity}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isMobile ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {isMobile ? 'Mobiles' : 'Accessories'}
                                      </span>
                                    </td>
                                    <td className="p-3 font-mono text-[10px] text-muted-text">
                                      {item.imeis.length > 0 ? item.imeis.join(', ') : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-card-border bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (activeTab === 'detailed') {
                      const detailCols = [
                        { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                        { label: 'Invoice', accessor: 'invoiceNumber' },
                        { label: 'Product Name', accessor: 'name' },
                        { label: 'Unit Price', accessor: (r) => `Rs. ${r.unitPrice.toLocaleString()}` },
                        { label: 'Qty', accessor: 'quantity' },
                        { label: 'Total', accessor: (r) => `Rs. ${r.totalPrice.toLocaleString()}` },
                        { label: 'IMEIs', accessor: (r) => r.imeis.join(', ') || '—' },
                        { label: 'Payment', accessor: 'paymentMethod' }
                      ];
                      exportToPDF(detailedItems, detailCols, `${selectedCashier.cashier.name}_Detailed_Sales_Ledger`);
                    } else {
                      const summaryCols = [
                        { label: 'Product Name', accessor: 'name' },
                        { label: 'Qty Sold', accessor: 'quantity' },
                        { label: 'IMEIs', accessor: (r) => r.imeis.join(', ') || '—' }
                      ];
                      exportToPDF(aggregatedItems, summaryCols, `${selectedCashier.cashier.name}_Sales_Summary`);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1"
                  disabled={cashierOrdersLoading || (activeTab === 'detailed' ? detailedItems.length === 0 : aggregatedItems.length === 0)}
                >
                  <FileText size={12} /> Export PDF
                </button>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="bg-white border border-card-border hover:bg-gray-100 text-muted-text font-semibold text-xs px-4 py-2 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSalesTracking;
