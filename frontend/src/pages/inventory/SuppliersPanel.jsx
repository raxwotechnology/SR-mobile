import { useEffect, useMemo, useState } from 'react';
import { Edit2, Landmark, Plus, Search, Trash2, X } from 'lucide-react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../../services/api';

const emptyForm = { 
  name: '', email: '', phone: '', address: '', status: 'active',
  bankName: '', bankBranch: '', bankAccountNumber: '', bankAccountName: '', allStores: false
};

const SuppliersPanel = ({ storeId, stores = [], onStoreChange }) => {
  const user = useAuthStore((s) => s.user);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (user?.role === 'admin' && storeId) params.storeId = storeId;
      const { data } = await getSuppliers(params);
      setSuppliers(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // For admins, wait until a store is selected before querying store-scoped supplier data.
    if (user?.role === 'admin' && !storeId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    fetchSuppliers();
  }, [storeId, user?.role]);

  const filtered = useMemo(
    () => suppliers.filter((s) => (s.name || '').toLowerCase().includes(search.toLowerCase())),
    [suppliers, search]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      status: s.status || 'active',
      bankName: s.bankName || '',
      bankBranch: s.bankBranch || '',
      bankAccountNumber: s.bankAccountNumber || '',
      bankAccountName: s.bankAccountName || '',
      allStores: s.allStores || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    const effectiveStoreId = storeId || stores[0]?._id || '';
    if (user?.role === 'admin' && !effectiveStoreId && !form.allStores) {
      toast.error('Please select a store');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (user?.role === 'admin') {
        payload.storeId = form.allStores ? null : effectiveStoreId;
        if (!form.allStores && !storeId && effectiveStoreId) onStoreChange?.(effectiveStoreId);
      }
      if (editingId) {
        await updateSupplier(editingId, payload);
        toast.success('Supplier updated');
      } else {
        await createSupplier(payload);
        toast.success('Supplier created');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (supplier) => {
    setItemToDelete(supplier);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteSupplier(itemToDelete._id);
      toast.success('Supplier deleted');
      fetchSuppliers();
      setDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete supplier');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-dark-navy">Suppliers</h2>
          <p className="text-muted-text text-sm mt-1">{suppliers.length} suppliers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600">
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {user?.role === 'admin' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-dark-navy mb-1">Store *</label>
          <select
            value={storeId || ''}
            onChange={(e) => onStoreChange?.(e.target.value)}
            className="w-full sm:w-80 border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white"
          >
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          {!storeId && (
            <p className="text-xs text-amber-700 mt-1">Please select a store before creating a supplier.</p>
          )}
        </div>
      )}

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-muted-text">Supplier</th>
                <th className="text-left px-6 py-3 font-medium text-muted-text">Contact</th>
                <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {filtered.map((s) => {
                const storeObj = stores.find(st => st._id === (s.storeId?._id || s.storeId));
                const storeName = s.allStores ? 'All Stores' : (storeObj?.name || 'Local Store');
                
                return (
                  <tr key={s._id}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-dark-navy">{s.name}</div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${s.allStores ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {storeName}
                        </span>
                      </div>
                      <div className="text-xs text-muted-text">{s.address || '—'}</div>
                      {s.bankAccountNumber && (
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Landmark size={10} /> {s.bankName} - {s.bankAccountNumber} ({s.bankBranch})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-muted-text">
                      <div className="text-xs">{s.email || '—'}</div>
                      <div className="text-xs">{s.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteClick(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-text">No suppliers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-gray-50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-gray-50" />
                </div>
                
                {user?.role === 'admin' && (
                  <div className="sm:col-span-2 flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      id="panelAllStores" 
                      checked={form.allStores} 
                      onChange={(e) => setForm({ ...form, allStores: e.target.checked })}
                      className="w-4 h-4 text-primary-blue rounded border-gray-300 focus:ring-primary-blue"
                    />
                    <label htmlFor="panelAllStores" className="text-xs font-bold text-dark-navy uppercase cursor-pointer select-none">
                      Global Supplier (Supplies to All Stores)
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                  <h4 className="text-xs font-bold text-dark-navy uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Landmark size={12} className="text-primary-blue" /> Bank Account
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                      <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-gray-50" placeholder="Commercial Bank" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Branch Name</label>
                      <input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-gray-50" placeholder="Colombo 03" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                      <input value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-gray-50" placeholder="1009123456" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Name</label>
                      <input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-gray-50" placeholder="Samsung Lanka" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Supplier' : 'Create Supplier'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name || 'this supplier'}
      />
    </div>
  );
};

export default SuppliersPanel;

