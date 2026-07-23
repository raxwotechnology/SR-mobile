import React, { useEffect, useState } from 'react';
import { Package, ShoppingBag, Plus, Trash2, Search, Printer, Eye, X, FileText, Calendar, Filter } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
<<<<<<< HEAD
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
import { createStockReceipt, getStockReceipts, getSuppliers, getReceiptByGRN, getAdminProducts, getStores, deleteStockReceipt } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import useSettingsStore from '../../store/settingsStore';

const AdminGRN = () => {
  const { selectedStoreId } = useAdminStoreStore();
  const settings = useSettingsStore((s) => s.settings);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: '', qty: 1, unitCost: 0 }]);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [grnSearch, setGrnSearch] = useState('');
  const [grnFilter, setGrnFilter] = useState('');
  const [viewGrn, setViewGrn] = useState(null);
  const [printQty, setPrintQty] = useState({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const [suppRes, prodRes, storesRes] = await Promise.all([
        getSuppliers({ storeId: storeParam }),
        getAdminProducts({ storeId: storeParam }),
        getStores()
      ]);
      setSuppliers(suppRes.data || []);
      setProducts(prodRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);
    } catch (err) {
      toast.error('Failed to load dependency data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const params = {};
      if (selectedStoreId !== 'all') params.storeId = selectedStoreId;
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
      if (grnFilter) params.grnNumber = grnFilter;
      const { data } = await getStockReceipts(params);
      setHistory(data || []);
    } catch {
      // ignore
    }
  };

<<<<<<< HEAD
  const handleDeleteClick = (id, e) => {
    if (e) e.stopPropagation();
    setItemToDelete({ _id: id });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteStockReceipt(itemToDelete._id);
=======
  const handleDeleteGRN = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this GRN? This will restore original stock levels.')) return;
    try {
      await deleteStockReceipt(id);
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
      toast.success('GRN deleted successfully');
      fetchHistory();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete GRN');
    }
  };

  useEffect(() => { fetchData(); }, [selectedStoreId]);
  useEffect(() => { fetchHistory(); }, [selectedStoreId, range.startDate, range.endDate, grnFilter]);

  const addLine = () => setItems((prev) => [...prev, { productId: '', qty: 1, unitCost: 0 }]);
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, patch) => setItems((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const grandTotal = items.reduce((s, l) => s + (Number(l.qty) * Number(l.unitCost)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStoreId === 'all') {
      toast.error('Please select a specific store first');
      return;
    }
    if (!supplierId) {
      toast.error('Supplier is required');
      return;
    }
    const cleaned = items
      .map((l) => ({ ...l, qty: Number(l.qty), unitCost: Number(l.unitCost) }))
      .filter((l) => l.productId && l.qty > 0);
    if (cleaned.length === 0) {
      toast.error('Add at least one valid item');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        supplierId,
        invoiceNo: invoiceNo || undefined,
        receivedAt: receivedAt || undefined,
        notes: notes || undefined,
        items: cleaned,
        storeId: selectedStoreId,
      };

      await createStockReceipt(payload);
      toast.success('GRN saved — stock updated successfully');
      setSupplierId('');
      setInvoiceNo('');
      setReceivedAt('');
      setNotes('');
      setItems([{ productId: '', qty: 1, unitCost: 0 }]);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save GRN');
    } finally {
      setSaving(false);
    }
  };

  const handleGrnSearch = async () => {
    if (!grnSearch.trim()) return;
    try {
      const { data } = await getReceiptByGRN(grnSearch.trim());
      setViewGrn(data);
    } catch {
      toast.error('GRN not found');
    }
  };

  const printVoucher = (receipt) => {
    const siteName = settings?.shopName || 'Mobile Hub';
    const logoUrl = settings?.logoUrl || settings?.logo || '';
    const itemRows = (receipt.items || []).map((it, i) => {
      const qty = printQty[`${receipt._id}_${i}`] || it.qty;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${it.productId?.name || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${qty}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs. ${Number(it.unitCost).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs. ${(qty * Number(it.unitCost)).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const total = (receipt.items || []).reduce((s, it, i) => {
      const qty = printQty[`${receipt._id}_${i}`] || it.qty;
      return s + qty * Number(it.unitCost);
    }, 0);

    const html = `<!DOCTYPE html><html><head><title>GRN - ${receipt.grnNumber || ''}</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:30px;max-width:800px;margin:0 auto}
    .header{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:15px;margin-bottom:20px}
    .logo{width:60px;height:60px;border-radius:12px;object-fit:cover;margin-bottom:8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;font-size:13px}
    .info-grid div{padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#2563eb;color:white;padding:10px 8px;text-align:left}
    td{padding:10px 8px;border:1px solid #e2e8f0}
    .total-row{background:#f8fafc;font-weight:bold;font-size:15px}
    .footer{text-align:center;margin-top:40px;font-size:11px;color:#94a3b8}</style></head><body>
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
      <h1>${siteName}</h1>
      <p style="font-size:18px;font-weight:700;color:#2563eb">GOODS RECEIVED NOTE (GRN)</p>
    </div>
    <div class="info-grid">
      <div><strong>GRN No:</strong> ${receipt.grnNumber || 'N/A'}</div>
      <div><strong>Date:</strong> ${new Date(receipt.receivedAt || receipt.createdAt).toLocaleDateString()}</div>
      <div><strong>Supplier:</strong> ${receipt.supplierId?.name || 'N/A'} ${receipt.supplierId?.company ? `(${receipt.supplierId.company})` : ''}</div>
      <div><strong>Invoice No:</strong> ${receipt.invoiceNo || 'N/A'}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Product Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows}
        <tr class="total-row"><td colspan="4" style="text-align:right">Grand Total</td><td style="text-align:right">Rs. ${total.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px;font-size:12px">
      <div style="border-top:1px solid #333;text-align:center;padding-top:8px">Received & Counted By</div>
      <div style="border-top:1px solid #333;text-align:center;padding-top:8px">Manager Approval</div>
    </div>
    <div class="footer">Generated on ${new Date().toLocaleString()}</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="GRN Management">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="GRN Management">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <ShoppingBag className="text-primary-blue" /> Goods Received Note (GRN)
            </h1>
            <p className="text-muted-text text-sm mt-1">Record and track incoming stock from suppliers</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchHistory} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
              <Calendar size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* GRN Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Supplier *</label>
                  <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-blue transition-all">
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.company || 'N/A'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Invoice / Reference No *</label>
                  <input required value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-blue" placeholder="e.g. INV-12345" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Date Received</label>
                  <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Store Assignment</label>
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-500 font-semibold italic">
                    {stores.find(s => s._id === selectedStoreId)?.name || 'Please select a store from top bar'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-dark-navy">Item List</h3>
                  <button type="button" onClick={addLine} className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="md:col-span-5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Product</label>
                        <select required value={item.productId} onChange={(e) => updateLine(idx, { productId: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm">
                          <option value="">Select Product</option>
                          {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qty</label>
                        <input type="number" min="1" required value={item.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cost</label>
                        <input type="number" min="0" step="0.01" required value={item.unitCost} onChange={(e) => updateLine(idx, { unitCost: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Total</label>
                        <div className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-2 px-3 text-sm font-bold text-primary-blue text-center">
                          Rs. {(item.qty * item.unitCost).toFixed(2)}
                        </div>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button type="button" onClick={() => removeLine(idx)} disabled={items.length === 1} className="p-2 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <span className="font-bold">Total GRN Value</span>
                <span className="text-xl font-bold">Rs. {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>

              <button type="submit" disabled={saving || selectedStoreId === 'all'} className="w-full bg-primary-blue text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 shadow-xl shadow-emerald-50 transition-all disabled:opacity-50">
                {saving ? 'Processing GRN...' : 'Post GRN & Update Inventory'}
              </button>
            </form>
          </div>

          {/* GRN History & Search */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-dark-navy mb-4 flex items-center gap-2">
                <Search size={16} className="text-primary-blue" /> Quick Search
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter GRN Number..." 
                  value={grnSearch}
                  onChange={(e) => setGrnSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGrnSearch()}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-blue"
                />
                <button onClick={handleGrnSearch} className="bg-primary-blue text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="text-sm font-bold text-dark-navy">Recent GRNs</h3>
                <FileText size={16} className="text-gray-300" />
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {history.map((r) => {
                  const total = (r.items || []).reduce((s, it) => s + (it.qty * Number(it.unitCost || 0)), 0);
                  return (
                    <div key={r._id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => setViewGrn(r)}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-primary-blue">{r.grnNumber}</span>
                        <span className="text-[10px] text-muted-text">{new Date(r.receivedAt || r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs font-bold text-dark-navy truncate">{r.supplierId?.name || 'Unknown Supplier'}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] bg-indigo-50 text-primary-blue px-2 py-0.5 rounded-full font-bold">Rs. {total.toLocaleString()}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setViewGrn(r); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="View"><Eye size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); printVoucher(r); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Print"><Printer size={14} /></button>
<<<<<<< HEAD
                          <button onClick={(e) => handleDeleteClick(r._id, e)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={14} /></button>
=======
                          <button onClick={(e) => handleDeleteGRN(r._id, e)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={14} /></button>
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
                        </div>
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && <div className="p-8 text-center text-xs text-muted-text">No records found</div>}
              </div>
            </div>
          </div>
        </div>

        {/* View Modal */}
        {viewGrn && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setViewGrn(null)}>
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h2 className="text-lg font-bold text-dark-navy">GRN Information</h2>
                  <p className="text-xs text-primary-blue font-bold">{viewGrn.grnNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => printVoucher(viewGrn)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                    <Printer size={14} /> Print Voucher
                  </button>
                  <button onClick={() => setViewGrn(null)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={20} /></button>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Supplier</div>
                      <div className="text-sm font-bold text-dark-navy">{viewGrn.supplierId?.name || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date</div>
                      <div className="text-sm font-bold text-dark-navy">{new Date(viewGrn.receivedAt || viewGrn.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Invoice</div>
                      <div className="text-sm font-bold text-dark-navy">{viewGrn.invoiceNo || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Items</div>
                      <div className="text-sm font-bold text-dark-navy">{viewGrn.items?.length || 0}</div>
                    </div>
                 </div>

                 <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="pb-3 font-bold uppercase text-[10px]">#</th>
                        <th className="pb-3 font-bold uppercase text-[10px]">Product Description</th>
                        <th className="pb-3 font-bold uppercase text-[10px] text-center">Qty</th>
                        <th className="pb-3 font-bold uppercase text-[10px] text-right">Unit Cost</th>
                        <th className="pb-3 font-bold uppercase text-[10px] text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {viewGrn.items.map((it, i) => (
                        <tr key={i}>
                          <td className="py-4 text-xs">{i+1}</td>
                          <td className="py-4 font-bold text-dark-navy">{it.productId?.name || 'N/A'}</td>
                          <td className="py-4 text-center font-bold text-indigo-600">{it.qty}</td>
                          <td className="py-4 text-right">Rs. {Number(it.unitCost).toLocaleString()}</td>
                          <td className="py-4 text-right font-bold">Rs. {(it.qty * Number(it.unitCost)).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50/50">
                        <td colSpan={4} className="py-4 px-4 text-right font-bold text-gray-500">Grand Total</td>
                        <td className="py-4 px-4 text-right font-bold text-primary-blue text-lg">
                          Rs. {viewGrn.items.reduce((s,it) => s + (it.qty * Number(it.unitCost)), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                 </table>
                 
                 {viewGrn.notes && (
                   <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                     <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Internal Notes</div>
                     <p className="text-xs text-amber-800 italic">{viewGrn.notes}</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName="this GRN"
      />
    </DashboardLayout>
  );
};

const ArrowRight = ({ size, className }) => <FileText size={size} className={className} />;

export default AdminGRN;
