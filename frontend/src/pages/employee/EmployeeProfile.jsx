import { useState, useEffect } from 'react';
import { LayoutDashboard, User, Clock, Calendar, CreditCard, Mail, Phone, MapPin, Building, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API, { uploadImage } from '../../services/api';
import { toast } from 'react-toastify';
import { getImageUrl } from '../../utils/imageHelper';

const EmployeeProfile = () => {
  const { user, setUser } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const roleLabel = user?.role === 'deliveryGuy' ? 'Delivery Rider' : user?.role === 'cashier' ? 'Cashier' : user?.role;

  const handleSavePhone = async () => {
    setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', { phone });
      setUser(data);
      toast.success('Phone updated!');
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const { data: uploadData } = await uploadImage(fd);
      
      const { data: profileData } = await API.put('/auth/profile', { avatar: uploadData.url });
      setUser(profileData);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Failed to update photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const { data: profileData } = await API.put('/auth/profile', { avatar: '' });
      setUser(profileData);
      toast.success('Profile photo removed!');
    } catch (err) {
      toast.error('Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-dark-navy">👤 My Profile</h1>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative group">
              {user?.avatar ? (
                <>
                  <img src={getImageUrl(user.avatar)} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-md" />
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md z-20 transition-all hover:scale-110"
                    title="Delete Photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              ) : (
                <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold backdrop-blur-sm border-4 border-white/20 shadow-md">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <span className="text-white text-xs font-bold">{uploading ? '...' : 'Change'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-bold">{user?.name}</h2>
              <p className="text-violet-100 font-medium">{roleLabel}</p>
              <p className="text-violet-200 text-sm mt-1">Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><User size={18} /> Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-text block mb-1">Full Name</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <User size={14} className="text-gray-400" /> {user?.name}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Email</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <Mail size={14} className="text-gray-400" /> {user?.email}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Phone</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Phone size={14} className="text-gray-400 ml-3" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" placeholder="+94 7X XXX XXXX" />
                </div>
                <button onClick={handleSavePhone} disabled={saving}
                  className="bg-primary-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
                  <Save size={14} /> {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Role</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <Building size={14} className="text-gray-400" /> {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Building size={18} /> Employment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-text block mb-1">Department</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.department || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Joined</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.joinDate ? new Date(user.employeeInfo.joinDate).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">EPF Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.epfNo || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">ETF Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.etfNo || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Bank</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.bankName || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Account Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.bankAccount ? `****${user.employeeInfo.bankAccount.slice(-4)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4">
             <div className="text-center space-y-2">
               <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                 ⚠️
               </div>
               <h3 className="font-extrabold text-slate-900 text-lg">Delete Profile Photo</h3>
               <p className="text-sm text-slate-500">Are you sure you want to permanently delete your profile photo?</p>
             </div>
             <div className="flex gap-3 justify-center pt-2">
               <button
                 type="button"
                 onClick={() => setShowDeleteConfirm(false)}
                 className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 text-slate-600 transition-colors"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={() => {
                   setShowDeleteConfirm(false);
                   handleRemoveAvatar();
                 }}
                 className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md transition-colors"
               >
                 Delete
               </button>
             </div>
           </div>
         </div>
       )}
    </DashboardLayout>
  );
};

export default EmployeeProfile;
