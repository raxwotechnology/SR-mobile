import { useState, useEffect } from 'react';
import { Plus, X, Trash2, ToggleLeft, ToggleRight, Tag, Gift, Percent, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { adminNavGroups as navItems } from './adminNavItems';
import { getPromotions, createPromotion, deletePromotion, togglePromotion } from '../../services/api';
import { toast } from 'react-toastify';

const PROMO_TYPES = [
  { value: 'percentage', label: 'Percentage Off', icon: '🏷️' },
  { value: 'fixed', label: 'Fixed Amount Off', icon: '💰' },
  { value: 'bogo', label: 'Buy One Get One', icon: '🎁' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y Free', icon: '🛒' },
];

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'percentage', discountValue: '', buyQuantity: '',
    getQuantity: '', startDate: '', endDate: '', description: '',
    minOrderAmount: '', maxDiscountAmount: '',
  });

  const fetchPromotions = async () => {
    try {
      const { data } = await getPromotions();
      setPromotions(data);
    } catch (err) {
      toast.error('Failed to load promotions');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPromotions(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createPromotion({
        name: form.name,
        type: form.type,
        discountValue: Number(form.discountValue),
        buyQuantity: Number(form.buyQuantity) || 0,
        getQuantity: Number(form.getQuantity) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        conditions: {
          minOrderAmount: Number(form.minOrderAmount) || 0,
          maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        },
      });
      toast.success('Promotion created!');
      setShowModal(false);
      setForm({ name: '', type: 'percentage', discountValue: '', buyQuantity: '', getQuantity: '', startDate: '', endDate: '', description: '', minOrderAmount: '', maxDiscountAmount: '' });
      fetchPromotions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleToggle = async (id) => {
    try {
      await togglePromotion(id);
      toast.success('Status updated');
      fetchPromotions();
    } catch (err) { toast.error('Failed'); }
  };

  const handleDeleteClick = (promotion) => {
    setItemToDelete(promotion);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePromotion(itemToDelete._id);
      toast.success('Deleted');
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchPromotions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const isExpired = (endDate) => new Date(endDate) < new Date();
  const isUpcoming = (startDate) => new Date(startDate) > new Date();

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const activeCount = promotions.filter(p => p.isActive && !isExpired(p.endDate)).length;
  const expiredCount = promotions.filter(p => isExpired(p.endDate)).length;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">🎉 Promotions</h1>
            <p className="text-muted-text text-sm mt-1">{promotions.length} total • {activeCount} active • {expiredCount} expired</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 text-sm">
            <Plus size={18} /> New Promotion
          </button>
        </div>

        {/* Promotions Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map(p => {
            const expired = isExpired(p.endDate);
            const upcoming = isUpcoming(p.startDate);
            const typeInfo = PROMO_TYPES.find(t => t.value === p.type) || PROMO_TYPES[0];
            return (
              <div key={p._id} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${expired ? 'opacity-60 border-gray-200' : p.isActive ? 'border-emerald-200' : 'border-card-border'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold text-dark-navy">{p.name}</h3>
                      <p className="text-xs text-muted-text">{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggle(p._id)} title={p.isActive ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg hover:bg-gray-100">
                      {p.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                    </button>
                    <button onClick={() => handleDeleteClick(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Value Display */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  {p.type === 'percentage' && <span className="text-xl font-bold text-dark-navy">{p.discountValue}% OFF</span>}
                  {p.type === 'fixed' && <span className="text-xl font-bold text-dark-navy">Rs. {p.discountValue} OFF</span>}
                  {p.type === 'bogo' && <span className="text-xl font-bold text-dark-navy">Buy 1 Get 1 Free</span>}
                  {p.type === 'buy_x_get_y' && <span className="text-xl font-bold text-dark-navy">Buy {p.buyQuantity} Get {p.getQuantity} Free</span>}
                </div>

                {p.description && <p className="text-xs text-muted-text mb-2">{p.description}</p>}

                <div className="flex items-center gap-2 text-xs text-muted-text mb-2">
                  <Calendar size={12} />
                  <span>{new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {expired && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>}
                  {upcoming && !expired && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Upcoming</span>}
                  {!expired && !upcoming && p.isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>}
                  {!p.isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Disabled</span>}
                  {p.conditions?.minOrderAmount > 0 && <span className="text-xs text-muted-text">Min: Rs.{p.conditions.minOrderAmount}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {promotions.length === 0 && <div className="text-center py-16 text-muted-text"><Gift size={48} className="mx-auto mb-3 text-gray-300" /><p>No promotions yet</p></div>}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-dark-navy">New Promotion</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Weekend Special" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROMO_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm({...form, type: t.value})}
                      className={`p-3 rounded-xl border text-sm font-medium text-left flex items-center gap-2 transition-all ${
                        form.type === t.value ? 'border-primary-blue bg-emerald-50 text-emerald-700' : 'border-card-border hover:border-emerald-200'
                      }`}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">
                    {form.type === 'percentage' ? 'Discount %' : form.type === 'fixed' ? 'Discount Amount (Rs.)' : 'Discount Value'} *
                  </label>
                  <input type="number" required min="0" value={form.discountValue} onChange={(e) => setForm({...form, discountValue: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                {form.type === 'buy_x_get_y' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-dark-navy mb-1">Buy Qty</label>
                      <input type="number" min="1" value={form.buyQuantity} onChange={(e) => setForm({...form, buyQuantity: e.target.value})}
                        className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-navy mb-1">Get Qty Free</label>
                      <input type="number" min="1" value={form.getQuantity} onChange={(e) => setForm({...form, getQuantity: e.target.value})}
                        className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Min Order (Rs.)</label>
                  <input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({...form, minOrderAmount: e.target.value})}
                    placeholder="0" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Start Date *</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">End Date *</label>
                  <input type="date" required value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  rows="2" placeholder="Optional description..." className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-blue text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 text-sm">Create Promotion</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl text-muted-text hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName="this promotion"
      />
    </DashboardLayout>
  );
};

export default AdminPromotions;
