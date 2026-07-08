import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Package } from 'lucide-react';
import { getCategories, getAdminProducts, createStockTransfer, updateStockTransferStatus } from '../../services/api';
import { toast } from 'react-toastify';

const StockTransferModal = ({ isOpen, onClose, stores }) => {
  const [fromStore, setFromStore] = useState('');
  const [toStore, setToStore] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferType, setTransferType] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset form
      setFromStore('');
      setToStore('');
      setSelectedCategory('');
      setSelectedProduct('');
      setQuantity('');
      setNotes('');
      setTrackingNumber('');
      setTransferType('cash');
      setAmountPaid('');
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const { data } = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    if (fromStore) {
      fetchProducts(fromStore);
    } else {
      setProducts([]);
      setFilteredProducts([]);
    }
  }, [fromStore]);

  const fetchProducts = async (storeId) => {
    setLoading(true);
    try {
      const { data } = await getAdminProducts({ storeId });
      const productsList = Array.isArray(data) ? data : (data.products || []);
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      toast.error('Failed to load products for store');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter(p => p.categoryId?._id === selectedCategory));
    } else {
      setFilteredProducts(products);
    }
    setSelectedProduct('');
  }, [selectedCategory, products]);

  const selectedProductObj = products.find(p => p._id === selectedProduct);
  const totalValuation = selectedProductObj && quantity ? (selectedProductObj.price * Number(quantity)) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromStore || !toStore || !selectedProduct || !quantity) {
      return toast.error('Please fill all required fields');
    }
    if (fromStore === toStore) {
      return toast.error('Source and Destination stores cannot be the same');
    }

    const maxStock = selectedProductObj?.stock || 0;
    if (Number(quantity) > maxStock) {
      return toast.error(`Insufficient stock! Maximum available is ${maxStock}`);
    }

    setSubmitting(true);
    try {
      const res = await createStockTransfer({
        fromStore,
        toStore,
        products: [{ productId: selectedProduct, quantity: Number(quantity) }],
        notes,
        trackingNumber,
        transferType,
        amountPaid: transferType === 'credit' ? Number(amountPaid || 0) : totalValuation
      });
      // Automatically complete the transfer so stock appears in destination store instantly
      await updateStockTransferStatus(res.data._id, { status: 'completed' });
      
      toast.success('Stock transferred successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-blue/10 flex items-center justify-center text-primary-blue">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-navy">Transfer Stock</h2>
              <p className="text-xs text-muted-text">Move products between branches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Source Store */}
            <div>
              <label className="block text-sm font-semibold text-dark-navy mb-1.5">From Branch (Source) *</label>
              <select required value={fromStore} onChange={e => setFromStore(e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-blue bg-white">
                <option value="">Select source branch...</option>
                {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            {/* Destination Store */}
            <div>
              <label className="block text-sm font-semibold text-dark-navy mb-1.5 flex items-center gap-2">
                <ArrowRight size={14} className="text-primary-blue" />
                To Branch (Destination) *
              </label>
              <select required value={toStore} onChange={e => setToStore(e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary-blue bg-white">
                <option value="">Select destination branch...</option>
                {stores.filter(s => s._id !== fromStore).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border border-card-border rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-dark-navy mb-3">Product Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1.5">Filter by Category</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full border border-card-border rounded-lg py-2 px-3 text-sm bg-white">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-muted-text mb-1.5">Select Product *</label>
                <select required value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} disabled={loading || !fromStore} className="w-full border border-card-border rounded-lg py-2 px-3 text-sm disabled:opacity-50 bg-white">
                  <option value="">{loading ? 'Loading...' : !fromStore ? 'Select source store first' : 'Select a product...'}</option>
                  {filteredProducts.map(p => (
                    <option key={p._id} value={p._id}>{p.name} (Available: {p.stock} {p.unit || 'units'} - Price: Rs. {p.price.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1.5">Quantity to Transfer *</label>
                <input type="number" required min="1" max={selectedProduct ? selectedProductObj?.stock : undefined} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 5" className="w-full border border-card-border rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary-blue bg-white" />
              </div>
            </div>
          </div>

          {/* Payment & Transfer Method */}
          <div className="border border-card-border rounded-xl p-4 mb-6 bg-slate-50">
            <h3 className="text-sm font-bold text-dark-navy mb-3">💰 Transfer Valuation & Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1.5">Transfer Mode *</label>
                <select value={transferType} onChange={e => setTransferType(e.target.value)} className="w-full border border-card-border rounded-lg py-2 px-3 text-sm bg-white">
                  <option value="cash">Cash (Paid Instantly)</option>
                  <option value="credit">Credit (Track Balance)</option>
                </select>
              </div>
              <div>
                <span className="block text-xs font-semibold text-muted-text mb-1.5">Total Transfer Value:</span>
                <span className="block text-lg font-bold text-dark-navy pt-1.5">Rs. {totalValuation.toLocaleString()}</span>
              </div>
              
              {transferType === 'credit' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-text mb-1.5">Amount Paid Now (Rs.)</label>
                    <input 
                      type="number" 
                      min="0"
                      max={totalValuation}
                      value={amountPaid} 
                      onChange={e => setAmountPaid(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full border border-card-border rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary-blue bg-white" 
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-muted-text mb-1.5">Outstanding Balance:</span>
                    <span className="block text-lg font-bold text-red-600 pt-1.5">Rs. {(totalValuation - Number(amountPaid || 0)).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-dark-navy mb-1.5">Tracking Number (Optional)</label>
              <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. TR-10294" className="w-full border border-card-border rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-primary-blue bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-navy mb-1.5">Transfer Notes & Details</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" placeholder="Relevant details about this transfer..." className="w-full border border-card-border rounded-xl py-2 px-4 text-sm resize-none focus:ring-2 focus:ring-primary-blue bg-white" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-card-border mt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-muted-text hover:bg-gray-50 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={submitting || !fromStore || !toStore || !selectedProduct || !quantity} className="bg-primary-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50 text-sm flex items-center gap-2">
              {submitting ? 'Initiating...' : 'Confirm Transfer'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferModal;
