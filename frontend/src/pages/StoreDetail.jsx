import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStoreById, getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import { getImageUrl } from '../utils/imageHelper';

const StoreDetail = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storeRes, prodRes] = await Promise.all([
          getStoreById(id),
          getProducts({ store: id, limit: 20 }),
        ]);
        setStore(storeRes.data);
        setProducts(prodRes.data.products);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200" />
        <div className="base-container py-8 space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="base-container py-20 text-center">
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-2xl font-bold text-dark-navy mb-2">Store Not Found</h2>
        <Link to="/stores" className="text-primary-blue hover:underline">Back to Stores</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Store Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={getImageUrl(store.bannerImage) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200'}
          alt={store.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="base-container py-6 flex items-end gap-5">
            <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-xl flex-shrink-0">
              <img src={getImageUrl(store.logo) || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mt-0 mb-1 drop-shadow-lg">{store.name}</h1>
              <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap">
                {store.city && (
                  <span className="flex items-center gap-1"><MapPin size={14} /> {store.city}</span>
                )}
                {store.operatingHours && (
                  <span className="flex items-center gap-1"><Clock size={14} /> {store.operatingHours.open} - {store.operatingHours.close}</span>
                )}
                {store.isActive && (
                  <span className="bg-primary-blue text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Open Now</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="base-container py-8">
        {/* Store Info Card */}
        <motion.div
          className="bg-white border border-card-border rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="font-bold text-dark-navy mt-0 mb-2">About</h3>
              <p className="text-muted-text leading-relaxed m-0">{store.description}</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-dark-navy mt-0 mb-2">Contact</h3>
              {store.phone && (
                <p className="text-sm text-muted-text m-0 flex items-center gap-2">
                  <Phone size={14} className="text-primary-blue" /> {store.phone}
                </p>
              )}
              {store.email && (
                <p className="text-sm text-muted-text m-0 flex items-center gap-2">
                  <Mail size={14} className="text-primary-blue" /> {store.email}
                </p>
              )}
              {store.address && (
                <p className="text-sm text-muted-text m-0 flex items-center gap-2">
                  <MapPin size={14} className="text-primary-blue" /> {store.address}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Store Products */}
        <div>
          <h2 className="text-2xl font-bold text-dark-navy mb-6 mt-0">Products from {store.name}</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          ) : (
            <div className="bg-white border border-card-border rounded-2xl p-12 text-center">
              <p className="text-3xl mb-3">📦</p>
              <h3 className="text-lg font-bold text-dark-navy m-0">No products yet</h3>
              <p className="text-muted-text">This store hasn't added any products.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;
