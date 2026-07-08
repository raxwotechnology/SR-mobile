import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Lock, AlertTriangle, X } from 'lucide-react';
import { verifyPassword } from '../services/api';
import { toast } from 'react-toastify';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName = 'this item' }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Password is required');
      return;
    }
    setVerifying(true);
    setErrorMsg('');
    try {
      const { data } = await verifyPassword(password);
      if (data.success) {
        onConfirm();
        onClose();
      } else {
        setErrorMsg(data.message || 'Verification failed');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Incorrect login password');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100">
        
        {/* Header */}
        <div className="bg-rose-50 px-6 py-5 flex items-center gap-3 border-b border-rose-100">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-900 text-base">Security Verification</h3>
            <p className="text-[11px] text-rose-700 font-medium mt-0.5">Confirm action to delete {itemName}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-rose-100/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-slate-600 text-xs leading-relaxed font-medium">
            Deleting resources is irreversible. For security, please type your admin/manager account password to proceed.
          </div>

          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Enter Login Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center gap-1.5 animate-pulse">
                <span>⚠️</span> {errorMsg}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-100 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Confirm Delete'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
