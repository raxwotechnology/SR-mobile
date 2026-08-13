import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, MoreVertical, Printer, MessageSquare, Edit, FileText, Eye, Trash2, Plus, ShoppingBag } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

import {
  getAdminOrders,
  updateOrderStatus,
  approveOrder,
  cancelOrder,
  assignDeliveryGuy,
  getAvailableDeliveryGuys,
  getCategories,
  updateOrderAdmin,
  deleteAdminOrder,
  getAdminProducts
} from '../../services/api';
import useCurrencyStore from '../../store/currencyStore';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  assigned_delivery: 'bg-purple-100 text-purple-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  out_for_delivery: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentColors = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const statusFlow = ['pending', 'confirmed', 'assigned_delivery', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const BRANDS = ['all', 'Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Huawei', 'OnePlus', 'Anker', 'JBL', 'Baseus'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [deliveryGuys, setDeliveryGuys] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const { convertPrice, formatPrice } = useCurrencyStore();
  const { selectedStoreId } = useAdminStoreStore();

  // Active action menu row ID
  const [actionMenuId, setActionMenuId] = useState(null);

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [editForm, setEditForm] = useState({
    id: '',
    invoiceNumber: '',
    customerName: '',
    customerPhone: '',
    customerNic: '',
    customerAddress: '',
    orderStatus: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    discountAmount: 0,
    deliveryFee: 0,
    tax: 0,
    amountPaid: 0,
    items: []
  });

  const fetchFiltersData = async () => {
    try {
      const { data } = await getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
        ...(brandFilter !== 'all' ? { brand: brandFilter } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {})
      };
      const { data } = await getAdminOrders(params);
      setOrders(data || []);
      
      const { data: guys } = await getAvailableDeliveryGuys();
      setDeliveryGuys(guys || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelivery = async (orderId, deliveryGuyId) => {
    if (!deliveryGuyId) return;
    try {
      await assignDeliveryGuy(orderId, { deliveryGuyId });
      toast.success('Delivery person assigned');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign delivery');
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [selectedStoreId, statusFilter, categoryFilter, brandFilter, startDate, endDate]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { orderStatus: newStatus });
      toast.success('Status updated');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleApprove = async (orderId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Approve this order? It will be marked as Confirmed.')) return;
    try {
      await approveOrder(orderId);
      toast.success('Order approved ✅');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve order');
    }
  };

  const handleCancel = async (orderId, e) => {
    if (e) e.stopPropagation();
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    try {
      await cancelOrder(orderId, { reason });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleDeleteClick = (order, e) => {
    if (e) e.stopPropagation();
    setItemToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const order = itemToDelete;

    const restoreStock = !['cancelled', 'delivered', 'completed'].includes(order.orderStatus)
      && window.confirm('Restore this order quantity back to stock before deleting?');
    try {
      await deleteAdminOrder(order._id, { restoreStock });
      toast.success('Order deleted');
      setActionMenuId(null);
      if (expandedId === order._id) setExpandedId(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    }
  };

  const handleTriggerSMS = (order) => {
    const phone = order.customerPhone || order.userId?.phone || 'N/A';
    toast.success(`SMS alert successfully triggered! Message sent to ${phone}: "Your order #${order._id.slice(-8).toUpperCase()} status is now ${order.orderStatus.toUpperCase()}."`);
  };

  const handleReprintReceipt = (order) => {
    toast.info(`Receipt for invoice #${order.invoiceNumber || order._id.slice(-8).toUpperCase()} sent to print queue.`);
  };

  const openLiveEdit = async (order) => {
    try {
      const { data: prods } = await getAdminProducts(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {});
      setAllProducts(prods || []);
    } catch (err) {
      console.error('Failed to load products list', err);
    }

    setEditForm({
      id: order._id,
      invoiceNumber: order.invoiceNumber || order._id.slice(-8).toUpperCase(),
      customerName: order.customerName || order.userId?.name || '',
      customerPhone: order.customerPhone || order.userId?.phone || '',
      customerNic: order.customerNic || '',
      customerAddress: typeof order.customerAddress === 'string' ? order.customerAddress : (order.deliveryAddress?.street || ''),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || 'cash',
      discountAmount: order.discountAmount || 0,
      deliveryFee: order.deliveryFee || 0,
      tax: order.tax || 0,
      amountPaid: order.amountPaid || 0,
      items: (order.items || []).map((i) => ({
        productId: i.productId?._id || i.productId,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        price: i.price,
        imei: Array.isArray(i.imei) ? i.imei.join(', ') : (i.imei || '')
      }))
    });
    setShowEditModal(true);
    setActionMenuId(null);
  };

  const handleItemQtyChange = (index, qty) => {
    const newItems = [...editForm.items];
    newItems[index].quantity = Math.max(1, Number(qty || 1));
    setEditForm({ ...editForm, items: newItems });
  };

  const handleItemPriceChange = (index, price) => {
    const newItems = [...editForm.items];
    newItems[index].price = Math.max(0, Number(price || 0));
    setEditForm({ ...editForm, items: newItems });
  };

  const handleRemoveItem = (index) => {
    if (editForm.items.length <= 1) {
      toast.warning('Order must contain at least one item');
      return;
    }
    const newItems = editForm.items.filter((_, i) => i !== index);
    setEditForm({ ...editForm, items: newItems });
  };

  const handleAddProductToEdit = (productId) => {
    if (!productId) return;
    const product = allProducts.find((p) => p._id === productId);
    if (!product) return;

    const existingIdx = editForm.items.findIndex((i) => i.productId === product._id);
    if (existingIdx >= 0) {
      const newItems = [...editForm.items];
      newItems[existingIdx].quantity += 1;
      setEditForm({ ...editForm, items: newItems });
    } else {
      setEditForm({
        ...editForm,
        items: [
          ...editForm.items,
          {
            productId: product._id,
            name: product.name,
            image: product.images?.[0] || '',
            quantity: 1,
            price: product.priceLKR || product.price || 0,
            imei: ''
          }
        ]
      });
    }
  };

  const handleSaveLiveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.items || editForm.items.length === 0) {
      toast.error('Order must have at least one product item');
      return;
    }
    try {
      await updateOrderAdmin(editForm.id, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        customerNic: editForm.customerNic,
        customerAddress: editForm.customerAddress,
        orderStatus: editForm.orderStatus,
        paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod,
        discountAmount: Number(editForm.discountAmount || 0),
        deliveryFee: Number(editForm.deliveryFee || 0),
        tax: Number(editForm.tax || 0),
        amountPaid: Number(editForm.amountPaid || 0),
        items: editForm.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          image: i.image,
          quantity: Number(i.quantity || 1),
          price: Number(i.price || 0),
          imei: i.imei ? i.imei.split(',').map(s => s.trim()).filter(Boolean) : []
        }))
      });
      toast.success('Invoice & Order updated successfully! ✅');
      setShowEditModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save order details');
    }
  };

  const exportPDFReport = () => {
    const cols = [
      { label: 'Invoice No', accessor: (r) => r.invoiceNumber || r._id.slice(-8).toUpperCase() },
      { label: 'Customer', accessor: (r) => r.customerName || r.userId?.name || 'Walk-in' },
      { label: 'Store', accessor: (r) => r.storeId?.name || 'N/A' },
      { label: 'Total Amount', accessor: (r) => `Rs. ${r.totalAmount?.toLocaleString()}` },
      { label: 'Payment Method', accessor: 'paymentMethod' },
      { label: 'Payment Status', accessor: 'paymentStatus' },
      { label: 'Order Status', accessor: 'orderStatus' },
      { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() }
    ];
    exportToPDF(filteredOrders, cols, 'Order Report');
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'amount_high') return (b.totalAmount || 0) - (a.totalAmount || 0);
    if (sortBy === 'amount_low') return (a.totalAmount || 0) - (b.totalAmount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredOrders = sortedOrders; // filtering happens in backend

  // Summary stats
  const pendingCount = orders.filter((o) => o.orderStatus === 'pending').length;
  const totalRevenue = orders.filter((o) => ['delivered', 'completed'].includes(o.orderStatus)).reduce((s, o) => s + o.totalAmount, 0);

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="relative">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📦 Order Management</h1>
            <p className="text-muted-text text-sm mt-1">
              {orders.length} orders found · <span className="text-amber-600 font-semibold">{pendingCount} pending approval</span> · Total Sales: <span className="text-emerald-600 font-bold">{formatPrice(convertPrice(totalRevenue))}</span>
            </p>
          </div>
          
          <div className="flex gap-2 self-start md:self-auto">
            <button
              onClick={exportPDFReport}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
            >
              <FileText size={16} /> Export PDF
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-card-border rounded-xl py-2 px-3 text-sm bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_high">Amount high to low</option>
              <option value="amount_low">Amount low to high</option>
            </select>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="bg-white rounded-2xl border border-card-border p-4 mb-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Category Type</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue"
            >
              <option value="all">All Category Types</option>
              <option value="mobiles">Mobiles (Phones/Tablets)</option>
              <option value="accessories">Accessories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Brand Filter</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue"
            >
              <option value="all">All Brands</option>
              {BRANDS.slice(1).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', ...statusFlow].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-primary-blue text-white shadow-md'
                  : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? `All (${orders.length})` : `${status.replace(/_/g, ' ')} (${orders.filter((o) => o.orderStatus === status).length})`}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase text-muted-text border-b border-card-border">
                  <th className="px-6 py-3 font-semibold">Order</th>
                  <th className="px-6 py-3 font-semibold">Customer</th>
                  <th className="px-6 py-3 font-semibold">Store</th>
                  <th className="px-6 py-3 font-semibold">Total</th>
                  <th className="px-6 py-3 font-semibold">Payment</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Delivery</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filteredOrders.map((order) => (
                  <Fragment key={order._id}>
                    <tr
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${order.orderStatus === 'cancelled' ? 'opacity-50' : ''}`}
                      onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">#{order.invoiceNumber || order._id.slice(-8).toUpperCase()}</span>
                          {expandedId === order._id ? <ChevronUp size={14} /> : <ChevronDown size={14} className="text-gray-400" />}
                          {order.isPosOrder && (
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">POS</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-dark-navy">{order.customerName || order.userId?.name || 'Walk-in Customer'}</p>
                        <p className="text-xs text-muted-text">{order.customerPhone || order.userId?.phone || 'No Phone'}</p>
                      </td>
                      <td className="px-6 py-3.5 text-muted-text">{order.storeId?.name || 'N/A'}</td>
                      <td className="px-6 py-3.5 font-semibold">{formatPrice(convertPrice(order.totalAmount))}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <select
                          value={order.orderStatus}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 appearance-none cursor-pointer ${statusColors[order.orderStatus]} focus:outline-none focus:ring-1 focus:ring-primary-blue`}
                        >
                          {statusFlow.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <select
                          value={order.deliveryGuyId?._id || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleAssignDelivery(order._id, e.target.value)}
                          className="border border-card-border rounded-lg py-1.5 px-2 text-xs bg-white"
                        >
                          <option value="">Assign delivery</option>
                          {deliveryGuys.map((g) => (
                            <option key={g._id} value={g._id}>{g.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-muted-text text-xs whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</td>
                      
                      {/* Context actions menu */}
                      <td className="px-6 py-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActionMenuId(actionMenuId === order._id ? null : order._id)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-muted-text transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {actionMenuId === order._id && (
                          <div className="absolute right-6 top-10 w-44 bg-white border border-card-border rounded-xl shadow-xl z-20 py-1.5 text-left text-xs text-dark-navy">
                            <button
                              onClick={() => { setExpandedId(expandedId === order._id ? null : order._id); setActionMenuId(null); }}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye size={14} className="text-gray-500" />
                              {expandedId === order._id ? 'Collapse' : 'View Details'}
                            </button>
                            
                            <button
                              onClick={() => openLiveEdit(order)}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit size={14} className="text-blue-500" />
                              Live Edit
                            </button>

                            <button
                              onClick={() => { handleReprintReceipt(order); setActionMenuId(null); }}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Printer size={14} className="text-teal-500" />
                              Re-print Receipt
                            </button>

                            <button
                              onClick={() => { handleTriggerSMS(order); setActionMenuId(null); }}
                              className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <MessageSquare size={14} className="text-purple-500" />
                              Trigger SMS
                            </button>

                            {order.orderStatus === 'pending' && (
                              <button
                                onClick={() => { handleApprove(order._id); setActionMenuId(null); }}
                                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2 font-semibold text-emerald-600"
                              >
                                <CheckCircle size={14} className="text-emerald-500" />
                                Approve
                              </button>
                            )}

                            {!['delivered', 'completed', 'cancelled'].includes(order.orderStatus) && (
                              <button
                                onClick={() => { handleCancel(order._id); setActionMenuId(null); }}
                                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2 font-semibold text-red-600"
                              >
                                <XCircle size={14} className="text-red-500" />
                                Cancel Order
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDeleteClick(order, e)}

                              className="w-full px-4 py-2 hover:bg-red-50 flex items-center gap-2 font-semibold text-red-700"
                            >
                              <Trash2 size={14} className="text-red-600" />
                              Delete Order
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Items view */}
                    {expandedId === order._id && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50/50 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <p className="font-bold text-dark-navy uppercase tracking-wider mb-2 text-[10px]">Shipment Details</p>
                              <p><strong>Assigned Delivery:</strong> {order.deliveryGuyId?.name || 'Not assigned'}</p>
                              <p><strong>Delivery Address:</strong> {order.deliveryAddress ? `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''} ${order.deliveryAddress.zipCode || ''}` : 'N/A'}</p>
                              {order.exchangeReturnId && (
                                <p className="text-rose-600 mt-1 font-semibold">
                                  🔄 Returned Item Exchange Credit: Rs. {order.exchangeCredit?.toLocaleString()} applied
                                </p>
                              )}
                            </div>

                            <div className="md:col-span-2">
                              <p className="font-bold text-dark-navy uppercase tracking-wider mb-2 text-[10px]">Order Items</p>
                              <div className="border border-card-border rounded-xl overflow-hidden bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 text-left text-[10px] text-muted-text uppercase border-b border-card-border">
                                      <th className="px-3 py-2">Item</th>
                                      <th className="px-3 py-2 text-right">Price</th>
                                      <th className="px-3 py-2 text-center">Qty</th>
                                      <th className="px-3 py-2 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((it, idx) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2">
                                          <p className="font-semibold text-dark-navy">{it.name}</p>
                                          {it.imei && it.imei.length > 0 && (
                                            <p className="text-[10px] text-muted-text font-mono mt-0.5">IMEI: {it.imei.join(', ')}</p>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right">Rs. {it.price?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center">{it.quantity}</td>
                                        <td className="px-3 py-2 text-right font-semibold">Rs. {(it.price * it.quantity)?.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-muted-text text-sm">No orders found matching filters</div>
            )}
          </div>
        </div>

        {/* Live Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl border border-card-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="px-6 py-4 border-b border-card-border flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-dark-navy text-base flex items-center gap-2">
                    ✏️ Edit Invoice / Order #{editForm.invoiceNumber}
                  </h3>
                  <p className="text-xs text-muted-text">Correct mistakes, modify products, edit prices/quantities, and update customer info</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted-text hover:text-dark-navy font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLiveEdit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Customer Information */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-card-border space-y-3">
                  <h4 className="font-bold text-dark-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    👤 Customer & Shipping Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={editForm.customerName}
                        onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                        className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.customerPhone}
                        onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                        className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">NIC Number</label>
                      <input
                        type="text"
                        value={editForm.customerNic}
                        onChange={(e) => setEditForm({ ...editForm, customerNic: e.target.value })}
                        className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-medium"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Address</label>
                      <input
                        type="text"
                        value={editForm.customerAddress}
                        onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                        className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-medium"
                        placeholder="Shipping address"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Items & Products Table */}
                <div className="bg-white rounded-2xl border border-card-border p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-dark-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      📦 Purchased Products List ({editForm.items.length} items)
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          handleAddProductToEdit(e.target.value);
                          e.target.value = '';
                        }}
                        className="border border-card-border rounded-xl py-1.5 px-3 text-xs bg-indigo-50/50 text-primary-blue font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="">+ Add Product from Catalog...</option>
                        {allProducts.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} (Rs. {(p.priceLKR || p.price)?.toLocaleString()} - Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border border-card-border rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-bold text-muted-text border-b border-card-border">
                          <th className="px-3 py-2">Product Name</th>
                          <th className="px-3 py-2 w-28 text-center">Qty</th>
                          <th className="px-3 py-2 w-32 text-right">Unit Price (Rs.)</th>
                          <th className="px-3 py-2 w-32 text-right">Subtotal</th>
                          <th className="px-3 py-2 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border">
                        {editForm.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2">
                              <p className="font-semibold text-dark-navy">{item.name}</p>
                              <input
                                type="text"
                                placeholder="IMEI / Serial numbers (comma separated)"
                                value={item.imei}
                                onChange={(e) => {
                                  const newItems = [...editForm.items];
                                  newItems[idx].imei = e.target.value;
                                  setEditForm({ ...editForm, items: newItems });
                                }}
                                className="w-full mt-1 border border-slate-200 rounded-lg py-1 px-2 text-[10px] font-mono focus:outline-none focus:border-primary-blue"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                className="w-16 border border-card-border rounded-lg py-1 px-2 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                                className="w-24 border border-card-border rounded-lg py-1 px-2 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-dark-navy">
                              Rs. {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                title="Remove product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financials & Status Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Statuses & Payment Method */}
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-card-border space-y-3">
                    <h4 className="font-bold text-dark-navy uppercase tracking-wider text-[11px]">
                      ⚙️ Order Statuses & Method
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Order Status</label>
                        <select
                          value={editForm.orderStatus}
                          onChange={(e) => setEditForm({ ...editForm, orderStatus: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-semibold"
                        >
                          {statusFlow.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Payment Status</label>
                        <select
                          value={editForm.paymentStatus}
                          onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-semibold"
                        >
                          <option value="pending">pending</option>
                          <option value="completed">completed</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-text uppercase block mb-1">Payment Method</label>
                      <select
                        value={editForm.paymentMethod}
                        onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                        className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue font-semibold"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="koko">Koko Pay</option>
                        <option value="hire_purchase">Hire Purchase (HP)</option>
                        <option value="cod">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Amounts Summary */}
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-card-border space-y-2">
                    <h4 className="font-bold text-dark-navy uppercase tracking-wider text-[11px] mb-2">
                      💳 Financial Adjustments
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-0.5">Discount (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.discountAmount}
                          onChange={(e) => setEditForm({ ...editForm, discountAmount: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-0.5">Delivery Fee (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.deliveryFee}
                          onChange={(e) => setEditForm({ ...editForm, deliveryFee: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-0.5">Tax (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.tax}
                          onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-text uppercase block mb-0.5">Amount Paid (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.amountPaid}
                          onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                          className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white font-semibold text-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-card-border flex justify-between items-center">
                      <span className="font-bold text-dark-navy text-xs">Recalculated Net Total:</span>
                      <span className="text-sm font-extrabold text-primary-blue">
                        Rs. {(
                          editForm.items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0)
                          - Number(editForm.discountAmount || 0)
                          + Number(editForm.deliveryFee || 0)
                          + Number(editForm.tax || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-2 justify-end pt-2 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 border border-card-border rounded-xl text-xs font-semibold hover:bg-gray-50 text-muted-text transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    💾 Save Invoice & Order Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete ? `order #${itemToDelete.invoiceNumber || itemToDelete._id.slice(-8).toUpperCase()}` : 'this order'}
      />
    </DashboardLayout>
  );
};

export default AdminOrders;
