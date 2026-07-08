import { useState, useEffect } from 'react';
import { Trash2, Search, ToggleLeft, ToggleRight, Plus, Edit, X, Upload, CheckCircle, Eye, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminUsers, createUser, updateUser, toggleUserStatus, deleteUser, uploadImage, uploadDocument, getAdminStores } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { getImageUrl } from '../../utils/imageHelper';
import useAuthStore from '../../store/authStore';

const roleColors = {
  customer: 'bg-sky-100 text-sky-700',
  manager: 'bg-amber-100 text-amber-700',
  admin: 'bg-violet-100 text-violet-700',
  cashier: 'bg-teal-100 text-teal-700',
  deliveryGuy: 'bg-blue-100 text-blue-700',
  stockEmployee: 'bg-orange-100 text-orange-700',
};

const AdminUsers = () => {
  const { user, setUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { selectedStoreId } = useAdminStoreStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', role: 'cashier', assignedStore: '', avatar: '',
    employeeInfo: { nic: '', salary: '', status: 'active' },
    permissions: { inventory: false, finance: false, products: false, sales: false, reports: false, employees: false, suppliers: false, customers: false },
    agreements: []
  });
  const [uploading, setUploading] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await getAdminUsers(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {});
      setUsers(data);
    } catch (err) { toast.error('Failed to load users'); } 
    finally { setLoading(false); }
  };

  const fetchStores = async () => {
    try {
      const { data } = await getAdminStores();
      setStores(data.stores || data);
    } catch (err) { console.error('Failed to load stores', err); }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchStores();
  }, [selectedStoreId]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '', email: user.email || '', password: '', phone: user.phone || '', 
        role: user.role || 'cashier', assignedStore: user.assignedStore?._id || user.assignedStore || '', 
        avatar: user.avatar || '',
        employeeInfo: { 
          nic: user.employeeInfo?.nic || '', 
          salary: user.employeeInfo?.salary || '', 
          status: user.employeeInfo?.status || 'active' 
        },
        permissions: user.permissions || { inventory: false, finance: false, products: false, sales: false, reports: false, employees: false, suppliers: false, customers: false },
        agreements: user.agreements || []
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '', email: '', password: '', phone: '', role: 'cashier', assignedStore: selectedStoreId !== 'all' ? selectedStoreId : '', avatar: '',
        employeeInfo: { nic: '', salary: '', status: 'active' },
        permissions: { inventory: false, finance: false, products: false, sales: false, reports: false, employees: false, suppliers: false, customers: false },
        agreements: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Only send password if changed
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        const { data: updatedUser } = await updateUser(editingUser._id, payload);
        if (updatedUser && updatedUser._id === user?._id) {
          setUser({ ...user, ...updatedUser });
        }
        toast.success('User updated successfully');
      } else {
        await createUser(formData);
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleToggleStatus = (userId, userName, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    setUserToToggle({ id: userId, name: userName, action });
    setToggleModalOpen(true);
  };

  const handleToggleConfirm = async () => {
    if (!userToToggle) return;
    try {
      await toggleUserStatus(userToToggle.id);
      toast.success(`User ${userToToggle.action}d successfully`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to toggle status');
    } finally {
      setToggleModalOpen(false);
      setUserToToggle(null);
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (user) => {
    setItemToDelete({ id: user._id, name: user.name });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteUser(itemToDelete.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error('Failed to delete user'); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const { data } = await uploadImage(fd);
      setFormData(prev => ({ ...prev, avatar: data.url }));
      toast.success('Photo uploaded');
    } catch (err) { toast.error('Failed to upload photo'); }
    finally { setUploading(false); }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('document', file);
      const { data } = await uploadDocument(fd);
      setFormData(prev => ({ 
        ...prev, 
        agreements: [...prev.agreements, { name: data.name, url: data.url, uploadedAt: new Date() }] 
      }));
      toast.success('Document uploaded');
    } catch (err) { toast.error('Failed to upload document'); }
    finally { setUploading(false); }
  };

  const handleRemoveDocument = (index) => {
    const newAgreements = [...formData.agreements];
    newAgreements.splice(index, 1);
    setFormData(prev => ({ ...prev, agreements: newAgreements }));
  };

  const handlePermissionChange = (perm) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] }
    }));
  };

  const filtered = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive !== false : u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.isActive !== false).length;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Employee & User Management</h1>
            <p className="text-muted-text text-sm mt-1">{users.length} total · {activeCount} active</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <Plus size={18} /> Add Employee
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-2xl border border-card-border shadow-sm">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500">
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="deliveryGuy">Delivery</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Employee / User</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Contact</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Role</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Status</th>
                    <th className="text-right px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {user.avatar ? (
                            <img src={getImageUrl(user.avatar)} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            {user.employeeInfo?.nic && <p className="text-xs text-slate-500 font-mono">NIC: {user.employeeInfo.nic}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-700">{user.email}</p>
                        <p className="text-xs text-slate-500">{user.phone || 'No phone'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.isActive !== false ? 'active' : 'inactive'}
                          onChange={() => handleToggleStatus(user._id, user.name, user.isActive !== false)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer ${
                            user.isActive !== false 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleOpenModal(user)} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" title="View / Edit Details"><Eye size={16} /></button>
                        <button onClick={() => handleDeleteClick(user)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="text-center py-12 text-slate-500 font-medium">No users found matching your filters.</div>}
            </div>
          </div>
        )}

        {/* Modal for Add/Edit Employee */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-slate-900">{editingUser ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-500" /></button>
              </div>
              
              <form onSubmit={handleSaveUser} className="p-8 space-y-8">
                
                {/* Profile Photo */}
                <div className="flex items-center gap-6">
                  {formData.avatar ? (
                    <div className="relative">
                      <img src={getImageUrl(formData.avatar)} alt="Profile" className="w-24 h-24 rounded-2xl object-cover shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md z-20 transition-all hover:scale-110"
                        title="Delete Photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <Upload size={32} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Profile Photo</h3>
                    <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-xl cursor-pointer shadow-sm transition-all text-sm inline-block">
                      {uploading ? 'Uploading...' : 'Upload Image'}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Basic Info</h3>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Password {editingUser && '(Leave blank to keep current)'}</label><input type={editingUser ? "password" : "text"} required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Phone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  </div>

                  {/* Employment Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Employment Details</h3>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                      <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                        <option value="customer">Customer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                        <option value="deliveryGuy">Delivery Guy</option>
                        <option value="stockEmployee">Stock Employee</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Assigned Branch/Store</label>
                      <select value={formData.assignedStore} onChange={e => setFormData({...formData, assignedStore: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                        <option value="">None (Global)</option>
                        {stores.map(s => <option key={s._id} value={s._id}>{s.name} - {s.city}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">NIC / Passport</label><input value={formData.employeeInfo.nic} onChange={e => setFormData({...formData, employeeInfo: {...formData.employeeInfo, nic: e.target.value}})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Salary (Monthly)</label><input type="number" value={formData.employeeInfo.salary} onChange={e => setFormData({...formData, employeeInfo: {...formData.employeeInfo, salary: e.target.value}})} className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  </div>
                </div>

                {/* Documents & Agreements */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Agreements & Documents</h3>
                    <label className="bg-white border border-slate-200 hover:bg-slate-100 text-blue-600 font-bold py-1.5 px-4 rounded-lg cursor-pointer shadow-sm transition-all text-sm flex items-center gap-2">
                      <Upload size={16} /> {uploading ? 'Uploading...' : 'Add Document'}
                      <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleDocumentUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  {formData.agreements.length > 0 ? (
                    <div className="space-y-3">
                      {formData.agreements.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-sm flex items-center gap-2">
                            📄 {doc.name}
                          </a>
                          <button type="button" onClick={() => handleRemoveDocument(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No documents uploaded yet.</p>
                  )}
                </div>

                {/* Granular Permissions */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Module Access Permissions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {['inventory', 'finance', 'products', 'sales', 'reports', 'employees', 'suppliers', 'customers'].map((perm) => (
                      <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.permissions[perm] ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                          {formData.permissions[perm] && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold text-slate-700 capitalize">{perm}</span>
                        <input type="checkbox" className="hidden" checked={formData.permissions[perm] || false} onChange={() => handlePermissionChange(perm)} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={uploading} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                    {editingUser ? 'Save Changes' : 'Create Employee'}
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

      {/* Toggle Status Confirmation Modal */}
      {toggleModalOpen && userToToggle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${userToToggle.action === 'deactivate' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg capitalize">{userToToggle.action} User</h3>
                <p className="text-xs text-slate-500 font-medium">Confirm status change</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 font-medium mb-6">
              Are you sure you want to <span className="font-bold text-slate-800">{userToToggle.action}</span> the employee account for <span className="font-bold text-dark-navy">"{userToToggle.name}"</span>?
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => { setToggleModalOpen(false); setUserToToggle(null); }} 
                className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleToggleConfirm} 
                className={`px-6 py-2.5 text-white font-bold rounded-xl shadow-md transition-all text-sm ${
                  userToToggle.action === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
