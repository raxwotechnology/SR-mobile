import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, Package, Eye, Smartphone, Cpu, HardDrive, Palette, ShieldCheck, Tag, Upload, ImageIcon } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminProducts, getCategories, getStores, createProduct, updateProduct, deleteProduct, getSuppliers, uploadImage, getNextSku } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import ExcelImportPanel from '../inventory/ExcelImportPanel';
import SuppliersPanel from '../inventory/SuppliersPanel';
import StockReceivingPanel from '../inventory/StockReceivingPanel';
import SupplierReturnsPanel from '../inventory/SupplierReturnsPanel';
import { getImageUrl, handleImageError, isDirectImageUrl, convertExternalUrl } from '../../utils/imageHelper';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const emptyForm = {
  name: '', categoryId: '', description: '', price: '', minPrice: '', mrp: '', discount: '', unit: 'pcs',
  stock: '', purchasePrice: '', images: '', isFeatured: false, isOnSale: false, status: 'active', storeId: '',
  brand: '', modelNumber: '', ram: '', storage: '', color: '', condition: 'new', imei: '', warranty: '', supplierId: '', productLink: ''
};

const AdminPhones = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectedStoreId, setSelectedStoreId } = useAdminStoreStore();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('phones');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [autoSku, setAutoSku] = useState('');
  const imageInputRef = useRef();

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
        getSuppliers()
      ]);
      
      // Filter only phones (where category is 'Phones' or has phone specs)
      const allProds = prodRes.data || [];
      const phones = allProds.filter(p => 
        p.categoryId?.name?.toLowerCase().includes('phone') || 
        p.brand || 
        p.modelNumber ||
        p.ram
      );

      setProducts(phones);
      setCategories(catRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);
      setSuppliers(suppRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load mobile phones';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStoreId]);

  const openCreate = () => {
    setEditingId(null);
    const phoneCat = categories.find(c => c.name.toLowerCase().includes('phone'));
    const initialCatId = phoneCat ? phoneCat._id : '';
    setForm({ 
      ...emptyForm, 
      storeId: selectedStoreId !== 'all' ? selectedStoreId : '',
      categoryId: initialCatId
    });
    setUploadedImages([]);
    setAutoSku('');
    // Fetch next SKU for this category
    if (initialCatId) {
      getNextSku(initialCatId).then(({ data }) => setAutoSku(data.sku || '')).catch(() => {});
    }
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
      unit: product.unit || 'pcs',
      stock: product.stock || 0,
      purchasePrice: product.avgCost || product.lastCost || '',
      images: (product.images || []).join(', '),
      isFeatured: !!product.isFeatured,
      isOnSale: !!product.isOnSale,
      status: product.status || 'active',
      storeId: product.storeId?._id || product.storeId || '',

      brand: product.brand || '',
      modelNumber: product.modelNumber || '',
      ram: product.ram || '',
      storage: product.storage || '',
      color: product.color || '',
      condition: product.condition || 'new',
      imei: (product.imei || []).join(', '),
      warranty: product.warranty || '',
      supplierId: product.supplierId?._id || product.supplierId || '',
      productLink: product.productLink || '',
    });
    const existingImages = (product.images || []).filter(Boolean);
    // Don't duplicate productLink in the uploadedImages list — it's shown separately
    const filtered = existingImages.filter(url => url !== (product.productLink || ''));
    setUploadedImages(filtered);
    setShowModal(true);
  };

  // Image upload logic removed as per user request to use links only
  const addImageUrl = (url) => {
    if (!url) return;
    const converted = convertExternalUrl(url);
    if (converted && converted !== url) {
      toast.info('External link auto-converted ✅');
    }
    setUploadedImages(prev => [...prev, converted].filter(Boolean));
    toast.success('Image URL added!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImages = [...uploadedImages].filter(Boolean);
      // Ensure productLink is always the first image in the array if it exists
      if (form.productLink) {
        // Remove it if it's already in the secondary list to avoid duplicates
        finalImages = finalImages.filter(url => url !== form.productLink);
        // Put it at the front
        finalImages.unshift(form.productLink);
      }

      // Validate store
      const storeExists = stores.find(s => s._id === form.storeId);
      if (!storeExists) {
        toast.error('Please select a valid store from the suggestions');
        setSaving(false);
        return;
      }

      // Validate supplier if configured
      let supplierId = form.supplierId;
      if (supplierId && supplierId !== 'none') {
        const supplierExists = suppliers.find(s => s._id === supplierId);
        if (!supplierExists) {
          toast.error('Please select a valid supplier from the suggestions, or select "None"');
          setSaving(false);
          return;
        }
      } else {
        supplierId = null;
      }

      // Enforce minimum price check
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
        supplierId,
        imei: form.imei ? form.imei.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      
      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success('Mobile phone updated');
      } else {
        await createProduct(payload);
        toast.success('Mobile phone added');
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

  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchesSearch = (p?.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p?.modelNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p?.imei || []).some(i => i.includes(search));
    const matchesBrand = brandFilter === 'all' || p.brand === brandFilter;
    return matchesSearch && matchesBrand;
  });

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Mobile Inventory">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Mobile Inventory">
      <div className="animate-fade-in">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Smartphone className="text-primary-blue" /> Mobile Phones
            </h1>
            <p className="text-muted-text text-sm mt-1">{products.length} devices in inventory</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[
                { id: 'phones', label: '📱 Phones' }, 
                { id: 'suppliers', label: '🏭 Suppliers' },
                { id: 'receiving', label: '📋 Stock Receiving (GRN)' },
                { id: 'supplierReturns', label: '🔄 Returns' },
                { id: 'import', label: '📥 Import CSV' }
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
            {activeTab === 'phones' && (
              <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all">
                <Plus size={18} /> Add New Phone
              </button>
            )}
          </div>
        </div>

        {activeTab === 'suppliers' && (
          <SuppliersPanel 
            storeId={selectedStoreId !== 'all' ? selectedStoreId : undefined} 
            stores={stores}
            onStoreChange={(id) => setSelectedStoreId(id)}
          />
        )}

        {/* Stock Receiving Tab */}
        {activeTab === 'receiving' && (
          <StockReceivingPanel 
            storeId={selectedStoreId !== 'all' ? selectedStoreId : undefined} 
            products={products} 
          />
        )}

        {/* Supplier Returns Tab */}
        {activeTab === 'supplierReturns' && (
          <SupplierReturnsPanel 
            storeId={selectedStoreId !== 'all' ? selectedStoreId : undefined} 
            products={products} 
          />
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <ExcelImportPanel
            storeId={selectedStoreId !== 'all' ? selectedStoreId : stores[0]?._id}
            categories={categories}
            onImportComplete={() => { setActiveTab('phones'); fetchData(); }}
          />
        )}

        {activeTab === 'phones' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, model, IMEI..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <button
                  onClick={() => setBrandFilter('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                    brandFilter === 'all' ? 'bg-primary-blue text-white shadow-md' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                  }`}
                >
                  All Brands
                </button>
                {brands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setBrandFilter(brand)}
                    className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                      brandFilter === brand ? 'bg-primary-blue text-white shadow-md' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Device Details</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Specs</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Price & Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Supplier</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((product) => {
                  const isExpanded = expandedProduct === product._id;
                  return (
                    <React.Fragment key={product._id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-primary-blue overflow-hidden">
                              {(product.productLink || product.images?.[0]) ? (
                                <img 
                                  src={getImageUrl(product.productLink || product.images?.[0])} 
                                  className="w-full h-full object-cover rounded-lg" 
                                  alt="" 
                                  onError={(e) => handleImageError(e, 'Phone')}
                                />
                              ) : <Smartphone size={20} />}
                            </div>
                            <div>
                              <div className="font-bold text-dark-navy">{product.name}</div>
                              <div className="text-[10px] text-muted-text flex items-center gap-2">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase font-bold">{product.brand || 'No Brand'}</span>
                                <span>{product.modelNumber || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {product.ram && <span className="bg-indigo-50 text-primary-blue text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"><Cpu size={10} /> {product.ram}</span>}
                            {product.storage && <span className="bg-indigo-50 text-primary-blue text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"><HardDrive size={10} /> {product.storage}</span>}
                            {product.condition && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${product.condition === 'new' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{product.condition}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-dark-navy">Rs. {Number(product.price || 0).toLocaleString()}</div>
                          {Number(product.minPrice || 0) > 0 && (
                            <div className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                              Min Rs. {Number(product.minPrice || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="text-xs text-muted-text">Stock: <span className={`font-bold ${product.stock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>{product.stock}</span></div>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          <div className="font-medium text-dark-navy">{product.supplierId?.name || '—'}</div>
                          <div className="text-[10px] text-muted-text">{product.supplierId?.company || ''}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{product.status.toUpperCase()}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-indigo-50 text-primary-blue transition-colors" title="Edit Device"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteClick(product)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-12 py-4 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-dark-navy mb-3 flex items-center gap-1"><Cpu size={12} /> Hardware & Specs</h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between"><span>RAM:</span> <span className="font-bold">{product.ram || '-'}</span></div>
                                  <div className="flex justify-between"><span>Storage:</span> <span className="font-bold">{product.storage || '-'}</span></div>
                                  <div className="flex justify-between"><span>Color:</span> <span className="font-bold">{product.color || '-'}</span></div>
                                  <div className="flex justify-between"><span>Condition:</span> <span className="font-bold uppercase text-emerald-600">{product.condition}</span></div>
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-dark-navy mb-3 flex items-center gap-1"><ShieldCheck size={12} /> Warranty & Identity</h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between"><span>Warranty:</span> <span className="font-bold">{product.warranty || '-'}</span></div>
                                  <div className="flex justify-between"><span>IMEI(s):</span> <span className="font-mono text-[10px]">{product.imei?.join(', ') || '-'}</span></div>
                                  <div className="flex justify-between"><span>Model No:</span> <span className="font-bold">{product.modelNumber || '-'}</span></div>
                                  {product.sku && <div className="flex justify-between items-center"><span>SKU:</span> <span className="font-mono font-bold bg-indigo-50 text-primary-blue px-2 py-0.5 rounded">{product.sku}</span></div>}
                                  {product.barcode && <div className="flex justify-between"><span>Barcode:</span> <span className="font-mono text-[10px]">{product.barcode}</span></div>}
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-dark-navy mb-3 flex items-center gap-1"><Tag size={12} /> Commercial Info</h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between"><span>Purchase Price:</span> <span className="font-bold">Rs. {Number(product.avgCost || 0).toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Profit Est:</span> <span className="font-bold text-emerald-600">Rs. {(product.price - (product.avgCost || 0)).toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Store:</span> <span className="font-bold">{product.storeId?.name || '-'}</span></div>
                                  {product.productLink && (
                                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                                      <span>Link:</span> 
                                      <a href={product.productLink} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline font-bold truncate max-w-[150px]">
                                        View External
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
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
        </div>
        )}

        {/* Specialized Mobile Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-indigo-50/30">
                <div>
                  <h2 className="text-xl font-bold text-dark-navy">{editingId ? 'Edit Mobile Device' : 'Register New Mobile Device'}</h2>
                  <p className="text-xs text-muted-text mt-0.5">Enter technical specifications and stock details</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
                {/* Section 1: Basic Identity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary-blue flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Smartphone size={16} /> Basic Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Product Display Name *</label>
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all" placeholder="e.g. Samsung Galaxy S24 Ultra" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Brand / Manufacturer *</label>
                      <input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all" placeholder="e.g. Apple, Samsung, Xiaomi" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Model Number</label>
                      <input value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all" placeholder="e.g. SM-S928B" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Category *</label>
                      <input 
                        list="category-suggestions"
                        required
                        placeholder="Type or select category"
                        value={categories.find(c => c._id === form.categoryId)?.name || form.categoryId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const existing = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                          const catId = existing ? existing._id : val;
                          setForm({ ...form, categoryId: catId });
                          if (catId && !editingId) {
                            getNextSku(catId).then(({ data }) => setAutoSku(data.sku || '')).catch(() => {});
                          }
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                      />
                      <datalist id="category-suggestions">
                        {categories.map((c) => <option key={c._id} value={c.name} />)}
                      </datalist>
                    </div>
                    {!editingId && autoSku && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Auto SKU / Item Code</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl py-2.5 px-4 text-sm font-bold text-primary-blue tracking-wider">
                            {autoSku}
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-lg font-semibold">✓ Auto</span>
                        </div>
                        <p className="text-[10px] text-muted-text mt-1">Auto-assigned on save</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Store Assignment *</label>
                      <input 
                        list="store-suggestions"
                        required
                        disabled={selectedStoreId !== 'all'}
                        placeholder="Type or select Store"
                        value={stores.find(s => s._id === form.storeId)?.name || form.storeId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const existing = stores.find(s => s.name.toLowerCase() === val.toLowerCase());
                          setForm({ ...form, storeId: existing ? existing._id : val });
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm disabled:opacity-50" 
                      />
                      <datalist id="store-suggestions">
                        {stores.map((s) => <option key={s._id} value={s.name} />)}
                      </datalist>
                      {selectedStoreId === 'all' && !form.storeId && (
                        <p className="text-[10px] text-red-500 mt-1">Please select a store to register this device</p>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Primary Product Image URL (External Link) *</label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            required
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
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all" 
                            placeholder="Paste the direct image link here (e.g. https://example.com/phone.jpg)" 
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
                            <p className="text-[10px] text-muted-text mt-1">This link will be used as the primary display image.</p>
                          )}
                        </div>
                        {form.productLink && (
                          <div className="w-20 h-20 rounded-xl border-2 border-indigo-100 overflow-hidden shadow-sm flex-shrink-0 bg-gray-50">
                            <img 
                              src={getImageUrl(form.productLink)} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, 'Phone')}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section 2: Technical Specifications */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary-blue flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Cpu size={16} /> Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">RAM Capacity</label>
                      <input value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. 8GB, 12GB" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Internal Storage</label>
                      <input value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. 128GB, 256GB" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Color</label>
                      <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Titanium Gray" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Condition *</label>
                      <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm">
                        <option value="new">Brand New</option>
                        <option value="used">Pre-Owned / Used</option>
                        <option value="refurbished">Refurbished</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">IMEI Numbers <span className="text-[10px] font-normal">(Comma separated for bulk stock)</span></label>
                      <textarea rows={2} value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm resize-none" placeholder="Enter IMEI numbers..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Warranty Details</label>
                      <textarea rows={2} value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm resize-none" placeholder="e.g. 1 Year Company Warranty" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Pricing & Inventory */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary-blue flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Tag size={16} /> Pricing & Supplier Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Selling Price *</label>
                      <input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-indigo-700" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Minimum Price</label>
                      <input type="number" min="0" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} className="w-full bg-red-50 border border-red-100 rounded-xl py-3 px-4 text-sm font-bold text-red-700" placeholder="Cannot sell below" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Purchase/Cost Price</label>
                      <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Stock Quantity *</label>
                      <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Supplier</label>
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" 
                      />
                      <datalist id="supplier-suggestions">
                        <option value="None" />
                        {suppliers.map((s) => <option key={s._id} value={s.name}>{s.company}</option>)}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Section 4: Product Images */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary-blue flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <ImageIcon size={16} /> Product Images
                  </h3>

                  {/* Uploaded previews */}
                  <div className="flex flex-wrap gap-3">
                    {/* Show productLink as the first image if it exists */}
                    {form.productLink && (
                      <div className="relative group">
                        <img
                          src={getImageUrl(form.productLink)}
                          alt="Main"
                          className="w-20 h-20 object-cover rounded-xl border-2 border-primary-blue shadow-sm"
                          onError={(e) => handleImageError(e, 'Phone')}
                        />
                        <span className="absolute top-1 left-1 bg-primary-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">LINK</span>
                      </div>
                    )}
                    
                    {uploadedImages.filter(url => url !== form.productLink).map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={getImageUrl(url)}
                            alt={`img-${i}`}
                            className="w-20 h-20 object-cover rounded-xl border-2 border-indigo-100 shadow-sm"
                            onError={(e) => handleImageError(e, 'Image')}
                          />
                          <button
                            type="button"
                            onClick={() => setUploadedImages(prev => prev.filter(u => u !== url))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      id="secondary-image-input"
                      type="text" 
                      placeholder="Add another secondary image URL..." 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addImageUrl(e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('secondary-image-input');
                        addImageUrl(input.value.trim());
                        input.value = '';
                      }}
                      className="bg-indigo-50 text-primary-blue font-bold px-4 rounded-xl hover:bg-indigo-100 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">
                    {saving ? 'Processing...' : editingId ? 'Update Device Record' : 'Register Device'}
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

export default AdminPhones;
