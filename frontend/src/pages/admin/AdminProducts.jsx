import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, Package, Eye } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminProducts, getCategories, getStores, createProduct, updateProduct, deleteProduct, getSuppliers } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import SuppliersPanel from '../inventory/SuppliersPanel';
import StockReceivingPanel from '../inventory/StockReceivingPanel';
import SupplierReturnsPanel from '../inventory/SupplierReturnsPanel';
import { getImageUrl, handleImageError, isDirectImageUrl, convertExternalUrl } from '../../utils/imageHelper';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const emptyForm = {
  name: '', categoryId: '', description: '', price: '', minPrice: '', mrp: '', discount: '', unit: 'kg',
  stock: '', purchasePrice: '', images: '', isFeatured: false, isOnSale: false, allowKokoOnline: true, allowKokoPos: true, status: 'active', storeId: '', productLink: '', supplierId: '',
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | suppliers | receiving | supplierReturns
  const { selectedStoreId, setSelectedStoreId } = useAdminStoreStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedProduct, setExpandedProduct] = useState(null);

  // Password confirmation states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const [prodRes, catRes, storesRes, suppRes] = await Promise.all([
        getAdminProducts({ storeId: storeParam }), 
        getCategories(), 
        getStores(),
        getSuppliers().catch(() => ({ data: [] }))
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);
      setSuppliers(suppRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load products';
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

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      categoryId: product.categoryId?._id || '',
      description: product.description || '',
      price: product.price || '',
      minPrice: product.minPrice || '',
      mrp: product.mrp || '',
      discount: product.discount || '',
      unit: product.unit || 'kg',
      stock: product.stock || 0,
      purchasePrice: product.avgCost || product.lastCost || '',
      images: (product.images || []).join(', '),
      isFeatured: !!product.isFeatured,
      isOnSale: !!product.isOnSale,
      allowKokoOnline: product.allowKokoOnline !== false,
      allowKokoPos: product.allowKokoPos !== false,
      status: product.status || 'active',
      storeId: product.storeId?._id || '',
      productLink: product.productLink || '',
      supplierId: product.supplierId?._id || product.supplierId || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImages = form.images ? form.images.split(',').map((s) => {
        const trimmed = s.trim();
        const converted = convertExternalUrl(trimmed);
        if (converted && converted !== trimmed) {
          toast.info('External link auto-converted ✅');
        }
        return converted || trimmed;
      }).filter(Boolean) : [];
      // Ensure productLink is always the first image in the array if it exists
      if (form.productLink) {
        finalImages = finalImages.filter(url => url !== form.productLink);
        finalImages.unshift(form.productLink);
      }

      // Validate store is valid selection
      const storeExists = stores.find(s => s._id === form.storeId);
      if (!storeExists) {
        toast.error('Please select a valid store from the suggestions');
        setSaving(false);
        return;
      }

      // Check minPrice validation
      if (form.minPrice && Number(form.price) < Number(form.minPrice)) {
        toast.error('Selling price cannot be lower than the configured minimum price');
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        price: Number(form.price),
        minPrice: Number(form.minPrice) || 0,
        mrp: Number(form.mrp) || Number(form.price),
        discount: Number(form.discount) || 0,
        stock: Number(form.stock),
        purchasePrice: Number(form.purchasePrice) || 0,
        images: finalImages,
        supplierId: form.supplierId && form.supplierId !== 'none' ? form.supplierId : null,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (product) => {
    setItemToDelete({ id: product._id, name: product.name });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteProduct(itemToDelete.id);
      toast.success('Product deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = products.filter((p) => {
    const matchesSearch = (p?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryId?._id === categoryFilter;
    return matchesSearch && matchesCategory;
  });


  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'products', label: 'Products' },
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'receiving', label: 'Stock Receiving' },
              { id: 'supplierReturns', label: 'Supplier Returns' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  activeTab === t.id ? 'bg-primary-blue text-white' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'suppliers' && (
          <SuppliersPanel storeId={selectedStoreId !== 'all' ? selectedStoreId : ''} stores={stores} onStoreChange={(id) => setSelectedStoreId(id)} />
        )}
        {activeTab === 'receiving' && (
          <StockReceivingPanel
            storeId={selectedStoreId !== 'all' ? selectedStoreId : ''}
            products={products}
          />
        )}
        {activeTab === 'supplierReturns' && (
          <SupplierReturnsPanel
            storeId={selectedStoreId !== 'all' ? selectedStoreId : ''}
            products={products}
          />
        )}

        {activeTab === 'products' && (
          <>
        {error && <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Products</h1>
            <p className="text-muted-text text-sm mt-1">{products.length} total products</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600">
            <Plus size={18} /> Add Product
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                categoryFilter === 'all' ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-muted-text hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setCategoryFilter(cat._id)}
                className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                  categoryFilter === cat._id ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-muted-text hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>


        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Store</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Price</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((product) => {
                  const isExpanded = expandedProduct === product._id;
                  return (
                    <React.Fragment key={product._id}>
                      <tr>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400"
                              title="Show price rows"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                              {(product.productLink || product.images?.[0]) ? (
                                <img 
                                  src={getImageUrl(product.productLink || product.images?.[0])} 
                                  className="w-full h-full object-cover" 
                                  alt="" 
                                  onError={(e) => handleImageError(e, 'Product')}
                                />
                              ) : <Package size={18} />}
                            </div>
                            <div>
                              <div className="font-medium text-dark-navy">{product.name}</div>
                              <div className="text-xs text-muted-text">{product.categoryId?.name || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-muted-text">{product.storeId?.name || '-'}</td>
                        <td className="px-6 py-3.5">Rs. {Number(product.price || 0).toFixed(2)}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold">{product.stock}</span>
                          {product.priceRows?.length > 0 && (
                            <span className="ml-1 text-xs text-indigo-500">({product.priceRows.length} rows)</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="View / Edit Details"><Eye size={16} /></button>
                            <button onClick={() => handleDeleteClick(product)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {/* Price Rows Expansion */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-8 pb-4 pt-0 bg-indigo-50/50">
                            <div className="rounded-xl border border-indigo-100 bg-white p-4">
                              <p className="text-xs font-bold text-indigo-700 mb-3 flex items-center gap-1"><Package size={12} /> Stock Price Rows — {product.name}</p>
                              {!product.priceRows || product.priceRows.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No price rows yet. Stock will be tracked by price row when received via GRN.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 pr-4 font-medium">#</th>
                                      <th className="pb-2 pr-4 font-medium">Cost Price</th>
                                      <th className="pb-2 pr-4 font-medium">Qty in Stock</th>
                                      <th className="pb-2 pr-4 font-medium">Last Received</th>
                                      <th className="pb-2 font-medium">Total Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {product.priceRows.map((row, idx) => (
                                      <tr key={row._id || idx} className="border-b border-gray-50 hover:bg-indigo-50/30">
                                        <td className="py-1.5 pr-4 text-gray-400">{idx + 1}</td>
                                        <td className="py-1.5 pr-4 font-semibold text-dark-navy">Rs. {Number(row.costPrice).toFixed(2)}</td>
                                        <td className="py-1.5 pr-4">
                                          <span className={`px-2 py-0.5 rounded-full font-bold ${row.qty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{row.qty}</span>
                                        </td>
                                        <td className="py-1.5 pr-4 text-gray-500">{row.receivedAt ? new Date(row.receivedAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '-'}</td>
                                        <td className="py-1.5 font-medium text-indigo-700">Rs. {(Number(row.costPrice) * Number(row.qty)).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-gray-200">
                                      <td colSpan={2} className="pt-2 text-gray-500 font-medium">Total Stock Value</td>
                                      <td className="pt-2 font-bold text-dark-navy">{product.priceRows.reduce((s,r) => s + Number(r.qty||0), 0)}</td>
                                      <td />
                                      <td className="pt-2 font-bold text-indigo-700">Rs. {product.priceRows.reduce((s,r) => s + Number(r.costPrice||0)*Number(r.qty||0), 0).toFixed(2)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Product Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Category *</label>
                    <input 
                      list="category-suggestions"
                      required 
                      value={categories.find(c => c._id === form.categoryId)?.name || form.categoryId} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const existing = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                        setForm({ ...form, categoryId: existing ? existing._id : val });
                      }} 
                      placeholder="Type or select category"
                      className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" 
                    />
                    <datalist id="category-suggestions">
                      {categories.map((c) => <option key={c._id} value={c.name} />)}
                    </datalist>
                    <p className="text-[10px] text-muted-text mt-1">If the category doesn't exist, it will be created automatically.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Store *</label>
                    <input 
                      list="store-suggestions"
                      required
                      placeholder="Type or select Store"
                      value={stores.find(s => s._id === form.storeId)?.name || form.storeId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const existing = stores.find(s => s.name.toLowerCase() === val.toLowerCase());
                        setForm({ ...form, storeId: existing ? existing._id : val });
                      }}
                      className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" 
                    />
                    <datalist id="store-suggestions">
                      {stores.map((s) => <option key={s._id} value={s.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Price *</label>
                    <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">MRP</label>
                    <input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Minimum Price</label>
                    <input type="number" step="0.01" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm font-bold text-red-600 bg-red-50/20" placeholder="Minimum Selling Price" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Stock *</label>
                    <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Purchase Price</label>
                    <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Discount %</label>
                    <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Supplier</label>
                    <input 
                      list="supplier-suggestions"
                      placeholder="Search or select supplier"
                      value={form.supplierId === 'none' ? 'None' : (suppliers.find(s => s._id === form.supplierId)?.name || form.supplierId || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.toLowerCase() === 'none' || val === '') {
                          setForm({ ...form, supplierId: 'none' });
                        } else {
                          const existing = suppliers.find(s => s.name.toLowerCase() === val.toLowerCase());
                          setForm({ ...form, supplierId: existing ? existing._id : val });
                        }
                      }}
                      className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" 
                    />
                    <datalist id="supplier-suggestions">
                      <option value="None" />
                      {suppliers.map((s) => <option key={s._id} value={s.name}>{s.company}</option>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Unit</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                      {['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen', 'bunch'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Image URLs <span className="text-muted-text font-normal">(comma separated)</span></label>
                    <input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Product Image URL (External Link)</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input 
                          value={form.productLink} 
                          onChange={(e) => {
                            let val = e.target.value;
                            // Auto-convert external links on paste (Drive, Unsplash, etc.)
                            const converted = convertExternalUrl(val);
                            if (converted && converted !== val) {
                              val = converted;
                              toast.info('External link auto-converted to direct image URL ✅');
                            }
                            setForm({ ...form, productLink: val });
                          }}
                          className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-blue outline-none transition-all" 
                          placeholder="https://example.com/image.jpg" 
                        />
                        {form.productLink && !isDirectImageUrl(form.productLink) ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2 space-y-2">
                            <p className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                              ⚠️ Not a Direct Image Link
                            </p>
                            <p className="text-[10px] text-amber-600 leading-relaxed">
                              This link leads to a <strong>web page</strong>, not an image file. To fix this:
                            </p>
                            <ul className="text-[10px] text-amber-600 list-disc ml-4 space-y-1">
                              <li><strong>For Unsplash/Websites:</strong> Right-click the image on the site and select <strong>"Copy image address"</strong>.</li>
                              <li><strong>For Google Drive:</strong> Use: Share → Change to "Anyone with link" → Copy link.</li>
                            </ul>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-text mt-1">This will be the primary display image.</p>
                        )}
                      </div>
                      {form.productLink && (
                        <div className="w-12 h-12 rounded-lg border-2 border-indigo-100 overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm">
                          <img 
                            src={getImageUrl(form.productLink)} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e, 'Product')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue" />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.isOnSale} onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })} className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue" />
                      On Sale
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Koko Pay Availability</label>
                    <div className="flex flex-wrap gap-6 border border-card-border rounded-xl px-4 py-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allowKokoOnline}
                          onChange={(e) => setForm({ ...form, allowKokoOnline: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                        />
                        Allow Koko on Online Checkout
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allowKokoPos}
                          onChange={(e) => setForm({ ...form, allowKokoPos: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                        />
                        Allow Koko on POS
                      </label>
                    </div>
                  </div>
                  {editingId && (
                    <div>
                      <label className="block text-sm font-medium text-dark-navy mb-1">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </>
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

export default AdminProducts;
