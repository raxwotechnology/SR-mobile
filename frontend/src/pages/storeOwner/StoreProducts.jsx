import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Search, Package, Upload, ImageIcon } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { getMyStoreProducts, createProduct, updateProduct, deleteProduct, getCategories, getStores, uploadImage } from '../../services/api';
import useCurrencyStore from '../../store/currencyStore';
import { toast } from 'react-toastify';
import { managerNavGroups as navItems } from './managerNavItems';
import SuppliersPanel from '../inventory/SuppliersPanel';
import StockReceivingPanel from '../inventory/StockReceivingPanel';
import SupplierReturnsPanel from '../inventory/SupplierReturnsPanel';
import ExcelImportPanel from '../inventory/ExcelImportPanel';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';



const emptyForm = {
  name: '', categoryId: '', description: '', price: '', mrp: '', discount: '', unit: 'kg',
  stock: '', purchasePrice: '', images: '', isFeatured: false, isOnSale: false, allowKokoOnline: true, allowKokoPos: true, status: 'active', storeId: '',
};

const StoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // products | suppliers | receiving | supplierReturns
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const imageInputRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      setError('');
      setLoading(true);
      const [prodRes, catRes, storesRes] = await Promise.all([getMyStoreProducts(), getCategories(), getStores()]);
      setProducts(prodRes?.data?.products || []);
      setStoreInfo(prodRes?.data?.store || null);
      setCategories(catRes?.data || []);
      setAllStores(storesRes?.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load products';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUploadedImages([]);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      categoryId: product.categoryId?._id || product.categoryId || '',
      description: product.description || '',
      price: product.price,
      mrp: product.mrp || product.price,
      stock: product.stock,
      purchasePrice: product.purchasePrice || 0,
      discount: product.discount || 0,
      unit: product.unit || 'pcs',
      isFeatured: product.isFeatured || false,
      isOnSale: product.isOnSale || false,
      status: product.status || 'active',
      allowKokoOnline: product.allowKokoOnline !== undefined ? product.allowKokoOnline : true,
      allowKokoPos: product.allowKokoPos !== undefined ? product.allowKokoPos : true,
    });
    setUploadedImages((product.images || []).filter(Boolean));
    setShowModal(true);
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const newUrls = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
      try {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await uploadImage(formData);
        newUrls.push(data.url || data.imageUrl || data.path || '');
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploadedImages(prev => [...prev, ...newUrls].filter(Boolean));
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp) || Number(form.price),
        discount: Number(form.discount) || 0,
        stock: Number(form.stock),
        purchasePrice: Number(form.purchasePrice) || 0,
        images: uploadedImages.filter(Boolean),
        storeId: storeInfo?._id || form.storeId,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (product) => {
    setItemToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProduct(itemToDelete._id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) { toast.error('Failed to delete product'); }
  };

  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = products.filter((p) => {
    const matchesSearch = (p?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryId?._id === categoryFilter;
    return matchesSearch && matchesCategory;
  });


  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Manager Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Store Dashboard">
      <div>
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'products', label: '📦 Products' },
            { id: 'suppliers', label: '🏭 Suppliers' },
            { id: 'receiving', label: '📋 Stock Receiving (GRN)' },
            { id: 'supplierReturns', label: '🔄 Supplier Returns' },
            { id: 'import', label: '📥 Import from Excel' },
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

        {activeTab === 'suppliers' && storeInfo?._id && (
          <SuppliersPanel storeId={storeInfo._id} />
        )}
        {activeTab === 'receiving' && storeInfo?._id && (
          <StockReceivingPanel storeId={storeInfo._id} products={products} />
        )}
        {activeTab === 'supplierReturns' && storeInfo?._id && (
          <SupplierReturnsPanel storeId={storeInfo._id} products={products} />
        )}
        {activeTab === 'import' && storeInfo?._id && (
          <ExcelImportPanel
            storeId={storeInfo._id}
            categories={categories}
            onImportComplete={() => { setActiveTab('products'); fetchProducts(); }}
          />
        )}

        {activeTab === 'products' && (
          <div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchProducts} className="font-semibold hover:underline">Retry</button>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Products</h1>
            <p className="text-muted-text text-sm mt-1">{products.length} products in your store</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all text-sm"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>

        {/* Low Stock Alerts */}
        {products.filter(p => p.stock <= 10).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
              ⚠️ Low Stock Alerts ({products.filter(p => p.stock <= 10).length} items)
            </h3>
            <div className="flex flex-wrap gap-2">
              {products.filter(p => p.stock <= 10).map(p => (
                <button key={p._id} onClick={() => openEdit(p)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    p.stock === 0 ? 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200' :
                    p.stock <= 5 ? 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200' :
                    'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200'
                  }`}>
                  {p.stock === 0 ? '🔴' : p.stock <= 5 ? '🟠' : '🟡'} {p.name} — {p.stock} left
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
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


        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Category</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Price</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Koko</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0] ? getImageUrl(product.images[0]) : 'https://placehold.co/100x100?text=Product'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-card-border"
                          onError={(e) => handleImageError(e, product.name)}
                        />
                        <div>
                          <p className="font-medium text-dark-navy">{product.name}</p>
                          <p className="text-xs text-muted-text">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-muted-text">{product.categoryId?.name || '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold">{useCurrencyStore.getState().getProductPrice(product)}</span>
                      {product.mrp > product.price && (
                        <span className="text-xs text-muted-text line-through ml-1">${product.mrp?.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`font-semibold ${product.stock <= 5 ? 'text-red-500' : 'text-dark-navy'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${product.allowKokoOnline !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          Online {product.allowKokoOnline !== false ? 'ON' : 'OFF'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${product.allowKokoPos !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          POS {product.allowKokoPos !== false ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(product)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-text text-sm">No products found</div>
            )}
          </div>
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-navy mb-1">Product Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Category *</label>
                  <input 
                    list="store-category-suggestions"
                    required 
                    value={categories.find(c => c._id === form.categoryId)?.name || form.categoryId} 
                    onChange={(e) => {
                      const val = e.target.value;
                      const existing = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                      setForm({ ...form, categoryId: existing ? existing._id : val });
                    }} 
                    placeholder="Type or select category"
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" 
                  />
                  <datalist id="store-category-suggestions">
                    {categories.map((c) => <option key={c._id} value={c.name} />)}
                  </datalist>
                  <p className="text-[10px] text-muted-text mt-1">If the category doesn't exist, it will be created automatically.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Store</label>
                  <select value={form.storeId || storeInfo?._id || ''} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                    {storeInfo && <option value={storeInfo._id}>{storeInfo.name} (My Store)</option>}
                    {allStores.filter(s => s._id !== storeInfo?._id).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                    {['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen', 'bunch'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Price *</label>
                  <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">MRP</label>
                  <input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Stock *</label>
                  <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Purchase Price</label>
                  <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Discount %</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-navy mb-1">Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue resize-none" />
                </div>
                <div className="sm:col-span-2 space-y-3">
                  <label className="block text-sm font-medium text-dark-navy mb-1 flex items-center gap-2">
                    <ImageIcon size={16} /> Product Images
                  </label>
                  
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {uploadedImages.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-card-border" />
                          <button
                            type="button"
                            onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                      ${uploadingImage ? 'border-primary-blue bg-indigo-50' : 'border-card-border hover:border-primary-blue hover:bg-gray-50'}`}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-1 text-primary-blue">
                        <div className="w-6 h-6 border-2 border-primary-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-medium">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Upload size={20} />
                        <p className="text-xs font-medium text-gray-600">Click or drag images here</p>
                      </div>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
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
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 transition-all text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name || 'this product'}
      />
    </DashboardLayout>
  );
};

export default StoreProducts;
