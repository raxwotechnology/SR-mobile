import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, ShoppingBag, XCircle, Download, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { createCustomerReturn, getMyOrders, cancelMyOrder } from '../services/api';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';
import { getImageUrl, handleImageError } from '../utils/imageHelper';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingFor, setRequestingFor] = useState(null);
  const [returnForm, setReturnForm] = useState({
    productId: '',
    qty: 1,
    condition: 'good',
    reason: 'damaged_item',
    note: '',
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const { user } = useAuthStore();
  const { convertPrice, formatPrice } = useCurrencyStore();

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const { data } = await getMyOrders();
          setOrders(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user]);

  const statusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'packed': return 'bg-indigo-100 text-indigo-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isCancellable = (order) => {
    if (['cancelled', 'shipped', 'out_for_delivery', 'delivered', 'completed'].includes(order.orderStatus)) return false;
    const hours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    return hours <= 1;
  };

  const getCancelTimeLeft = (order) => {
    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    const remaining = (60 * 60 * 1000) - elapsed;
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    return `${mins}m left`;
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelMyOrder(orderId, { reason: 'Cancelled by customer' });
      toast.success('Order cancelled successfully');
      const { data } = await getMyOrders();
      setOrders(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const downloadBill = (order) => {
    const lines = [
      '═══════════════════════════════════════',
      '           ZAGE FASHION CORNER',
      '            PURCHASE RECEIPT',
      '═══════════════════════════════════════',
      '',
      `Order ID: #${order._id.slice(-8).toUpperCase()}`,
      `Date: ${new Date(order.createdAt).toLocaleString()}`,
      `Status: ${order.orderStatus.toUpperCase()}`,
      `Payment: ${order.paymentMethod?.toUpperCase() || 'N/A'}`,
      '',
      '───────────────────────────────────────',
      'ITEMS:',
      '───────────────────────────────────────',
    ];
    (order.items || []).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   Qty: ${item.quantity} × Rs. ${item.price?.toLocaleString()} = Rs. ${(item.price * item.quantity).toLocaleString()}`);
    });
    lines.push('───────────────────────────────────────');
    if (order.deliveryFee) lines.push(`Delivery Fee:    Rs. ${order.deliveryFee.toLocaleString()}`);
    if (order.tax) lines.push(`Tax:             Rs. ${order.tax.toLocaleString()}`);
    if (order.discountAmount) lines.push(`Discount:       -Rs. ${order.discountAmount.toLocaleString()}`);
    lines.push(`TOTAL:           Rs. ${order.totalAmount?.toLocaleString()}`);
    lines.push('');
    if (order.deliveryAddress) {
      lines.push(`Delivery: ${order.deliveryAddress.street}, ${order.deliveryAddress.city}`);
    }
    lines.push('');
    lines.push('═══════════════════════════════════════');
    lines.push('     Thank you for shopping with us!');
    lines.push('═══════════════════════════════════════');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mobile Hub_Receipt_${order._id.slice(-8).toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isReturnEligible = (order) => {
    if (!['delivered', 'completed'].includes(order.orderStatus)) return false;
    const deliveredAt = order.deliveredAt || order.completedAt || order.updatedAt || order.createdAt;
    const days = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  };

  const openReturnModal = (order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return;
    setRequestingFor(order);
    setReturnForm({
      productId: firstItem.productId,
      qty: 1,
      condition: 'good',
      reason: 'damaged_item',
      note: '',
    });
  };

  const submitReturnRequest = async (e) => {
    e.preventDefault();
    if (!requestingFor) return;
    const selected = requestingFor.items.find((i) => String(i.productId) === String(returnForm.productId));
    if (!selected) {
      toast.error('Select a valid product');
      return;
    }
    const qty = Number(returnForm.qty || 0);
    if (qty <= 0 || qty > Number(selected.quantity || 0)) {
      toast.error('Invalid return quantity');
      return;
    }
    setSubmittingReturn(true);
    try {
      await createCustomerReturn({
        orderId: requestingFor._id,
        items: [{
          productId: selected.productId,
          qty,
          condition: returnForm.condition,
          reason: returnForm.reason,
        }],
        notes: returnForm.note,
      });
      toast.success('Return request submitted');
      setRequestingFor(null);
      const { data } = await getMyOrders();
      setOrders(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (!user) {
    return (
      <div className="base-container py-20 text-center">
        <Package size={48} className="text-muted-text mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">Sign in to view orders</h2>
        <Link to="/login" className="text-primary-blue font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="base-container py-8">
        <h1 className="text-2xl font-bold text-dark-navy mt-0 mb-6">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-card-border rounded-2xl p-6 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-5 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="base-container py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-24 h-24 bg-emerald-50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ShoppingBag size={40} className="text-primary-blue" />
          </div>
          <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">No orders yet</h2>
          <p className="text-muted-text mb-6">Looks like you haven't placed any orders.</p>
          <Link to="/shop" className="bg-primary-blue text-white font-semibold py-3 px-8 rounded-full hover:bg-emerald-600 transition-all inline-block shadow-lg shadow-emerald-200">
            Start Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="base-container py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order, i) => (
          <motion.div
            key={order._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Link to={`/order-confirmation/${order._id}`} className="block bg-white border border-card-border rounded-2xl p-5 hover:shadow-lg hover:border-primary-blue transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-primary-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-dark-navy m-0 text-sm">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-muted-text m-0">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {' · '}{order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 mt-1 md:mt-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor(order.orderStatus)}`}>
                    {order.orderStatus.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-dark-navy">{formatPrice(convertPrice(order.totalAmount))}</span>
                  <ChevronRight size={18} className="text-muted-text group-hover:text-primary-blue transition-colors" />
                </div>
              </div>

              {/* Item previews */}
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {order.items.slice(0, 4).map((item, j) => (
                  <img 
                    key={j} 
                    src={getImageUrl(item.image) || 'https://via.placeholder.com/50'} 
                    alt="" 
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0" 
                    onError={(e) => handleImageError(e, 'Product')}
                  />
                ))}
                {order.items.length > 4 && (
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-muted-text font-medium">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {isCancellable(order) && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleCancel(order._id); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                  >
                    <XCircle size={14} /> Cancel Order
                    <span className="text-red-400 ml-1 flex items-center gap-0.5"><Clock size={10} />{getCancelTimeLeft(order)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); downloadBill(order); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                >
                  <Download size={14} /> Download Bill
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); if (isReturnEligible(order)) openReturnModal(order); }}
                  disabled={!isReturnEligible(order)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                    isReturnEligible(order)
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    isReturnEligible(order)
                      ? 'Request return'
                      : 'Returns available only for delivered/completed orders within 7 days'
                  }
                >
                  Request Return
                </button>
                {order.returnStatus && order.returnStatus !== 'none' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    Return: {order.returnStatus.replaceAll('_', ' ')}
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {requestingFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-card-border">
              <h3 className="text-lg font-bold text-dark-navy">Request Return (within 7 days)</h3>
            </div>
            <form onSubmit={submitReturnRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Product</label>
                <select
                  value={returnForm.productId}
                  onChange={(e) => setReturnForm((p) => ({ ...p, productId: e.target.value }))}
                  className="w-full border border-card-border rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  {(requestingFor.items || []).map((item, idx) => (
                    <option key={idx} value={item.productId}>{item.name} (sold: {item.quantity})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Qty</label>
                  <input type="number" min="1" value={returnForm.qty} onChange={(e) => setReturnForm((p) => ({ ...p, qty: e.target.value }))} className="w-full border border-card-border rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Condition</label>
                  <select value={returnForm.condition} onChange={(e) => setReturnForm((p) => ({ ...p, condition: e.target.value }))} className="w-full border border-card-border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="good">Not damaged</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Reason</label>
                <select value={returnForm.reason} onChange={(e) => setReturnForm((p) => ({ ...p, reason: e.target.value }))} className="w-full border border-card-border rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="damaged_item">Damaged item</option>
                  <option value="wrong_item">Wrong item</option>
                  <option value="quality_issue">Quality issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Note (optional)</label>
                <input value={returnForm.note} onChange={(e) => setReturnForm((p) => ({ ...p, note: e.target.value }))} className="w-full border border-card-border rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRequestingFor(null)} className="px-4 py-2 text-sm font-medium text-muted-text">Cancel</button>
                <button type="submit" disabled={submittingReturn} className="bg-primary-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
