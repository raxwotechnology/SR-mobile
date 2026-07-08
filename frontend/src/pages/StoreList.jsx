import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Star, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStores } from '../services/api';
import { getImageUrl } from '../utils/imageHelper';

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await getStores();
        setStores(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="base-container py-8">
      <motion.div
        className="mb-8"
        initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-1">Our Stores</h1>
        <p className="text-muted-text m-0">Discover our tech and smart devices boutiques near you</p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-card-border rounded-2xl overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((store, i) => (
            <motion.div
              key={store._id}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <Link to={`/store/${store._id}`} className="block group">
                <div className="bg-white border border-card-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Banner */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getImageUrl(store.bannerImage) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    {/* Logo */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-3 border-white overflow-hidden bg-white shadow-lg">
                        <img
                          src={getImageUrl(store.logo) || 'https://via.placeholder.com/100'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg m-0 drop-shadow-lg">{store.name}</h3>
                        {store.city && (
                          <p className="text-white/80 text-sm m-0 flex items-center gap-1">
                            <MapPin size={12} /> {store.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {store.isActive && (
                      <span className="absolute top-4 right-4 bg-primary-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                        Open
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <p className="text-sm text-muted-text mb-4 mt-0 line-clamp-2">{store.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-text">
                        {store.operatingHours && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {store.operatingHours.open} - {store.operatingHours.close}
                          </span>
                        )}
                        {store.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {store.phone}
                          </span>
                        )}
                      </div>
                      <span className="text-primary-blue font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Visit <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreList;
