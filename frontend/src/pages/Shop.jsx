import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts, getCategories, searchProducts } from '../services/api';
import ProductCard from '../components/ProductCard';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || '');
  const [onlyFeatured, setOnlyFeatured] = useState(searchParams.get('featured') === 'true');
  const [onlyDeals, setOnlyDeals] = useState(searchParams.get('onSale') === 'true');

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (q) {
          const res = await searchProducts(q);
          const list = res.data?.products || [];
          setProducts(list);
          setTotalPages(1);
          setTotal(list.length);
          return;
        }

        const params = { page, limit: 12, sort: sortBy };
        if (selectedCategory) params.category = selectedCategory;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (ratingFilter) params.rating = ratingFilter;
        if (onlyFeatured) params.featured = 'true';
        if (onlyDeals) params.onSale = 'true';

        const res = await getProducts(params);
        setProducts(res.data.products);
        setTotalPages(res.data.pages);
        setTotal(res.data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [q, page, selectedCategory, sortBy, minPrice, maxPrice, ratingFilter, onlyFeatured, onlyDeals]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setRatingFilter('');
    setOnlyFeatured(false);
    setOnlyDeals(false);
    setPage(1);
    setSearchParams({});
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className="base-container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-1">{q ? `Search results for "${q}"` : 'All Products'}</h1>
          <p className="text-muted-text m-0">{total} products found</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 bg-white border border-card-border rounded-lg px-4 py-2 text-sm font-medium"
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              disabled={!!q}
              className="appearance-none bg-white border border-card-border rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:ring-primary-blue focus:border-primary-blue outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden'} md:block md:relative md:w-64 md:flex-shrink-0`}>
          <div className="flex items-center justify-between mb-6 md:mb-4">
            <h3 className="font-bold text-dark-navy text-lg m-0">Filters</h3>
            <div className="flex items-center gap-3">
              <button onClick={clearFilters} className="text-xs text-primary-blue hover:underline">Clear All</button>
              <button onClick={() => setShowFilters(false)} className="md:hidden"><X size={20} /></button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-dark-navy mb-3 mt-0">Category</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy hover:text-primary-blue">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === ''}
                  onChange={() => { setSelectedCategory(''); setPage(1); }}
                  className="accent-primary-blue"
                />
                All Categories
              </label>
              {categories.map((cat) => (
                <label key={cat._id} className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy hover:text-primary-blue">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat._id}
                    onChange={() => { setSelectedCategory(cat._id); setPage(1); }}
                    className="accent-primary-blue"
                  />
                  {cat.icon} {cat.name}
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-dark-navy mb-3 mt-0">Price Range</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                className="w-full border border-card-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-blue"
              />
              <span className="text-muted-text">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                className="w-full border border-card-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-blue"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-dark-navy mb-3 mt-0">Minimum Rating</h4>
            <div className="space-y-2">
              {[4, 3, 2].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy hover:text-primary-blue">
                  <input
                    type="radio"
                    name="rating"
                    checked={ratingFilter === String(r)}
                    onChange={() => { setRatingFilter(String(r)); setPage(1); }}
                    className="accent-primary-blue"
                  />
                  {r}+ Stars
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy hover:text-primary-blue">
                <input
                  type="radio"
                  name="rating"
                  checked={ratingFilter === ''}
                  onChange={() => { setRatingFilter(''); setPage(1); }}
                  className="accent-primary-blue"
                />
                Any Rating
              </label>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-dark-navy mb-3 mt-0">Quick Filters</h4>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy mb-2">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => { setOnlyFeatured(e.target.checked); setPage(1); }}
                className="accent-primary-blue"
              />
              Featured Only
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-navy">
              <input
                type="checkbox"
                checked={onlyDeals}
                onChange={(e) => { setOnlyDeals(e.target.checked); setPage(1); }}
                className="accent-primary-blue"
              />
              On Sale Only
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-card-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                      <div className="h-9 w-9 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-card-border rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <h3 className="text-lg font-bold text-dark-navy mb-2 mt-0">No products found</h3>
              <p className="text-muted-text mb-4">Try adjusting your filters or search terms.</p>
              <button onClick={clearFilters} className="bg-primary-blue text-white px-6 py-2 rounded-full hover:bg-emerald-600 transition-colors">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                {products.map((product, i) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-card-border rounded-lg text-sm disabled:opacity-40 hover:border-primary-blue transition-colors"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === i + 1
                          ? 'bg-primary-blue text-white'
                          : 'border border-card-border hover:border-primary-blue'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-card-border rounded-lg text-sm disabled:opacity-40 hover:border-primary-blue transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
