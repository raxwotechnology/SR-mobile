import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Star, ArrowRight, Truck, ShieldCheck, Clock3, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCategories, getFeaturedProducts, getDeals } from '../services/api';
import ProductCard from '../components/ProductCard';
import useSettingsStore from '../store/settingsStore';
import { getImageUrl } from '../utils/imageHelper';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const settings = useSettingsStore((s) => s.settings);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const heroProducts = settings?.heroProducts || [
    { name: 'iPhone 15 Pro Max', price: 450000, emoji: '📱' },
    { name: 'AirPods Pro', price: 85000, emoji: '🎧' },
  ];

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featRes, dealsRes] = await Promise.all([
          getCategories(),
          getFeaturedProducts(),
          getDeals(),
        ]);
        setCategories(catRes.data);
        setFeatured(featRes.data);
        setDeals(dealsRes.data);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]"></div>
        </div>
        <div className="base-container py-16 md:py-24 flex flex-col md:flex-row items-center justify-between relative z-10">
          <motion.div
            className="md:w-1/2 mb-10 md:mb-0"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-4 uppercase tracking-wider border border-blue-500/30">
              <Sparkles size={14} /> Next-Gen Technology
            </span>
            {/* Brand Name - editable from admin settings */}
            <div className="mb-3">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Welcome to</p>
              <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent leading-tight">
                {settings?.shopName || 'Mobile Hub'}
              </h2>
            </div>
            <h1 className="text-3xl md:text-6xl font-bold leading-tight mb-6 mt-0">
              Premium tech and
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                smart devices.
              </span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 max-w-lg leading-relaxed">
              Discover the latest smartphones, powerful laptops, immersive audio, and premium accessories curated for modern lifestyles. Upgrade your tech today.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] inline-flex items-center gap-2"
              >
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link
                to="/deals"
                className="border border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-white font-semibold py-3.5 px-8 rounded-full transition-all inline-flex items-center gap-2 backdrop-blur-sm"
              >
                Tech Deals
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="md:w-1/2 flex justify-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative">
              <div className="w-80 h-80 md:w-96 md:h-96 rounded-full overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.35)] border-4 border-blue-500/40 bg-white flex items-center justify-center">
                <img
                  src={getImageUrl(settings?.logoUrl) || '/logo.png'}
                  alt={settings?.shopName || 'Shop Logo'}
                  className="w-full h-full object-cover rounded-full transition-transform duration-500 hover:scale-105"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                />
              </div>
              {/* Floating badges */}
              {heroProducts[0] && (
                <motion.div
                  className="absolute -top-4 right-0 bg-slate-800/90 border border-slate-700 backdrop-blur-md rounded-2xl shadow-xl p-3 flex items-center gap-3"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <span className="text-2xl">{heroProducts[0].emoji || '📱'}</span>
                  <div>
                    <p className="text-xs font-bold text-white m-0">{heroProducts[0].name}</p>
                    <p className="text-xs text-blue-400 m-0 font-semibold">LKR {Number(heroProducts[0].price).toLocaleString()}</p>
                  </div>
                </motion.div>
              )}
              {heroProducts[1] && (
                <motion.div
                  className="absolute bottom-4 -left-4 bg-slate-800/90 border border-slate-700 backdrop-blur-md rounded-2xl shadow-xl p-3 flex items-center gap-3"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <span className="text-2xl">{heroProducts[1].emoji || '💻'}</span>
                  <div>
                    <p className="text-xs font-bold text-white m-0">{heroProducts[1].name}</p>
                    <p className="text-xs text-blue-400 m-0 font-semibold">LKR {Number(heroProducts[1].price).toLocaleString()}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== VALUE PROPS ===== */}
      <section className="bg-white border-y border-card-border">
        <div className="base-container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Truck size={24} />, title: 'Free Shipping', desc: 'On all devices' },
              { icon: <Clock3 size={24} />, title: 'Fast Dispatch', desc: 'Packed in 24 hours' },
              { icon: <ShieldCheck size={24} />, title: 'Official Warranty', desc: 'Guaranteed genuine' },
              { icon: <Cpu size={24} />, title: 'Latest Tech', desc: 'Top-tier brands' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 m-0">{item.title}</h4>
                  <p className="text-xs text-slate-500 m-0">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section className="base-container py-12">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0 mb-1">Explore Categories</h2>
            <p className="text-slate-500 m-0">Discover curated smart devices and accessories</p>
          </div>
          <Link to="/shop" className="text-blue-600 hover:underline font-medium flex items-center gap-1">
            View All <ArrowRight size={16} />
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat._id}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link
                to={`/shop?category=${cat._id}`}
                className="bg-white border border-card-border rounded-2xl p-4 text-center cursor-pointer hover:shadow-lg hover:border-blue-600 transition-all group block"
              >
                <div className="w-14 h-14 bg-slate-50 group-hover:bg-blue-50 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl transition-colors">
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-xs text-slate-900 mt-0 mb-0 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== DEALS OF THE DAY ===== */}
      {deals.length > 0 && (
        <section className="bg-gradient-to-b from-slate-50 to-white py-12">
          <div className="base-container">
            <motion.div
              className="flex items-center justify-between mb-8"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.5 }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">⚡</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0 mb-0">Flash Deals</h2>
                </div>
                <p className="text-slate-500 m-0">Grab these tech picks before they are gone.</p>
              </div>
              <Link to="/deals" className="text-blue-600 hover:underline font-medium flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {deals.slice(0, 8).map((product, i) => (
                <motion.div
                  key={product._id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FEATURED PRODUCTS ===== */}
      {featured.length > 0 && (
        <section className="base-container py-12">
          <motion.div
            className="flex items-center justify-between mb-8"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0 mb-1">Featured Devices</h2>
              <p className="text-slate-500 m-0">Handpicked favorites by our tech experts</p>
            </div>
            <Link to="/shop?featured=true" className="text-blue-600 hover:underline font-medium flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {featured.slice(0, 8).map((product, i) => (
              <motion.div
                key={product._id}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ===== PROMOTIONAL BANNER ===== */}
   

      {/* ===== TESTIMONIALS ===== */}
      <section className="base-container py-12">
        <motion.div
          className="text-center mb-8"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0 mb-1">What Our Customers Say</h2>
          <p className="text-slate-500 m-0">Trusted by tech enthusiasts everywhere</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { name: 'Alex M.', text: "Got my new iPhone delivered the same day. Incredible service and the packaging was flawless. Highly recommended!", avatar: '👨‍💻', rating: 5 },
            { name: 'Sarah J.', text: "The range of accessories is unmatched. Found the perfect MagSafe case and wireless charger combo here.", avatar: '👩‍💼', rating: 5 },
            { name: 'Kevin D.', text: "Best tech store online. The warranty support is solid and the prices are always competitive.", avatar: '👨', rating: 4 },
            { name: 'Maria L.', text: "Fast shipping and excellent customer service. Will definitely be shopping here again!", avatar: '👩', rating: 5 },
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              className="bg-white border border-card-border rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} size={16} className="fill-blue-500 text-blue-500" />
                ))}
              </div>
              <p className="text-slate-700 mb-4">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{testimonial.avatar}</span>
                <span className="font-semibold text-slate-900">{testimonial.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
