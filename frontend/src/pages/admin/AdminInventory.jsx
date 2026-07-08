import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, FileText } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toast } from 'react-toastify';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import API from '../../services/api';

const AdminInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock-asc');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          API.get('/products'),
          API.get('/categories'),
        ]);
        setProducts(prodRes.data?.products || prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = products
    .filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      const matchCat = catFilter === 'all' || p.category === catFilter || p.categoryId === catFilter || p.categoryId?._id === catFilter;
      const matchBrand = brandFilter === 'all' || p.brand === brandFilter;
      
      const safetyLimit = p.lowStockLimit !== undefined && p.lowStockLimit !== null ? p.lowStockLimit : 10;
      const matchStock = stockFilter === 'all'
        || (stockFilter === 'low' && p.stock > 0 && p.stock <= safetyLimit)
        || (stockFilter === 'out' && p.stock <= 0)
        || (stockFilter === 'ok' && p.stock > safetyLimit);
      
      return matchSearch && matchCat && matchBrand && matchStock;
    })
    .sort((a, b) => {
      if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'name') return a.name?.localeCompare(b.name);
      if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  // Extract unique brands dynamically
  const uniqueBrands = ['all', ...new Set(products.map(p => p.brand).filter(Boolean))];

  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.stock <= 0).length;
  const lowStock = products.filter(p => {
    const safetyLimit = p.lowStockLimit !== undefined && p.lowStockLimit !== null ? p.lowStockLimit : 10;
    return p.stock > 0 && p.stock <= safetyLimit;
  }).length;
  const totalStockValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);

  const exportCols = [
    { label: 'Name', accessor: 'name' },
    { label: 'Brand', accessor: (r) => r.brand || 'N/A' },
    { label: 'SKU', accessor: (r) => r.sku || r.barcode || 'N/A' },
    { label: 'Price (Rs.)', accessor: (r) => r.price?.toLocaleString() },
    { label: 'Stock', accessor: (r) => r.stock?.toString() },
    { label: 'Safety Limit', accessor: (r) => (r.lowStockLimit !== undefined ? r.lowStockLimit.toString() : '10') },
    { label: 'Status', accessor: (r) => {
        const limit = r.lowStockLimit !== undefined ? r.lowStockLimit : 10;
        return r.stock <= 0 ? 'Out of Stock' : r.stock <= limit ? 'Low Stock' : 'In Stock';
      }
    },
    { label: 'Value (Rs.)', accessor: (r) => ((r.price || 0) * (r.stock || 0)).toLocaleString() },
  ];

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
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📦 Inventory Valuation & Stock</h1>
            <p className="text-muted-text text-sm mt-1">Track stock counts, safety levels, and valuation reports</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(filtered, exportCols, 'inventory')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📄 CSV</button>
            <button onClick={() => exportToExcel(filtered, exportCols, 'inventory')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📊 Excel</button>
            <button onClick={() => exportToPDF(filtered, exportCols, 'Inventory Valuation Report')}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1 shadow-sm">
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-2">
              <Package size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-dark-navy">{totalProducts}</p>
            <p className="text-xs text-muted-text mt-1">Total Products</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-blue-500 flex items-center justify-center mb-2">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
            <p className="text-xs text-muted-text mt-1">Out of Stock</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
            <p className="text-xs text-muted-text mt-1">Low Stock (≤ Limit)</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <p className="text-xs text-muted-text">Total Stock Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {totalStockValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue">
            <option value="all">All Brands</option>
            {uniqueBrands.slice(1).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue">
            <option value="all">All Stock Statuses</option>
            <option value="ok">In Stock (&gt; Limit)</option>
            <option value="low">Low Stock (≤ Limit)</option>
            <option value="out">Out of Stock</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue">
            <option value="stock-asc">Stock: Low → High</option>
            <option value="stock-desc">Stock: High → Low</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price: High → Low</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-card-border">
                  <th className="px-6 py-3 font-semibold text-muted-text">Product</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">SKU/Barcode</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">Brand</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">Price</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">Stock</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">Status</th>
                  <th className="px-6 py-3 font-semibold text-muted-text">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map(p => {
                  const safetyLimit = p.lowStockLimit !== undefined && p.lowStockLimit !== null ? p.lowStockLimit : 10;
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock <= safetyLimit;
                  
                  return (
                    <tr key={p._id} className={`hover:bg-gray-50/50 transition-colors ${isOut ? 'bg-red-50/30' : isLow ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover border border-card-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-card-border"><Package size={16} className="text-gray-400" /></div>
                          )}
                          <div>
                            <span className="font-semibold text-dark-navy block">{p.name}</span>
                            <span className="text-[10px] text-muted-text font-mono">Safety Limit: {safetyLimit} pcs</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-text">{p.sku || p.barcode || '—'}</td>
                      <td className="px-6 py-3.5 text-muted-text">{p.brand || '—'}</td>
                      <td className="px-6 py-3.5 font-semibold">Rs. {p.price?.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}`}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-muted-text ml-1">/{p.unit || 'pcs'}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        {isOut ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-600 text-white shadow-sm">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 text-red-700 animate-pulse">
                            ⚠️ Low Stock
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-muted-text">Rs. {((p.price || 0) * (p.stock || 0)).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-text text-sm">No products found matching filters</div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminInventory;
