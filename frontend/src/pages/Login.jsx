import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import { loginUser } from '../services/api';
import { toast } from 'react-toastify';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, logout } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Mobile Hub';
  const brandLogoUrl = settings?.logoUrl;
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginUser({ email, password });
      login(data);
      toast.success(`Welcome back, ${data.name}!`);
      const redirectMap = { admin: '/admin', manager: '/manager', cashier: '/employee', deliveryGuy: '/employee', stockEmployee: '/employee' };
      navigate(redirectMap[data.role] || '/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    logout();
    toast.info('Logged out. You can now sign in with a different account.');
  };

  const handleMockLogin = (adminKey) => {
    const mockData = {
      admin1: {
        _id: "mock_admin_1_" + Date.now(),
        name: "Talk N Fix Admin 1 (Mock)",
        email: "admin@mobilehub.com",
        role: "admin",
        isSuperAdmin: true,
        token: "mock_jwt_token_bypass",
        permissions: {
          inventory: true,
          finance: true,
          products: true,
          sales: true,
          reports: true,
          employees: true,
          suppliers: true,
          customers: true,
          rewards: true,
          vouchers: true,
          settings: true,
        }
      },
      admin2: {
        _id: "mock_admin_2_" + Date.now(),
        name: "Talk N Fix Admin 2 (Mock)",
        email: "admin2@mobilehub.com",
        role: "admin",
        isSuperAdmin: true,
        token: "mock_jwt_token_bypass",
        permissions: {
          inventory: true,
          finance: true,
          products: true,
          sales: true,
          reports: true,
          employees: true,
          suppliers: true,
          customers: true,
          rewards: true,
          vouchers: true,
          settings: true,
        }
      }
    };

    const selectedAdmin = mockData[adminKey];
    login(selectedAdmin);
    toast.success(`Welcome back, ${selectedAdmin.name}! (Offline Mock Mode)`);
    navigate('/admin');
  };

  // If already logged in, show continue/switch options
  if (isAuthenticated && user) {
    const redirectMap = { admin: '/admin', manager: '/manager', cashier: '/employee', deliveryGuy: '/employee', stockEmployee: '/employee' };
    const dashPath = redirectMap[user.role] || '/';

    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-stone-100 py-12">
        <motion.div
          className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-card-border w-full max-w-md mx-4"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-6">
            <Link to="/" className="text-3xl font-bold text-primary-blue inline-flex items-center gap-2 mb-4">
              {brandLogoUrl && <img src={brandLogoUrl} alt={brandName} className="w-9 h-9 rounded object-cover" />}
              <span>{brandName}</span>
            </Link>
            <h1 className="text-2xl font-bold text-dark-navy mt-0 mb-2">Already Signed In</h1>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md mx-auto mb-3">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-lg font-semibold text-dark-navy m-0">{user.name}</p>
            <p className="text-sm text-muted-text m-0">{user.email}</p>
            <span className="inline-block mt-2 text-xs font-bold uppercase bg-primary-blue/10 text-primary-blue px-3 py-1 rounded-full">{user.role}</span>
          </div>

          <button
            onClick={() => navigate(dashPath)}
            className="w-full bg-primary-blue text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-blue-200 mb-3"
          >
            Continue as {user.name.split(' ')[0]}
          </button>

          <button
            onClick={handleSwitchAccount}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-dark-navy font-semibold py-3.5 rounded-xl hover:bg-gray-200 transition-all"
          >
            <LogOut size={16} />
            Switch Account
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-stone-100 py-12">
      <motion.div
        className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-card-border w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-blue inline-flex items-center gap-2 mb-4">
            {brandLogoUrl && <img src={brandLogoUrl} alt={brandName} className="w-9 h-9 rounded object-cover" />}
            <span>{brandName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-dark-navy mt-0 mb-2">Welcome Back</h1>
          <p className="text-muted-text m-0">Sign in to continue your tech and smart devices shopping</p>
        </div>

        <form onSubmit={submitHandler} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="login-email">
              Email Address
            </label>
            <input
              type="email"
              id="login-email"
              className="w-full border border-card-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-dark-navy" htmlFor="login-password">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-primary-blue hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                className="w-full border border-card-border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text hover:text-dark-navy"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-blue text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 font-medium">Quick Admin Access</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@mobilehub.com');
                setPassword('admin123');
                toast.info('Filled Admin 1 credentials');
              }}
              className="text-xs font-semibold py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-dark-navy text-center transition-all"
            >
              Fill Admin 1
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin2@mobilehub.com');
                setPassword('admin456');
                toast.info('Filled Admin 2 credentials');
              }}
              className="text-xs font-semibold py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-dark-navy text-center transition-all"
            >
              Fill Admin 2
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleMockLogin('admin1')}
              className="text-xs font-semibold py-2.5 px-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 text-indigo-700 text-center transition-all"
            >
              Bypass Admin 1
            </button>
            <button
              type="button"
              onClick={() => handleMockLogin('admin2')}
              className="text-xs font-semibold py-2.5 px-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 text-indigo-700 text-center transition-all"
            >
              Bypass Admin 2
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-text">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-blue font-semibold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
