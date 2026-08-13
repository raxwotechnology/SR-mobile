import React, { useState } from 'react';
import { X, Smartphone, Phone, CreditCard, CheckCircle, AlertCircle, Loader2, TrendingUp, Package } from 'lucide-react';
import { createReload } from '../../services/api';
import { toast } from 'react-toastify';

const ReloadModal = ({ isOpen, onClose, storeId, accountId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mobileNumber: '',
    operator: 'Dialog',
    amount: '',
    type: 'Prepaid',
    paymentMethod: 'Cash',
    profitPercentage: '4',
    quantity: '1',
    notes: ''
  });

  const operators = [
    { name: 'Dialog', color: '#e11d48', logo: 'D' },
    { name: 'Mobitel', color: '#059669', logo: 'M' },
    { name: 'Hutch', color: '#f59e0b', logo: 'H' },
    { name: 'Airtel', color: '#ef4444', logo: 'A' },
    { name: 'SLT', color: '#0284c7', logo: 'S' },
    { name: 'Other', color: '#64748b', logo: 'O' }
  ];

  const types = ['Prepaid', 'Postpaid', 'Bill Payment', 'Scratch Card'];
  const methods = ['Cash', 'Card', 'Bank Transfer'];

  const isScratchCard = formData.type === 'Scratch Card';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!formData.mobileNumber && !isScratchCard) || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!accountId) {
      toast.error('Please select a target account in POS first');
      return;
    }

    try {
      setLoading(true);
      await createReload({
        ...formData,
        mobileNumber: formData.mobileNumber || (isScratchCard ? `CARD-${formData.operator}-${formData.amount}` : ''),
        amount: Number(formData.amount),
        quantity: Number(formData.quantity) || 1,
        profitPercentage: Number(formData.profitPercentage) || 4,
        isCard: isScratchCard,
        cardDenomination: isScratchCard ? Number(formData.amount) : undefined,
        storeId,
        accountId
      });
      toast.success(`${isScratchCard ? 'Scratch Card Sale' : 'Reload'} processed successfully! ✅`);
      setFormData({
        mobileNumber: '',
        operator: 'Dialog',
        amount: '',
        type: 'Prepaid',
        paymentMethod: 'Cash',
        profitPercentage: '4',
        quantity: '1',
        notes: ''
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const calculatedTotal = (Number(formData.amount) || 0) * (Number(formData.quantity) || 1);
  const calculatedProfit = calculatedTotal * ((Number(formData.profitPercentage) || 4) / 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Smartphone size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Quick Reload & Cards</h2>
              <p className="text-white/80 text-sm">Mobile Top-up, Bills & Scratch Cards (4% Profit)</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Operator Selection */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {operators.map((op) => (
              <button
                key={op.name}
                type="button"
                onClick={() => setFormData({ ...formData, operator: op.name })}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all ${
                  formData.operator === op.name 
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md"
                  style={{ backgroundColor: op.color }}
                >
                  {op.logo}
                </div>
                <span className="text-[10px] font-semibold text-slate-600">{op.name}</span>
              </button>
            ))}
          </div>

          {/* Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Transaction Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                    formData.type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isScratchCard ? 'Mobile / Ref (Optional)' : 'Mobile Number'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required={!isScratchCard}
                  placeholder={isScratchCard ? "Optional card ref" : "07x xxx xxxx"}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Amount / Card Denomination */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isScratchCard ? 'Card Denomination (Rs.)' : 'Amount (Rs.)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100, 159, 200"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600 text-sm"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Profit & Quantity inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Profit Margin %</span>
                <span className="text-[10px] text-emerald-600 font-bold">+Rs. {calculatedProfit.toFixed(2)} profit</span>
              </label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                <input
                  type="number"
                  step="0.1"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-emerald-600 text-sm"
                  value={formData.profitPercentage}
                  onChange={(e) => setFormData({ ...formData, profitPercentage: e.target.value })}
                />
              </div>
            </div>

            {isScratchCard ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Card Quantity</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    min="1"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-sm"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {methods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        formData.paymentMethod === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!accountId && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs animate-pulse">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-semibold">No target account selected in POS. Select an account to process transactions.</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !accountId}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all ${
              loading || !accountId
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle size={20} />
                Process {isScratchCard ? 'Scratch Card Sale' : 'Reload'} (Total: Rs. {calculatedTotal.toLocaleString()})
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReloadModal;
