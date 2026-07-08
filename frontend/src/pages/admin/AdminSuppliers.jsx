import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Users, Phone, Mail, MapPin, Building, DollarSign, Wallet, ArrowRight, Landmark } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getStores } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import useAdminStoreStore from '../../store/adminStoreStore';

const emptyForm = {
  name: '', company: '', contactPerson: '', email: '', phone: '', address: '', taxId: '', notes: '', status: 'active', storeId: '',
  bankName: '', bankBranch: '', bankAccountNumber: '', bankAccountName: '', allStores: false
};

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectedStoreId } = useAdminStoreStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const [suppRes, storesRes] = await Promise.all([
        getSuppliers({ storeId: storeParam }), 
        getStores()
      ]);
      setSuppliers(suppRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load suppliers';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStoreId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, storeId: selectedStoreId !== 'all' ? selectedStoreId : '' });
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name || '',
      company: supplier.company || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      notes: supplier.notes || '',
      status: supplier.status || 'active',
      storeId: supplier.storeId?._id || supplier.storeId || '',
      bankName: supplier.bankName || '',
      bankBranch: supplier.bankBranch || '',
      bankAccountNumber: supplier.bankAccountNumber || '',
      bankAccountName: supplier.bankAccountName || '',
      allStores: supplier.allStores || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.allStores && !form.storeId) {
        toast.error('Store assignment is required');
        setSaving(false);
        return;
      }

      if (editingId) {
        await updateSupplier(editingId, form);
        toast.success('Supplier updated');
      } else {
        await createSupplier(form);
        toast.success('Supplier added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (supplier) => {
    setItemToDelete({ id: supplier._id, name: supplier.name });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteSupplier(itemToDelete.id);
      toast.success('Supplier removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete supplier');
    }
  };

  const filtered = suppliers.filter((s) => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Supplier Management">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Supplier Management">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Users className="text-primary-blue" /> Suppliers
            </h1>
            <p className="text-muted-text text-sm mt-1">{suppliers.length} active supply partners</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all">
            <Plus size={18} /> Add Supplier
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-white/20 rounded-xl"><Users size={20} /></div>
               <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">TOTAL</span>
             </div>
             <h3 className="text-3xl font-bold">{suppliers.length}</h3>
             <p className="text-indigo-100 text-xs mt-1">Registered Suppliers</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Wallet size={20} /></div>
               <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">ESTIMATED</span>
             </div>
             <h3 className="text-2xl font-bold text-dark-navy">Rs. {suppliers.reduce((s,su) => s + (su.outstandingBalance || 0), 0).toLocaleString()}</h3>
             <p className="text-muted-text text-xs mt-1">Total Outstanding Balance</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center border-dashed border-2 text-muted-text">
             <div className="text-center">
               <p className="text-xs">Manage payments in</p>
               <button className="text-primary-blue font-bold text-sm mt-1 flex items-center gap-1 hover:underline">
                 Supplier Payments <ArrowRight size={14} />
               </button>
             </div>
           </div>
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-96 border border-card-border rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((supplier) => {
            const storeObj = stores.find(s => s._id === (supplier.storeId?._id || supplier.storeId));
            const storeName = supplier.allStores ? 'All Stores' : (storeObj?.name || 'Local Store');
            
            return (
              <div key={supplier._id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary-blue font-bold text-xl group-hover:scale-110 transition-transform">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-dark-navy text-lg leading-tight">{supplier.name}</h3>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${supplier.allStores ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {storeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-text mt-1">
                          <Building size={12} /> {supplier.company || 'Private Supplier'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(supplier)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-primary-blue hover:bg-indigo-50 transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteClick(supplier)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-text">
                        <Phone size={14} className="text-gray-300 flex-shrink-0" /> {supplier.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-text">
                        <Mail size={14} className="text-gray-300 flex-shrink-0" /> {supplier.email || 'No email'}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-xs text-muted-text">
                        <MapPin size={14} className="text-gray-300 mt-0.5 flex-shrink-0" /> {supplier.address || 'No address'}
                      </div>
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  {supplier.bankAccountNumber ? (
                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl flex items-start gap-2.5 text-xs text-muted-text border border-gray-100">
                      <Landmark size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-dark-navy">{supplier.bankName || 'Bank Account'}</p>
                        <p className="font-mono mt-0.5 truncate">{supplier.bankAccountNumber} ({supplier.bankBranch || 'No Branch'})</p>
                        {supplier.bankAccountName && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">A/C: {supplier.bankAccountName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-gray-50/50 rounded-2xl text-center text-xs text-gray-400 border border-gray-100 border-dashed">
                      No Bank Account Linked
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="text-gray-400 mb-1">Outstanding Balance</p>
                    <p className={`font-bold text-lg ${supplier.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      Rs. {Number(supplier.outstandingBalance || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${supplier.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                    {supplier.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-dark-navy">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Supplier Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Company Name</label>
                    <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Samsung Distribution" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone Number</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="07XXXXXXXX" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email Address</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="supplier@example.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Address</label>
                    <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm resize-none" placeholder="Enter physical address..." />
                  </div>
                  
                  <div className="md:col-span-2 flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      id="allStores" 
                      checked={form.allStores} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({ 
                          ...form, 
                          allStores: checked, 
                          storeId: checked ? '' : (selectedStoreId !== 'all' ? selectedStoreId : '') 
                        });
                      }}
                      className="w-4 h-4 text-primary-blue rounded border-gray-300 focus:ring-primary-blue"
                    />
                    <label htmlFor="allStores" className="text-xs font-bold text-dark-navy uppercase cursor-pointer select-none">
                      Global Supplier (Supplies to All Stores)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Store Assignment {!form.allStores && '*'}</label>
                    <select 
                      required={!form.allStores}
                      disabled={form.allStores || selectedStoreId !== 'all'}
                      value={form.allStores ? '' : form.storeId} 
                      onChange={(e) => setForm({ ...form, storeId: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm disabled:opacity-50"
                    >
                      <option value="">{form.allStores ? 'All Stores Scoped' : 'Select Store'}</option>
                      {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-dark-navy uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Landmark size={14} className="text-primary-blue" /> Bank Account Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bank Name</label>
                        <input 
                          value={form.bankName} 
                          onChange={(e) => setForm({ ...form, bankName: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                          placeholder="e.g. Commercial Bank" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Branch Name</label>
                        <input 
                          value={form.bankBranch} 
                          onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                          placeholder="e.g. Colombo 03" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Number</label>
                        <input 
                          value={form.bankAccountNumber} 
                          onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                          placeholder="e.g. 1009123456" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Holder Name</label>
                        <input 
                          value={form.bankAccountName} 
                          onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                          placeholder="e.g. Samsung Lanka Pvt Ltd" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                    {saving ? 'Saving...' : editingId ? 'Update Supplier' : 'Add Supplier'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-8 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name}
      />
    </DashboardLayout>
  );
};

export default AdminSuppliers;
