import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, MapPin, Menu, X, ChevronDown, RefreshCw, Home, ShoppingBag, Heart, Package, LayoutDashboard, Tag, Settings } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { getImageUrl, handleImageError } from '../utils/imageHelper';
import useCartStore from '../store/cartStore';
import useCurrencyStore from '../store/currencyStore';
import { searchProducts } from '../services/api';
import NotificationBell from './NotificationBell';
import useSettingsStore from '../store/settingsStore';

const buildFeatureIndex = (role) => {
  const items = [
    // Customer
    { label: 'Shop', path: '/shop', roles: ['customer', 'guest'], keywords: ['products', 'buy', 'items'] },
    { label: 'Deals', path: '/deals', roles: ['customer', 'guest'], keywords: ['offers', 'discounts', 'sale'] },
    { label: 'Stores', path: '/stores', roles: ['customer', 'guest'], keywords: ['shops', 'branches'] },
    { label: 'Orders', path: '/orders', roles: ['customer'], keywords: ['my orders', 'history', 'tracking'] },
    { label: 'Wishlist', path: '/wishlist', roles: ['customer'], keywords: ['favorites', 'saved'] },
    { label: 'Loyalty & Rewards', path: '/loyalty', roles: ['customer'], keywords: ['points', 'rewards', 'store credit'] },

    // Admin
    { label: 'Admin Overview', path: '/admin', roles: ['admin'], keywords: ['dashboard'] },
    { label: 'Users', path: '/admin/users', roles: ['admin'], keywords: ['customers', 'accounts'] },
    { label: 'Employees', path: '/admin/employees', roles: ['admin'], keywords: ['staff', 'leave requests'] },
    { label: 'Products', path: '/admin/products', roles: ['admin'], keywords: ['inventory', 'stock', 'suppliers', 'receiving', 'returns'] },
    { label: 'Orders', path: '/admin/orders', roles: ['admin'], keywords: ['sales', 'deliveries'] },
    { label: 'Returns', path: '/admin/returns', roles: ['admin'], keywords: ['refund', 'exchange', 'store credit'] },
    { label: 'Expenses', path: '/admin/expenses', roles: ['admin'], keywords: ['costs'] },
    { label: 'Financials', path: '/admin/financials', roles: ['admin'], keywords: ['revenue', 'profit', 'report'] },
    { label: 'Reports', path: '/admin/reports', roles: ['admin'], keywords: ['analytics'] },
    { label: 'POS Terminal', path: '/pos', roles: ['admin', 'manager', 'cashier'], keywords: ['pos', 'checkout', 'billing'] },

    // Manager
    { label: 'Manager Overview', path: '/manager', roles: ['manager'], keywords: ['dashboard'] },
    { label: 'Products', path: '/manager/products', roles: ['manager'], keywords: ['inventory', 'stock', 'suppliers', 'receiving', 'returns'] },
    { label: 'Orders', path: '/manager/orders', roles: ['manager'], keywords: ['sales', 'deliveries'] },
    { label: 'Returns', path: '/manager/returns', roles: ['manager'], keywords: ['exchange', 'upgrade', 'return requests'] },
    { label: 'Employees', path: '/manager/employees', roles: ['manager'], keywords: ['staff', 'leave requests'] },
    { label: 'Attendance', path: '/manager/attendance', roles: ['manager'], keywords: ['check-in', 'check out'] },
    { label: 'Leaves', path: '/manager/leaves', roles: ['manager'], keywords: ['leave', 'leave requests'] },

    // Employee (cashier/staff)
    { label: 'My Portal', path: '/employee', roles: ['cashier', 'stockEmployee', 'deliveryGuy'], keywords: ['employee'] },
    { label: 'Attendance', path: '/employee/attendance', roles: ['cashier', 'stockEmployee', 'deliveryGuy'], keywords: ['check-in', 'check out'] },
    { label: 'Leaves', path: '/employee/leaves', roles: ['cashier', 'stockEmployee', 'deliveryGuy'], keywords: ['leave request'] },
    { label: 'Returns', path: '/employee/returns', roles: ['cashier'], keywords: ['customer return', 'exchange', 'store credit'] },
    { label: 'Stock View', path: '/employee/stock', roles: ['cashier', 'stockEmployee'], keywords: ['inventory', 'products'] },

    // Delivery
    { label: 'Deliveries', path: '/delivery', roles: ['deliveryGuy'], keywords: ['orders', 'assigned'] },
  ];

  const normalizedRole = role || 'guest';
  return items.filter((i) => i.roles.includes(normalizedRole) || (normalizedRole !== 'guest' && i.roles.includes('customer') && normalizedRole === 'customer'));
};

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.getCount());
  const fetchCart = useCartStore((s) => s.fetchCart);
  const { currency, toggleCurrency, fetchRate, getProductPrice } = useCurrencyStore();
  const settings = useSettingsStore((s) => s.settings);
  const brandName = 'Mobixa';
  const brandLogoUrl = '/logo.png';
  const brandPhone = settings?.phone || '+94 11 255 5000';
  const freeDeliveryThreshold = Number(settings?.deliveryFeeThreshold || 5000).toLocaleString();

  useEffect(() => {
    if (user) fetchCart();
    fetchRate();
  }, [user]);

  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featureResults, setFeatureResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  // Handle search with debounce
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);

    if (value.length < 2) {
      setSearchResults([]);
      setFeatureResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const q = value.trim().toLowerCase();
        const index = buildFeatureIndex(user?.role);
        const featureMatches = index
          .filter((i) => {
            const hay = [i.label, ...(i.keywords || [])].join(' ').toLowerCase();
            return hay.includes(q);
          })
          .slice(0, 6);
        setFeatureResults(featureMatches);

        const res = await searchProducts(value);
        setSearchResults(res.data.products.slice(0, 6));
        setShowSearchResults(true);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  // Close search results on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    // Clear cart state so next user doesn't see old cart
    useCartStore.getState().clearItems();
    setMobileMenuOpen(false);
    navigate('/');
  };

  // Navigation links with role visibility
  const shouldHidePublicTabs = !!user && ['admin', 'manager', 'cashier', 'deliveryGuy', 'stockEmployee'].includes(user.role);
  const isCustomer = !user || user.role === 'customer';
  const getSettingsLink = () => {
    if (!user) return null;
    if (user.role === 'admin') return '/admin/settings';
    if (user.role === 'manager') return '/manager';
    if (['cashier', 'deliveryGuy', 'stockEmployee'].includes(user.role)) return '/employee/profile';
    return '/profile';
  };
  const settingsLink = getSettingsLink();
  const navLinks = [
    { path: '/', label: 'Home', icon: Home, show: !shouldHidePublicTabs },
    { path: '/shop', label: 'Shop', icon: ShoppingBag, show: !shouldHidePublicTabs },
    { path: '/deals', label: 'Deals', icon: Tag, show: !shouldHidePublicTabs },
    { path: '/stores', label: 'Stores', icon: MapPin, show: !shouldHidePublicTabs },
  ];

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin': return { path: '/admin', label: 'Admin Panel', emoji: '🛡️' };
      case 'manager': return { path: '/manager', label: 'Dashboard', emoji: '📊' };
      case 'cashier': return { path: '/employee', label: 'My Portal', emoji: '👤' };
      case 'deliveryGuy': return { path: '/employee', label: 'My Portal', emoji: '👤' };
      case 'stockEmployee': return { path: '/employee', label: 'My Portal', emoji: '👤' };
      default: return null;
    }
  };

  const dashLink = getDashboardLink();
  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="bg-white/85 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-200/50 transition-all duration-300">
      {/* Top Utility Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white text-xs">
        <div className="base-container py-1.5 flex items-center justify-between">
          <span className="hidden sm:inline">🛍️ {brandName} — Premium Tech & Gadgets</span>
          <span className="sm:hidden text-[11px]">🛍️ {brandName}</span>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline">📞 {brandPhone}</span>
            {/* Currency Toggle */}
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-0.5 transition-colors backdrop-blur-sm text-[11px] font-semibold"
              title="Toggle currency"
            >
              <RefreshCw size={10} className="opacity-70" />
              <span>{currency === 'LKR' ? 'LKR 🇱🇰' : 'USD 🇺🇸'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="base-container py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="text-2xl font-black text-slate-900 flex-shrink-0 flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Mobixa"
            className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200"
            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
          <span className="tracking-tight text-slate-900 whitespace-nowrap">Mobixa</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.filter((l) => l.show).map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.path)
                  ? 'text-primary-blue bg-blue-50'
                  : 'text-muted-text hover:text-dark-navy hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {dashLink && (
            <Link
              to={dashLink.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(dashLink.path)
                  ? 'text-primary-blue bg-blue-50'
                  : 'text-violet-600 hover:bg-violet-50'
              }`}
            >
              {dashLink.emoji} {dashLink.label}
            </Link>
          )}
        </nav>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search smartphones, laptops, accessories..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-full py-2.5 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white focus:border-blue-500 transition-all text-sm shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Search size={16} />
            </button>

            {/* Search Dropdown Results */}
            {showSearchResults && (featureResults.length > 0 || searchResults.length > 0) && (
              <div className="absolute top-full mt-2 w-full bg-white border border-card-border rounded-xl shadow-xl z-50 overflow-hidden">
                {featureResults.length > 0 && (
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-text bg-gray-50 border-b border-card-border">
                    Pages & Features
                  </div>
                )}
                {featureResults.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => {
                      navigate(f.path);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-card-border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-navy m-0 truncate">{f.label}</p>
                      <p className="text-xs text-muted-text m-0 truncate">{f.path}</p>
                    </div>
                    <span className="text-xs text-primary-blue font-semibold">Open</span>
                  </button>
                ))}

                {searchResults.length > 0 && (
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-text bg-gray-50 border-b border-card-border">
                    Products
                  </div>
                )}
                {searchResults.map((product) => (
                  <Link
                    key={product._id}
                    to={`/product/${product._id}`}
                    onClick={() => { setShowSearchResults(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-card-border last:border-b-0"
                  >
                    <img
                      src={getImageUrl(product.productLink || product.images?.[0]) || 'https://via.placeholder.com/50'}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => handleImageError(e, 'Product')}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-navy m-0 truncate">{product.name}</p>
                      <p className="text-xs text-muted-text m-0">{product.storeId?.name}</p>
                    </div>
                    <span className="text-sm font-bold text-primary-blue flex-shrink-0">
                      {getProductPrice(product)}
                    </span>
                  </Link>
                ))}
                <button
                  onClick={handleSearchSubmit}
                  className="w-full text-center py-2.5 text-sm text-primary-blue hover:bg-blue-50 transition-colors font-medium"
                >
                  View all results for "{searchQuery}"
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          {user && <NotificationBell />}

          {/* Wishlist */}
          {user && isCustomer && (
            <Link to="/wishlist" className="hidden sm:flex relative text-muted-text hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Wishlist">
              <Heart size={20} />
            </Link>
          )}

          {/* Cart */}
          {isCustomer && (
            <Link to="/cart" className="relative text-dark-navy hover:text-primary-blue transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="Cart">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-slate text-white text-[10px] font-bold rounded-full h-4.5 w-4.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* User Menu */}
          {user ? (
            <div className="relative group cursor-pointer">
              <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                {user.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-xs text-muted-text m-0 leading-tight">Hello, {user.name.split(' ')[0]}</p>
                  <p className="text-xs font-bold text-dark-navy m-0 leading-tight flex items-center gap-0.5">Account <ChevronDown size={12} /></p>
                </div>
              </div>

              {/* Dropdown */}
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-card-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-card-border">
                  <p className="text-sm font-semibold text-dark-navy m-0">{user.name}</p>
                  <p className="text-xs text-muted-text m-0">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-primary-blue/10 text-primary-blue px-2 py-0.5 rounded-full">{user.role}</span>
                </div>
                <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-navy hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <User size={14} /> My Profile
                </Link>
                {isCustomer && (
                  <>
                    <Link to="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-navy hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Package size={14} /> Orders
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-navy hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Heart size={14} /> Wishlist
                    </Link>
                    <Link to="/loyalty" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-navy hover:bg-amber-50 hover:text-amber-600 transition-colors">
                      🎁 <span>Loyalty & Rewards</span>
                    </Link>
                  </>
                )}
                <Link to={settingsLink} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-navy hover:bg-gray-50 transition-colors">
                  <Settings size={14} /> Settings
                </Link>
                {dashLink && (
                  <>
                    <hr className="my-1 border-card-border" />
                    <Link to={dashLink.path} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet-600 hover:bg-violet-50 font-medium transition-colors">
                      <LayoutDashboard size={14} /> {dashLink.emoji} {dashLink.label}
                    </Link>
                  </>
                )}
                <hr className="my-1 border-card-border" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"
                >
                  ↪ Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-dark-navy hover:text-primary-blue transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                <User size={18} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
              <Link to="/register" className="hidden sm:flex bg-primary-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-dark-navy p-1.5 rounded-lg hover:bg-gray-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-card-border animate-slideDown">
          <div className="base-container py-4 space-y-1">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="mb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tech devices..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-blue">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Nav Links */}
            {navLinks.filter((l) => l.show).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-blue bg-blue-50'
                    : 'text-dark-navy hover:bg-gray-50'
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            ))}

            {/* Dashboard Link */}
            {dashLink && (
              <Link
                to={dashLink.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <LayoutDashboard size={18} />
                {dashLink.emoji} {dashLink.label}
              </Link>
            )}

            {/* User Links */}
            {user && (
              <>
                <hr className="my-2 border-card-border" />
                {isCustomer && (
                  <>
                    <Link to="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50">
                      <Package size={18} /> My Orders
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50">
                      <Heart size={18} /> Wishlist
                    </Link>
                    <Link to="/loyalty" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50">
                      🎁 Loyalty & Rewards
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Currency Toggle */}
            <hr className="my-2 border-card-border" />
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50 w-full"
            >
              <RefreshCw size={18} />
              Switch to {currency === 'LKR' ? 'USD 🇺🇸' : 'LKR 🇱🇰'}
            </button>

            {/* Login/Logout */}
            {user ? (
              <>
                <hr className="my-2 border-card-border" />
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-semibold text-dark-navy m-0">{user.name}</p>
                  <p className="text-xs text-muted-text m-0">{user.email}</p>
                </div>
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50 transition-colors">
                  <User size={18} /> My Profile
                </Link>
                <Link to={settingsLink} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-navy hover:bg-gray-50 transition-colors">
                  <Settings size={18} /> Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  ↪ Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="flex-1 text-center bg-gray-100 text-dark-navy text-sm font-medium py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="flex-1 text-center bg-primary-blue text-white text-sm font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
