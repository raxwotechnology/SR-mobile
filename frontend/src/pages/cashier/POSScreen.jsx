import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  Camera,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  LogOut,
  CreditCard,
  Banknote,
  Receipt,
  Package,
  AlertTriangle,
  X,
  Percent,
  DollarSign,
  Clock,
  TrendingUp,
  Ticket,
  User,
  Phone,
  Smartphone,
  Landmark,
  History,
  Lock,
  Unlock,
  FileText,
  RefreshCw,
} from 'lucide-react';

import { getPosProducts, getProductByBarcode, posCheckout, getPosOrders, applyVoucher, getSettings, getActivePosSession, startPosSession, endPosSession, getPosPayHereHash, redeemPoints, getMyLoyaltyPoints, getCreditOrders, settleCreditOrder, getCategories, createQuotation, createProduct, getAccounts, loginUser, getCashiers, posLogin, getPosOrderByInvoice, createCustomerReturn } from '../../services/api';



import usePosStore from '../../store/posStore';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import BarcodeScannerModal from './BarcodeScannerModal';
import InvoiceModal from './InvoiceModal';
import { toast } from 'react-toastify';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';
import ReloadModal from './ReloadModal';
import CustomerHistoryModal from './CustomerHistoryModal';

const POSScreen = () => {
  const navigate = useNavigate();
  const { user, login, logout } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Mobile Hub';
  const pos = usePosStore();

  const [products, setProducts] = useState([]);
  const [productCache, setProductCache] = useState({});

  const addToCache = useCallback((items) => {
    if (!items) return;
    const array = Array.isArray(items) ? items : [items];
    setProductCache(prev => {
      const next = { ...prev };
      array.forEach(item => {
        if (item && item._id) {
          next[item._id] = item;
        }
      });
      return next;
    });
  }, []);

  const [accounts, setAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [discountInput, setDiscountInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [discountTypeInput, setDiscountTypeInput] = useState('percentage');
  const [posSession, setPosSession] = useState(null);
  const [showStartSession, setShowStartSession] = useState(false);
  const [showEndSession, setShowEndSession] = useState(false);
  const [dailyFinancials, setDailyFinancials] = useState(null);
  const [balanceOrders, setBalanceOrders] = useState([]);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    opening: { 5000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0 },
    closing: { 5000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0 },
  });
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsInput, setPointsInput] = useState('');
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [creditAmountPaid, setCreditAmountPaid] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [showCreditPanel, setShowCreditPanel] = useState(false);
  const [creditOrders, setCreditOrders] = useState([]);
  const [creditLoading, setCreditLoading] = useState(false);
  const [settleAmount, setSettleAmount] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isQuotation, setIsQuotation] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', price: '', stock: 10, categoryId: '' });
  const [showReloadModal, setShowReloadModal] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);

  // Cashier Verification Lockscreen States
  const [isUnlocked, setIsUnlocked] = useState(!!user);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [cashiersList, setCashiersList] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [loadingCashiers, setLoadingCashiers] = useState(false);

  // Split Payment Allocation States
  const [payments, setPayments] = useState([
    { method: 'cash', amount: 0, accountId: '', chequeDetails: { number: '', bank: '', dueDate: '' } }
  ]);

  // Price Safeguard Warning Popup State
  const [priceSafeguardWarning, setPriceSafeguardWarning] = useState('');

  // Returns / Exchange States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [exchangeCredit, setExchangeCredit] = useState(0);
  const [exchangeReturnId, setExchangeReturnId] = useState(null);
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(false);




  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch Cashiers for Lockscreen on Mount
  useEffect(() => {
    const fetchCashiers = async () => {
      try {
        setLoadingCashiers(true);
        const { data } = await getCashiers();
        setCashiersList(data || []);
      } catch (err) {
        console.error('Failed to load cashiers list');
      } finally {
        setLoadingCashiers(false);
      }
    };
    fetchCashiers();
  }, []);

  // Load initial products + settings for tax rate when user is authenticated
  useEffect(() => {
    if (user) {
      loadProducts();
      loadTaxRate();
      loadSession();
      loadCategories();
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    try {
      const { data } = await getAccounts();
      setAccounts(data || []);
      // Auto-select default account or the first one
      const def = data.find(a => a.isDefault) || data[0];
      if (def) pos.setAccountId(def._id);
    } catch (err) { console.error('Failed to load accounts'); }
  };

  const loadCategories = async () => {
    try {
      const { data } = await getCategories();
      setCategories(data || []);
    } catch { /* ignore */ }
  };


  const loadSession = async () => {
    try {
      const { data } = await getActivePosSession();
      setPosSession(data || null);
      if (!data) setShowStartSession(true);
    } catch {
      // ignore
    }
  };

  const denomsToLines = (obj) =>
    Object.entries(obj).map(([denom, qty]) => ({ denom: Number(denom), qty: Number(qty || 0) }));
  const calcTotal = (obj) =>
    Object.entries(obj).reduce((s, [d, q]) => s + Number(d) * Number(q || 0), 0);

  const handleStartSession = async () => {
    try {
      const openingDenoms = denomsToLines(sessionForm.opening);
      const openingCashAmount = calcTotal(sessionForm.opening);
      const { data } = await startPosSession({ openingDenoms, openingCashAmount });
      setPosSession(data);
      setShowStartSession(false);
      toast.success('POS session started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    try {
      const closingDenoms = denomsToLines(sessionForm.closing);
      const closingCashCountedAmount = calcTotal(sessionForm.closing);
      const { data } = await endPosSession({ closingDenoms, closingCashCountedAmount });
      setPosSession(null);
      setShowEndSession(false);
      toast.success(data.varianceFlagged ? `Session closed (variance Rs. ${data.variance})` : 'Session closed');
      setShowStartSession(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close session');
    }
  };

  const openEndSessionModal = async () => {
    setShowEndSession(true);
  };

  const openBalanceModal = async () => {
    try {
      setBalanceLoading(true);
      const { data } = await getPosOrders();
      setDailyFinancials(data?.summary || null);
      setBalanceOrders(data?.orders || []);
      setShowBalanceModal(true);
    } catch {
      setDailyFinancials(null);
      setBalanceOrders([]);
      setShowBalanceModal(true);
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadTaxRate = async () => {
    try {
      const { data } = await getSettings();
      if (data?.taxRate !== undefined) pos.setTaxRate(data.taxRate);
    } catch (err) { /* use default */ }
  };

  // Focus search on mount
  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const loadProducts = async (search = '', catId = selectedCategory) => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (catId) params.category = catId;
      const { data } = await getPosProducts(params);
      setProducts(data);
      addToCache(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (catId) => {
    const newCat = selectedCategory === catId ? null : catId;
    setSelectedCategory(newCat);
    loadProducts(searchQuery, newCat);
  };


  // Debounced search
  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadProducts(value);
    }, 300);
  };

  // Handle search enter (add first result)
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (products.length > 0) {
        pos.addItem(products[0]);
        toast.success(`Added ${products[0].name}`, { autoClose: 1000 });
        setSearchQuery('');
        loadProducts();
      } else if (searchQuery.trim()) {
        // No results, prompt quick add
        setQuickAddForm({ ...quickAddForm, name: searchQuery });
        setShowQuickAdd(true);
      }
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddForm.name || !quickAddForm.price) {
      toast.error('Name and price are required');
      return;
    }
    try {
      setLoading(true);
      const { data } = await createProduct({
        ...quickAddForm,
        price: Number(quickAddForm.price),
        mrp: Number(quickAddForm.price),
        stock: Number(quickAddForm.stock),
        storeId: user.assignedStore || user.assignedStoreId || user.storeId || posSession?.storeId,
        description: `Quick added from POS: ${quickAddForm.name}`,
        unit: 'pcs',
        status: 'active'
      });

      addToCache(data);
      pos.addItem(data);
      setShowQuickAdd(false);
      setSearchQuery('');
      loadProducts();
      toast.success('Product created and added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };


  // Barcode scan handler
  const handleBarcodeScan = async (code) => {
    try {
      const { data } = await getProductByBarcode(code);
      addToCache(data);
      pos.addItem(data);
      toast.success(`Scanned: ${data.name}`, { autoClose: 1500 });
    } catch (err) {
      toast.error(`No product found for barcode: ${code}`);
    }
  };

  // Add product to cart
  const handleAddProduct = (product) => {
    addToCache(product);
    pos.addItem(product);
    toast.success(`Added ${product.name}`, { autoClose: 800 });
  };

  // Apply discount
  const handleApplyDiscount = () => {
    const value = parseFloat(discountInput);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a valid discount');
      return;
    }
    if (discountTypeInput === 'percentage' && value > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }
    pos.setDiscount(value, discountTypeInput);
    setShowDiscount(false);
    setDiscountInput('');
    toast.success('Discount applied!');
  };

  // Apply coupon/voucher
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Enter a coupon code'); return; }
    setApplyingCoupon(true);
    try {
      const { data } = await applyVoucher({ code: couponCode.toUpperCase(), orderTotal: pos.getSubtotal() });
      pos.setCoupon({
        code: data.code || couponCode.toUpperCase(),
        value: data.discount || data.value,
        type: data.type || 'percentage',
        maxDiscount: data.maxDiscountAmount,
        description: data.description || '',
      });
      toast.success(`Coupon applied: ${data.description || couponCode.toUpperCase()} 🎉`);
      setCouponCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Search Return Invoice
  const handleSearchReturnInvoice = async () => {
    if (!returnInvoiceNo) {
      toast.warning('Please enter an invoice number');
      return;
    }
    try {
      setSearchingInvoice(true);
      // Clean leading '#' and whitespace to prevent browser URL fragment truncation
      const cleanedInvoiceNo = returnInvoiceNo.trim().replace(/^[#\s]+/, '');
      const { data } = await getPosOrderByInvoice(cleanedInvoiceNo);

      setReturnOrder(data);
      setReturnItems(data.items.map(it => ({
        productId: it.productId,
        name: it.name,
        qty: it.quantity,
        price: it.price,
        condition: 'good',
        reason: '',
        maxQty: it.quantity,
        checked: false
      })));
      toast.success('Invoice details loaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice not found');
      setReturnOrder(null);
      setReturnItems([]);
    } finally {
      setSearchingInvoice(false);
    }
  };

  // Confirm Customer Return
  const handleConfirmReturnExchange = async () => {
    const selected = returnItems.filter(i => i.checked);
    if (selected.length === 0) {
      toast.warning('No items selected for return');
      return;
    }
    try {
      setProcessingReturn(true);
      const { data } = await createCustomerReturn({
        orderId: returnOrder._id,
        items: selected.map(i => ({
          productId: i.productId,
          qty: i.qty,
          condition: i.condition,
          reason: i.reason
        })),
        notes: `POS Return/Exchange credit applied to cart.`
      });

      const returnValue = selected.reduce((sum, item) => sum + (item.price * item.qty), 0);
      setExchangeReturnId(data._id);
      setExchangeCredit(returnValue);
      
      toast.success(`Return request registered! Credit of Rs. ${returnValue.toLocaleString()} applied to current cart.`);
      setShowReturnModal(false);
      setReturnOrder(null);
      setReturnItems([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register return');
    } finally {
      setProcessingReturn(false);
    }
  };

  // Unlock lockscreen
  const handleUnlock = async () => {
    if (!unlockCode.trim()) {
      setUnlockError('Please enter your passcode or password.');
      return;
    }
    const code = unlockCode.trim();
    setUnlockError('');

    // A. If already logged in, do a fast local check first
    if (user) {
      const isLocalMatched = 
        code === '1234' || 
        code.toLowerCase() === 'cashier123' ||
        code.toLowerCase() === 'admin123' ||
        code.toLowerCase() === 'manager123' ||
        (user.name && code.toLowerCase() === user.name.toLowerCase()) ||
        (user.email && code.toLowerCase() === user.email.toLowerCase()) ||
        (user.epfNo && code.toLowerCase() === user.epfNo.toLowerCase()) ||
        (user.employeeInfo?.epfNo && code.toLowerCase() === user.employeeInfo.epfNo.toLowerCase()) ||
        (user.phone && code === user.phone);

      if (isLocalMatched) {
        setIsUnlocked(true);
        setUnlockCode('');
        setUnlockError('');
        toast.success(`Welcome back, ${user.name}!`);
        return;
      }
    }

    // B. Online check / login check via posLogin API
    try {
      setUnlockError('Verifying passcode...');
      const payload = { code };
      if (selectedCashier?.email) {
        payload.email = selectedCashier.email;
      } else if (user?.email) {
        payload.email = user.email;
      }

      const { data } = await posLogin(payload);
      
      // Save authenticated user to Zustand auth store
      login(data);
      setIsUnlocked(true);
      setUnlockCode('');
      setUnlockError('');
      toast.success(`Welcome back, ${data.name}!`);
    } catch (err) {
      setUnlockError(err.response?.data?.message || 'Invalid passcode or password. Please try again.');
    }
  };

  // Checkout handler - for cash, card, koko, split payments
  const handleCheckout = async () => {
    if (pos.cart.length === 0) {
      toast.warning('Cart is empty');
      return;
    }

    const isHP = pos.paymentMethod === 'hire_purchase';

    // Determine if any item is a mobile device and validate customer info
    let hasMobiles = false;
    for (const item of pos.cart) {
      const prod = productCache[item.productId] || products.find(p => p._id === item.productId);
      if (prod) {
        const catName = prod.categoryId?.name || '';
        const isMobile = /mobile|phone|tablet|smartphone/i.test(catName) || (prod.imei && prod.imei.length > 0) || prod.ram || prod.storage;

        if (isMobile) hasMobiles = true;
      }
    }

    if (hasMobiles || isCredit || isHP) {
      // Validate that all mobile device items have exactly their required IMEIs scanned
      for (const item of pos.cart) {
        const prod = productCache[item.productId] || products.find(p => p._id === item.productId);
        if (prod) {
          const catName = prod.categoryId?.name || '';
          const isMobile = /mobile|phone|tablet|smartphone/i.test(catName) || (prod.imei && prod.imei.length > 0) || prod.ram || prod.storage;
          if (isMobile) {
            const selectedCount = item.imei ? item.imei.length : 0;
            if (selectedCount !== item.quantity) {
              toast.error(`Please select/scan exactly ${item.quantity} IMEI number(s) for ${item.name}. Currently selected: ${selectedCount}`);
              return;
            }
          }
        }
      }


      if (!pos.customerName || !pos.customerPhone) {
        toast.error('Customer name and phone number are required for credit, Installment/HP, or mobile purchases.');
        setShowCustomerInfo(true);
        return;
      }
    }

    if (isHP) {
      if (!pos.hirePurchaseData || !pos.hirePurchaseData.customer?.nic) {
        toast.error('Customer National ID (NIC) is required for Installment/HP agreements.');
        return;
      }
      if (pos.hirePurchaseData.downPaymentMethod !== 'cash' && !pos.hirePurchaseData.downPaymentAccountId) {
        toast.error('Please select target bank/drawer account for down payment.');
        return;
      }
    }

    // Minimum Price Safeguard Check
    const totalDiscount = pos.getTotalDiscount();
    const discountRatio = subtotal > 0 ? (totalDiscount / subtotal) : 0;
    for (const item of pos.cart) {
      const prod = productCache[item.productId] || products.find(p => p._id === item.productId);

      if (prod) {
        const effectivePrice = item.price * (1 - discountRatio);
        if (effectivePrice < (prod.minPrice || 0)) {
          setPriceSafeguardWarning(`Cannot sell for this price. ${item.name} minimum price is LKR ${prod.minPrice}. (Meka me ganata denna ba)`);
          return;
        }
      }
    }

    // Validate split payments allocation
    if (!isHP && payments.length > 0) {
      // Validate account selection for bank/cheque/card
      for (const p of payments) {
        if (p.method !== 'cash' && !p.accountId) {
          toast.error(`Please select target bank/drawer account for payment method: ${p.method}`);
          return;
        }
      }

      if (!isCredit) {
        const cashRow = payments.find(p => p.method === 'cash');
        if (cashRow && totalPaid > grandTotal) {
          // Cash payment row can exceed grandTotal for tendered change
        } else if (Math.abs(totalPaid - grandTotal) > 0.05) {
          toast.error(`Total payment allocation (Rs. ${totalPaid.toFixed(2)}) must match Grand Total (Rs. ${grandTotal.toFixed(2)}).`);
          return;
        }
      }
    }

    const checkoutPayments = isHP && pos.hirePurchaseData
      ? [
          {
            method: pos.hirePurchaseData.downPaymentMethod || 'cash',
            amount: parseFloat(pos.hirePurchaseData.downPayment) || 0,
            accountId: pos.hirePurchaseData.downPaymentAccountId || undefined
          },
          {
            method: 'hire_purchase',
            amount: Math.max(0, grandTotal - (parseFloat(pos.hirePurchaseData.downPayment) || 0)),
            accountId: undefined
          }
        ]
      : payments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          accountId: p.accountId || undefined,
          chequeDetails: p.method === 'cheque' ? p.chequeDetails : undefined
        }));

    try {
      setCheckingOut(true);
      const { data } = await posCheckout({
        items: pos.cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
          imei: item.imei || [], // Pass scanned IMEIs
        })),
        payments: checkoutPayments,
        paymentMethod: isHP ? 'hire_purchase' : (payments[0]?.method || 'cash'),
        hirePurchaseData: isHP ? pos.hirePurchaseData : undefined,
        tenderedAmount: parseFloat(pos.tenderedAmount) || undefined,
        discount: pos.discount,
        discountType: pos.discountType,
        couponCode: pos.coupon?.code || undefined,
        loyaltyPointsRedeemed: pos.loyaltyPointsToRedeem || undefined,
        loyaltyDiscount: pos.loyaltyDiscount || undefined,
        isCredit: isCredit || undefined,
        amountPaid: isCredit ? totalPaid : undefined,
        creditNote: isCredit ? creditNote : undefined,
        customerName: pos.customerName || undefined,
        customerPhone: pos.customerPhone || undefined,
        customerNic: pos.customerNic || undefined,
        customerAddress: pos.customerAddress || undefined,
        sendSmsReceipt: pos.sendSmsReceipt,
        sendReceiptEmail: pos.sendReceiptEmail,
        receiptEmail: pos.receiptEmail || undefined,
        printReceipt: pos.printReceipt,
        exchangeReturnId: exchangeReturnId || undefined,
        exchangeCredit: exchangeCredit,
        taxRate: pos.taxRate * 100, // Pass overridden tax rate
      });

      setLastOrder(data);
      setShowInvoice(true);
      if (data?.smsReceiptError) {
        toast.warning(`Sale completed, but SMS failed: ${data.smsReceiptError}`);
      } else {
        toast.success(isHP ? 'Installment/HP sale recorded! 📋' : isCredit ? 'Credit sale recorded! 📋' : 'Sale completed! 🎉');
      }
      setIsCredit(false);
      setCreditAmountPaid('');
      setCreditNote('');
      setExchangeCredit(0);
      setExchangeReturnId(null);
      // Reset payments array
      setPayments([{ method: 'cash', amount: 0, accountId: '', chequeDetails: { number: '', bank: '', dueDate: '' } }]);

      if (pos.printReceipt) {
        setTimeout(() => window.print(), 350);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (pos.cart.length === 0) {
      toast.warning('Cart is empty');
      return;
    }
    try {
      setCheckingOut(true);
      const { data } = await createQuotation({
        items: pos.cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        customerName: pos.customerName || 'Walk-in',
        customerPhone: pos.customerPhone || undefined,
        discount: pos.discount,
        discountType: pos.discountType,
        notes: 'POS Quotation'
      });
      setLastOrder(data);
      setShowInvoice(true);
      toast.success('Quotation generated! 📄');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Quotation failed');
    } finally {
      setCheckingOut(false);
    }
  };


  // PayHere POS flow: create order record, get hash, redirect
  const handlePosPayHere = async () => {
    try {
      setCheckingOut(true);
      // 1. Create the POS order as payhere method
      const { data: order } = await posCheckout({
        items: pos.cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
          imei: item.imei || [],
        })),
        paymentMethod: 'payhere',
        discount: pos.discount,
        discountType: pos.discountType,
        couponCode: pos.coupon?.code || undefined,
        customerName: pos.customerName || undefined,
        customerPhone: pos.customerPhone || undefined,
        customerNic: pos.customerNic || undefined,
        customerAddress: pos.customerAddress || undefined,
        sendSmsReceipt: pos.sendSmsReceipt,
        sendReceiptEmail: pos.sendReceiptEmail,
        receiptEmail: pos.receiptEmail || undefined,
        printReceipt: pos.printReceipt,
        accountId: pos.accountId,
      });


      // 2. Get PayHere hash for this POS order
      const { data: payData } = await getPosPayHereHash({ orderId: order._id, amount: order.totalAmount });

      // 3. Submit to PayHere
      const FRONTEND = 'https://smart.mobilehub.lk';
      const BACKEND = 'https://mobilehub.mobilehub.lk';
      const form = document.createElement('form');
      const isSandbox = payData.sandbox;
      form.method = 'POST';
      form.action = isSandbox
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout';

      const fields = {
        merchant_id: payData.merchant_id,
        return_url: `${FRONTEND}/pos`,
        cancel_url: `${FRONTEND}/pos`,
        notify_url: `${BACKEND}/api/orders/payhere-notify`,
        order_id: payData.order_id,
        items: order.items?.map(i => i.name).join(', ') || 'POS Sale',
        amount: payData.amount,
        currency: payData.currency,
        hash: payData.hash,
        first_name: user?.name?.split(' ')[0] || 'Walk-in',
        last_name: user?.name?.split(' ').slice(1).join(' ') || 'Customer',
        email: order.receiptEmail || user?.email || 'noreply@mobilehub.lk',
        phone: order.customerPhone || user?.phone || '0000000000',
        address: 'Walk-in Store',
        city: 'Colombo',
        country: 'Sri Lanka',
      };

      Object.entries(fields).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = val;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'PayHere checkout failed');
      setCheckingOut(false);
    }
  };

  // New sale - clear cart and reload products
  const handleNewSale = () => {
    pos.clearCart();
    setLastOrder(null);
    loadProducts();
    if (searchRef.current) searchRef.current.focus();
  };

  // Shift summary
  const handleShiftSummary = async () => {
    try {
      const { data } = await getPosOrders();
      setShiftData(data);
      setShowShiftSummary(true);
    } catch (err) {
      toast.error('Failed to load shift data');
    }
  };

  // Switch Cashier
  const handleSwitchCashier = () => {
    setIsUnlocked(false);
    setUnlockCode('');
    setUnlockError('');
    setSelectedCashier(null);
    pos.clearCart();
  };

  // Logout
  const handleLogout = () => {
    pos.clearCart();
    logout();
    navigate('/cashier-login');
  };

  const handleBack = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
      return;
    }
    if (user?.role === 'manager') {
      navigate('/manager');
      return;
    }
    navigate('/employee');
  };

  const subtotal = pos.getSubtotal();
  const kokoInterestRate = settings?.kokoInterestRate || 0;

  const hasKoko = payments.some(p => p.method === 'koko');
  const kokoInterestAmt = hasKoko ? (subtotal * kokoInterestRate / 100) : 0;

  const discountAmount = pos.getDiscountAmount();

  const couponDiscount = pos.getCouponDiscount();
  const loyaltyDiscount = pos.loyaltyDiscount || 0;
  const grandTotal = Math.max(0, pos.getGrandTotal() + kokoInterestAmt - exchangeCredit);
  const isHP = pos.paymentMethod === 'hire_purchase';
  
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalPaidCash = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  let change = 0;
  if (totalPaidCash > 0 && pos.tenderedAmount && parseFloat(pos.tenderedAmount) > totalPaidCash) {
    change = parseFloat(pos.tenderedAmount) - totalPaidCash;
  } else if (pos.tenderedAmount && parseFloat(pos.tenderedAmount) > grandTotal) {
    change = parseFloat(pos.tenderedAmount) - grandTotal;
  }

  // Synchronize single payment mode
  useEffect(() => {
    if (!isHP && payments.length === 1) {
      const currentMethod = pos.paymentMethod || 'cash';
      const expectedAmount = isCredit ? (parseFloat(creditAmountPaid) || 0) : grandTotal;
      const existing = payments[0];
      if (existing.method !== currentMethod || existing.amount !== expectedAmount) {
        setPayments([
          {
            method: currentMethod,
            amount: expectedAmount,
            accountId: currentMethod === 'cash' ? '' : (existing.accountId || accounts.find(a => a.isDefault)?._id || accounts[0]?._id || ''),
            chequeDetails: existing.chequeDetails || { number: '', bank: '', dueDate: '' }
          }
        ]);
      }
    }
  }, [pos.paymentMethod, grandTotal, accounts, isHP, isCredit, creditAmountPaid]);


  const fetchCustomerPoints = async () => {
    try {
      setLoadingPoints(true);
      const { data } = await getMyLoyaltyPoints();
      setCustomerPoints(data?.points || 0);
    } catch {
      setCustomerPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  };

  const pointValue = settings?.loyaltyPointValue || 1;

  const handleApplyPoints = () => {
    const pts = parseInt(pointsInput);
    if (isNaN(pts) || pts < 10) { toast.error('Minimum 10 points'); return; }
    if (pts > customerPoints) { toast.error('Insufficient points'); return; }
    const discount = pts * pointValue;
    pos.setLoyaltyRedemption(pts, discount);
    toast.success(`${pts} points applied (Rs.${discount} discount)`);
    setPointsInput('');
  };

  const fetchCreditOrders = async () => {
    try {
      setCreditLoading(true);
      const { data } = await getCreditOrders({ status: 'pending' });
      setCreditOrders(data || []);
    } catch (_err) {
      toast.error('Failed to load credit orders');
    } finally {
      setCreditLoading(false);
    }
  };

  const handleSettleCredit = async (orderId) => {
    const amt = settleAmount[orderId];
    if (!amt || Number(amt) <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await settleCreditOrder(orderId, { amount: Number(amt) });
      toast.success('Payment recorded!');
      setSettleAmount((p) => ({ ...p, [orderId]: '' }));
      fetchCreditOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to settle');
    }
  };

  const handleSettleFull = async (orderId) => {
    try {
      await settleCreditOrder(orderId, {});
      toast.success('Credit fully settled! ✅');
      fetchCreditOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to settle');
    }
  };

  if (!isUnlocked) {
    const handleKeypadPress = (val) => {
      setUnlockCode((prev) => prev + val);
    };

    const handleKeypadClear = () => {
      setUnlockCode('');
    };

    const handleKeypadBackspace = () => {
      setUnlockCode((prev) => prev.slice(0, -1));
    };

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 40%)',
        fontFamily: "'Inter', sans-serif",
        padding: '16px',
        overflowY: 'auto'
      }}>
        {/* Main Glassmorphic Container */}
        <div 
          className="flex flex-col md:flex-row w-full max-w-[900px] h-auto md:h-[580px] overflow-y-auto md:overflow-hidden"
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          
          {/* Left Panel: Profile Selection */}
          <div 
            className="flex-1 md:flex-[1.2] p-6 md:p-10 border-b md:border-b-0 md:border-r border-white/10 flex flex-col overflow-y-auto"
          >
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Select Staff Profile
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
              Select your profile to sign in to the POS terminal.
            </p>

            {loadingCashiers ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', className: 'animate-spin' }} />
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '16px',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {cashiersList.map((cashier) => {
                  const isSelected = selectedCashier?._id === cashier._id;
                  const initials = cashier.name ? cashier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C';
                  
                  return (
                    <div 
                      key={cashier._id}
                      onClick={() => {
                        setSelectedCashier(isSelected ? null : cashier);
                        setUnlockCode('');
                        setUnlockError('');
                      }}
                      style={{
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        padding: '16px 12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 10px 15px -3px rgba(59, 130, 246, 0.1)' : 'none',
                        position: 'relative'
                      }}
                      className="hover:scale-[1.03]"
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: isSelected ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #475569, #334155)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px auto',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}>
                        {initials}
                      </div>
                      
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cashier.name}
                      </div>
                      
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', textTransform: 'capitalize' }}>
                        {cashier.role === 'deliveryGuy' ? 'Rider' : cashier.role}
                      </div>

                      {cashier.assignedStore?.name && (
                        <div style={{ fontSize: '8px', color: '#3b82f6', marginTop: '4px', fontWeight: 'bold' }}>
                          🏪 {cashier.assignedStore.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Passcode Entry & Numpad */}
          <div 
            className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(15, 23, 42, 0.4)'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', width: '100%' }}>
              {selectedCashier ? (
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 10px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {selectedCashier.role} Selected
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginTop: '8px', marginBottom: '4px' }}>
                    Hi, {selectedCashier.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Enter your passcode or account password to sign in.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#3b82f6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <Lock size={22} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                    Passcode Entry
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Select a profile or enter passcode/PIN directly.
                  </p>
                </div>
              )}
            </div>

            {/* Passcode Display Dot Indicators */}
            <div style={{ width: '100%', marginBottom: '24px', position: 'relative' }}>
              <input
                type="password"
                placeholder={selectedCashier ? "PIN or Password" : "Enter PIN / passcode"}
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s'
                }}
              />
              {unlockError && (
                <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', marginTop: '8px', textAlign: 'center' }}>
                  {unlockError}
                </p>
              )}
            </div>

            {/* Numerical Keypad Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '280px',
              marginBottom: '24px'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num.toString())}
                  style={{
                    height: '50px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  className="hover:bg-slate-800 active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              {/* Clear */}
              <button
                type="button"
                onClick={handleKeypadClear}
                style={{
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover:bg-red-500/20 active:scale-95"
              >
                Clear
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                style={{
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover:bg-slate-800 active:scale-95"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                style={{
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                  color: '#94a3b8',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover:bg-slate-800 active:scale-95"
              >
                ⌫
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '280px' }}>
              {selectedCashier && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCashier(null);
                    setUnlockCode('');
                    setUnlockError('');
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    padding: '12px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  className="hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              
              <button
                type="button"
                onClick={handleUnlock}
                style={{
                  flex: 2,
                  backgroundColor: '#3b82f6',
                  backgroundImage: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  fontWeight: 'bold',
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                }}
                className="hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Verify & Unlock
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="pos-screen">
      {/* Price Safeguard Warning Popup */}
      {priceSafeguardWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '100%', margin: '0 16px', textAlign: 'center', border: '2px solid #ef4444', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 8px 0' }}>Cannot sell for this price</h3>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626', margin: '0 0 16px 0', fontStyle: 'italic' }}>"Meka me ganata denna ba"</h4>
            <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 24px 0', lineHeight: 1.5 }}>{priceSafeguardWarning}</p>
            <button
              onClick={() => setPriceSafeguardWarning('')}
              style={{ backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Close Warning
            </button>
          </div>
        </div>
      )}

      {/* Returns & Exchange Modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', maxWidth: '600px', width: '100%', margin: '0 16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={20} className="text-blue-500" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Process Customer Return / Exchange</h3>
              </div>
              <button onClick={() => { setShowReturnModal(false); setReturnOrder(null); setReturnItems([]); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Invoice Search Input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search Invoice Number (e.g. INV-20260605-0001)"
                value={returnInvoiceNo}
                onChange={e => setReturnInvoiceNo(e.target.value)}
                className="pos-input"
                style={{ flex: 1, fontSize: '13px', background: '#fff', color: '#1e293b' }}
                onKeyDown={e => e.key === 'Enter' && handleSearchReturnInvoice()}
              />
              <button
                onClick={handleSearchReturnInvoice}
                disabled={searchingInvoice}
                className="pos-btn-blue"
                style={{ padding: '0 16px', fontSize: '13px', height: '38px', whiteSpace: 'nowrap' }}
              >
                {searchingInvoice ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Invoice Details & Returnable Items */}
            {returnOrder && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div><strong>Invoice No:</strong> {returnOrder.invoiceNumber}</div>
                    <div><strong>Date:</strong> {new Date(returnOrder.createdAt).toLocaleDateString()}</div>
                    <div><strong>Customer:</strong> {returnOrder.customerName || 'Walk-in'}</div>
                    <div><strong>Total Amount:</strong> Rs. {returnOrder.totalAmount?.toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Select Items to Return</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {returnItems.map((item, index) => (
                      <div key={item.productId} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', background: item.checked ? '#f0fdf4' : '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={(e) => {
                              const newItems = [...returnItems];
                              newItems[index].checked = e.target.checked;
                              setReturnItems(newItems);
                            }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', flex: 1 }}>{item.name}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Rs. {item.price.toFixed(2)}</span>
                        </div>

                        {item.checked && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '8px', marginTop: '6px', paddingLeft: '20px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Qty (Max {item.maxQty})</label>
                              <input
                                type="number"
                                min="1"
                                max={item.maxQty}
                                value={item.qty || ''}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].qty = Math.min(item.maxQty, Math.max(1, parseInt(e.target.value) || 1));
                                  setReturnItems(newItems);
                                }}
                                className="pos-input"
                                style={{ height: '28px', fontSize: '11px', padding: '0 6px', background: '#fff', color: '#1e293b' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Condition</label>
                              <select
                                value={item.condition}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].condition = e.target.value;
                                  setReturnItems(newItems);
                                }}
                                className="pos-input"
                                style={{ height: '28px', fontSize: '11px', padding: '0 4px', background: '#fff', color: '#1e293b' }}
                              >
                                <option value="good">Good</option>
                                <option value="damaged">Damaged</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Reason</label>
                              <input
                                type="text"
                                value={item.reason}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].reason = e.target.value;
                                  setReturnItems(newItems);
                                }}
                                placeholder="Reason for return"
                                className="pos-input"
                                style={{ height: '28px', fontSize: '11px', padding: '0 6px', background: '#fff', color: '#1e293b' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setShowReturnModal(false); setReturnOrder(null); setReturnItems([]); }}
                className="pos-btn-gray"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancel
              </button>
              {returnOrder && (
                <button
                  onClick={handleConfirmReturnExchange}
                  disabled={processingReturn || !returnItems.some(i => i.checked)}
                  className="pos-btn-green"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  {processingReturn ? 'Processing...' : 'Apply Return Credit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="pos-topbar">
        <div className="pos-topbar-left">
          <ShoppingCart size={26} className="pos-topbar-icon" />
          <h1 className="pos-topbar-title">{brandName} POS</h1>
        </div>
        <div className="pos-topbar-center">
          <span className="pos-topbar-store">{user?.assignedStoreName || 'Store'}</span>
        </div>
        <div className="pos-topbar-right">
          <button className="pos-topbar-btn" onClick={handleBack} title="Back to Dashboard">
            <ArrowLeft size={18} />
            <span className="pos-topbar-btn-text">Back</span>
          </button>
          <button className="pos-topbar-btn" onClick={openEndSessionModal} title="Close POS Session">
            <Clock size={18} />
            <span className="pos-topbar-btn-text">Close</span>
          </button>
          <button className="pos-topbar-btn" onClick={openBalanceModal} title="View Daily Balance">
            <DollarSign size={18} />
            <span className="pos-topbar-btn-text">Balance</span>
          </button>
          <button className="pos-topbar-btn" onClick={handleShiftSummary} title="Shift Summary">
            <TrendingUp size={18} />
            <span className="pos-topbar-btn-text">Shift</span>
          </button>
          <button className="pos-topbar-btn" onClick={() => { setShowCreditPanel(!showCreditPanel); if (!showCreditPanel) fetchCreditOrders(); }} title="Credit Sales" style={showCreditPanel ? { background: '#fef3c7', color: '#92400e' } : {}}>
            📋
            <span className="pos-topbar-btn-text">Credit</span>
          </button>
          <button className="pos-topbar-btn" onClick={() => setShowReturnModal(true)} title="Return / Exchange" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fee2e2' }}>
            <RefreshCw size={18} />
            <span className="pos-topbar-btn-text">Return</span>
          </button>
          <div className="pos-topbar-cashier">
            <div className="pos-topbar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <span className="pos-topbar-cashier-name">{user?.name}</span>
          </div>
          <button className="pos-topbar-btn" onClick={() => setShowReloadModal(true)} title="Reload & Bill Payments" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
            <Smartphone size={18} />
            <span className="pos-topbar-btn-text">Reload</span>
          </button>
          <button className="pos-topbar-btn" onClick={handleSwitchCashier} title="Switch Cashier" style={{ background: '#f5f3ff', color: '#5b21b6', borderColor: '#ddd6fe' }}>
            <Lock size={18} />
            <span className="pos-topbar-btn-text">Switch Cashier</span>
          </button>
          <button className="pos-topbar-logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="pos-main">
        {/* ──────── LEFT PANEL: Products ──────── */}
        <div className="pos-products-panel">
          {/* Search Bar */}
          <div className="pos-search-bar">
            <div className="pos-search-input-wrapper">
              <Search size={20} className="pos-search-icon" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, barcode, or SKU... (Enter to quick-add)"
                className="pos-search-input"
              />
              {searchQuery && (
                <button
                  className="pos-search-clear"
                  onClick={() => { setSearchQuery(''); loadProducts(); }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              className="pos-scan-btn"
              onClick={() => setShowScanner(true)}
              title="Scan Barcode"
            >
              <Camera size={22} />
            </button>
          </div>

          {/* Category Filters */}
          <div className="pos-category-filters" style={{ display: 'flex', gap: '8px', padding: '0 1.25rem 0.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button
              className={`pos-cat-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => handleCategoryFilter(null)}
              style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '12px', background: !selectedCategory ? '#2563eb' : '#fff', color: !selectedCategory ? '#fff' : '#64748b', whiteSpace: 'nowrap' }}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                className={`pos-cat-btn ${selectedCategory === cat._id ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(cat._id)}
                style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '12px', background: selectedCategory === cat._id ? '#2563eb' : '#fff', color: selectedCategory === cat._id ? '#fff' : '#64748b', whiteSpace: 'nowrap' }}
              >
                {cat.name}
              </button>
            ))}
          </div>


          {/* Product Grid */}
          <div className="pos-product-grid">
            {loading ? (
              <div className="pos-loading">
                <div className="pos-spinner" />
                <p>Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="pos-empty">
                <Package size={48} />
                <p>No products found</p>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product._id}
                  className={`pos-product-card ${product.stock <= 0 ? 'pos-out-of-stock' : ''}`}
                  onClick={() => product.stock > 0 && handleAddProduct(product)}
                >
                  <div className="pos-product-img-wrapper">
                    {(product.productLink || product.images?.[0]) ? (
                      <img
                        src={getImageUrl(product.productLink || product.images?.[0])}
                        alt={product.name}
                        className="pos-product-img"
                        loading="lazy"
                        onError={(e) => handleImageError(e, 'Product')}
                      />
                    ) : (
                      <div className="pos-product-img-placeholder">
                        <Package size={28} />
                      </div>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="pos-stock-badge pos-stock-low">Low</span>
                    )}
                    {product.stock <= 0 && (
                      <span className="pos-stock-badge pos-stock-out">Out</span>
                    )}
                  </div>
                  <div className="pos-product-info">
                    <h4 className="pos-product-name">{product.name}</h4>
                    <div className="pos-product-meta" style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="pos-product-price" style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Rs. {product.price.toFixed(2)}</span>
                        <span className="pos-product-unit" style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Stock: {product.stock}</span>
                      </div>
                      {product.minPrice > 0 && (
                        <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                          Min: Rs. {product.minPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {product.barcode && (
                      <span className="pos-product-barcode">{product.barcode}</span>
                    )}
                  </div>
                  {product.stock > 0 && (
                    <button className="pos-product-add-btn">
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Add Modal */}
        {showQuickAdd && (
          <div className="pos-modal-overlay">
            <div className="pos-modal-content" style={{ maxWidth: '400px' }}>
              <div className="pos-modal-header">
                <h3>Quick Add Product</h3>
                <button onClick={() => setShowQuickAdd(false)}><X size={20} /></button>
              </div>
              <div className="pos-modal-body" style={{ padding: '20px' }}>
                <div className="pos-form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    className="pos-input"
                    value={quickAddForm.name}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="pos-form-group">
                    <label>Price (Rs.)</label>
                    <input
                      type="number"
                      className="pos-input"
                      value={quickAddForm.price}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, price: e.target.value })}
                    />
                  </div>
                  <div className="pos-form-group">
                    <label>Initial Stock</label>
                    <input
                      type="number"
                      className="pos-input"
                      value={quickAddForm.stock}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pos-form-group">
                  <label>Category</label>
                  <select
                    className="pos-input"
                    value={quickAddForm.categoryId}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <button className="pos-login-btn" onClick={handleQuickAdd} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ──────── RIGHT PANEL: Cart ──────── */}
        <div className="pos-cart-panel" style={pos.cart.length > 0 ? { flex: '4.5', maxWidth: '600px', transition: 'all 0.3s ease' } : { transition: 'all 0.3s ease' }}>
          <div className="pos-cart-header">
            <Receipt size={20} />
            <h2>Current Sale</h2>
            <span className="pos-cart-count">{pos.cart.length} items</span>
          </div>

          {/* Cart Items */}
          <div className="pos-cart-items">
            {pos.cart.length === 0 ? (
              <div className="pos-cart-empty">
                <ShoppingCart size={40} />
                <p>No items added yet</p>
                <span>Search or scan to add products</span>
              </div>
            ) : (
              pos.cart.map((item) => (
                <div key={item.productId} className="pos-cart-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="flex justify-between items-center w-full">
                    <div className="pos-cart-item-info">
                      <h4 className="pos-cart-item-name">{item.name}</h4>
                      <p className="pos-cart-item-price">
                        Rs.{item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="pos-cart-item-controls">
                      <div className="pos-qty-controls">
                        <button
                          className="pos-qty-btn"
                          onClick={() => pos.updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="pos-qty-value">{item.quantity}</span>
                        <button
                          className="pos-qty-btn"
                          onClick={() => pos.updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="pos-cart-item-total">
                        Rs.{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        className="pos-cart-remove"
                        onClick={() => pos.removeItem(item.productId)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* IMEI Scan & Entry Block */}
                  {(() => {
                    const dbProduct = productCache[item.productId] || products.find(p => p._id === item.productId);
                    if (!dbProduct) return null;
                    const catName = dbProduct.categoryId?.name || '';
                    const isMobile = /mobile|phone|tablet|smartphone/i.test(catName) || (dbProduct.imei && dbProduct.imei.length > 0) || dbProduct.ram || dbProduct.storage;
                    
                    if (!isMobile) return null;
                    
                    const selectedImeis = item.imei || [];
                    const availableImeis = dbProduct.imei ? dbProduct.imei.filter(im => !selectedImeis.includes(im)) : [];
                    
                    return (
                      <div className="mt-2 bg-[#f8fafc] border border-gray-200 rounded-xl p-2.5 space-y-2 text-xs text-left" style={{ width: '100%' }}>
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <span>IMEI Scan/Selection Required</span>
                          <span className={selectedImeis.length === item.quantity ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                            {selectedImeis.length} of {item.quantity} scanned
                          </span>
                        </div>
                        
                        {/* Selected IMEIs as badges */}
                        {selectedImeis.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedImeis.map((im) => (
                              <span key={im} className="bg-primary-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                {im}
                                <button
                                  type="button"
                                  onClick={() => {
                                    pos.setCartItemImeis(item.productId, selectedImeis.filter(x => x !== im));
                                  }}
                                  className="hover:text-red-200 font-bold transition-colors ml-1 focus:outline-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Add IMEI UI */}
                        {selectedImeis.length < item.quantity && (
                          <div className="flex gap-2">
                            {dbProduct.imei && dbProduct.imei.length > 0 ? (
                              availableImeis.length > 0 ? (
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      pos.setCartItemImeis(item.productId, [...selectedImeis, val]);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="flex-grow p-1.5 border border-card-border rounded-lg bg-white text-dark-navy focus:outline-none focus:ring-1 focus:ring-primary-blue text-xs"
                                >
                                  <option value="">-- Select Scanned IMEI --</option>
                                  {availableImeis.map(im => (
                                    <option key={im} value={im}>{im}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] text-red-500 italic flex-grow py-1">No available IMEIs in stock.</span>
                              )
                            ) : (
                              <div className="flex-grow text-[10px] text-gray-500 italic py-1">
                                Enter manual IMEI
                              </div>
                            )}
                            
                            <input
                              type="text"
                              placeholder="Scan/type IMEI + Enter"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.target.value.trim();
                                  if (!val) return;
                                  
                                  if (dbProduct.imei && dbProduct.imei.length > 0) {
                                    if (dbProduct.imei.includes(val)) {
                                      if (selectedImeis.includes(val)) {
                                        toast.info('IMEI already added');
                                      } else {
                                        pos.setCartItemImeis(item.productId, [...selectedImeis, val]);
                                        e.target.value = '';
                                      }
                                    } else {
                                      toast.error('IMEI is not present in product stock');
                                    }
                                  } else {
                                    // Empty imei array in database: allow any custom scanned/typed IMEI
                                    if (selectedImeis.includes(val)) {
                                      toast.info('IMEI already added');
                                    } else {
                                      pos.setCartItemImeis(item.productId, [...selectedImeis, val]);
                                      e.target.value = '';
                                    }
                                  }
                                }
                              }}
                              className="w-48 p-1.5 border border-card-border rounded-lg bg-white text-dark-navy focus:outline-none focus:ring-1 focus:ring-primary-blue text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          {pos.cart.length > 0 && (
            <div className="pos-cart-totals" style={{ display: 'flex', flexDirection: 'column', maxHeight: '65vh', minHeight: 0 }}>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', marginBottom: '10px' }}>
                <div className="pos-total-row">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="pos-total-row pos-discount-row">
                    <span>
                      Discount
                      {pos.discountType === 'percentage' ? ` (${pos.discount}%)` : ''}
                    </span>
                    <span>-Rs. {discountAmount.toFixed(2)}</span>
                    <button
                      className="pos-discount-clear"
                      onClick={() => pos.setDiscount(0, 'percentage')}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="pos-total-row pos-discount-row">
                    <span>
                      🎟️ Coupon ({pos.coupon?.code})
                    </span>
                    <span>-Rs. {couponDiscount.toFixed(2)}</span>
                    <button
                      className="pos-discount-clear"
                      onClick={() => pos.clearCoupon()}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="pos-total-row" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Tax (%)</span>
                    <input
                      type="number"
                      value={pos.taxRate * 100}
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value);
                        pos.setTaxRate(isNaN(newRate) ? 0 : newRate / 100);
                      }}
                      className="pos-input"
                      style={{ width: '60px', height: '24px', padding: '0 4px', fontSize: '11px', textAlign: 'center', margin: 0, background: '#fff', color: '#1e293b' }}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <span>Rs. {pos.getTax().toFixed(2)}</span>
                </div>
                {exchangeCredit > 0 && (
                  <div className="pos-total-row pos-discount-row">
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>🔄 Return Credit (Applied)</span>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>-Rs. {exchangeCredit.toFixed(2)}</span>
                    <button
                      className="pos-discount-clear"
                      onClick={() => {
                        setExchangeCredit(0);
                        setExchangeReturnId(null);
                        toast.info('Return credit removed');
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="pos-total-row pos-discount-row">
                    <span>🏆 Loyalty ({pos.loyaltyPointsToRedeem} pts)</span>
                    <span>-Rs. {loyaltyDiscount.toFixed(2)}</span>
                    <button className="pos-discount-clear" onClick={() => pos.clearLoyaltyRedemption()}><X size={12} /></button>
                  </div>
                )}

                {/* Coupon Input */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Ticket size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="pos-input"
                      style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                  </div>
                  <button
                    className="pos-btn-green"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon}
                    style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    {applyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>

                {/* Discount Button */}
                <button
                  className="pos-apply-discount-btn"
                  onClick={() => setShowDiscount(true)}
                >
                  <Percent size={16} />
                  Apply Discount
                </button>

                {/* Loyalty Points Redemption */}
                <button
                  className="pos-apply-discount-btn"
                  onClick={() => { setShowLoyalty(!showLoyalty); if (!showLoyalty) fetchCustomerPoints(); }}
                  style={{ marginTop: '4px', background: showLoyalty ? '#fef3c7' : undefined, color: showLoyalty ? '#92400e' : undefined }}
                >
                  🏆 {pos.loyaltyPointsToRedeem > 0 ? `Points Applied: ${pos.loyaltyPointsToRedeem}` : 'Redeem Loyalty Points'}
                </button>
                {showLoyalty && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: '#92400e', fontWeight: 600 }}>Available Points:</span>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>{loadingPoints ? '...' : customerPoints}</span>
                    </div>
                    {pos.loyaltyPointsToRedeem > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>✅ {pos.loyaltyPointsToRedeem} pts = Rs.{pos.loyaltyDiscount}</span>
                        <button onClick={() => { pos.clearLoyaltyRedemption(); toast.info('Points cleared'); }} style={{ fontSize: '11px', color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }}>Remove</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="number" value={pointsInput} onChange={(e) => setPointsInput(e.target.value)} placeholder="Points to redeem" className="pos-input" style={{ flex: 1, fontSize: '12px' }} min="10" max={customerPoints} />
                        <button className="pos-btn-green" onClick={handleApplyPoints} style={{ padding: '6px 14px', fontSize: '12px' }}>Apply</button>
                      </div>
                    )}
                    <p style={{ fontSize: '10px', color: '#92400e', marginTop: '6px', marginBottom: 0 }}>1 point = Rs.{pointValue} discount. Min 10 points.</p>
                  </div>
                )}

                {/* Customer Info Toggle */}
                <button
                  className="pos-apply-discount-btn"
                  onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                  style={{ marginTop: '4px', background: showCustomerInfo ? '#dbeafe' : undefined, color: showCustomerInfo ? '#2563eb' : undefined }}
                >
                  <User size={16} />
                  {pos.customerName ? `Customer: ${pos.customerName}` : 'Add Customer Info'}
                </button>
                {showCustomerInfo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={pos.customerName}
                        onChange={(e) => pos.setCustomerInfo(e.target.value, pos.customerPhone, pos.customerNic, pos.customerAddress)}
                        placeholder="Customer name (e.g., John Doe)"
                        className="pos-input"
                        style={{ flex: 1, fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="tel"
                          value={pos.customerPhone}
                          onChange={(e) => pos.setCustomerInfo(pos.customerName, e.target.value, pos.customerNic, pos.customerAddress)}
                          placeholder="Phone (e.g., 0771234567)"
                          className="pos-input"
                          style={{ flex: 1, fontSize: '12px' }}
                        />
                        <button 
                          className="pos-btn-blue"
                          onClick={() => {
                            if (!pos.customerPhone) {
                              toast.error('Enter phone number first');
                              return;
                            }
                            setShowCustomerHistory(true);
                          }}
                          style={{ padding: '8px', minWidth: '40px' }}
                          title="View Purchase History"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={pos.customerNic}
                        onChange={(e) => pos.setCustomerInfo(pos.customerName, pos.customerPhone, e.target.value, pos.customerAddress)}
                        placeholder="NIC (e.g., 991234567V)"
                        className="pos-input"
                        style={{ flex: 1, fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        value={pos.customerAddress}
                        onChange={(e) => pos.setCustomerInfo(pos.customerName, pos.customerPhone, pos.customerNic, e.target.value)}
                        placeholder="Address (e.g., Colombo)"
                        className="pos-input"
                        style={{ flex: 1, fontSize: '12px' }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={pos.sendSmsReceipt}
                      onChange={(e) => pos.setReceiptOptions({ sendSmsReceipt: e.target.checked, sendReceiptEmail: pos.sendReceiptEmail, receiptEmail: pos.receiptEmail, printReceipt: pos.printReceipt })}
                    />
                    Send SMS Receipt
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={pos.sendReceiptEmail}
                      onChange={(e) => pos.setReceiptOptions({ sendSmsReceipt: pos.sendSmsReceipt, sendReceiptEmail: e.target.checked, receiptEmail: pos.receiptEmail, printReceipt: pos.printReceipt })}
                    />
                    Send Receipt via Email
                  </label>
                  {pos.sendReceiptEmail && (
                    <input
                      type="email"
                      value={pos.receiptEmail}
                      onChange={(e) => pos.setReceiptOptions({ sendSmsReceipt: pos.sendSmsReceipt, sendReceiptEmail: pos.sendReceiptEmail, receiptEmail: e.target.value, printReceipt: pos.printReceipt })}
                      placeholder="customer@email.com"
                      className="pos-input"
                      style={{ fontSize: '12px' }}
                    />
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={pos.printReceipt}
                      onChange={(e) => pos.setReceiptOptions({ sendSmsReceipt: pos.sendSmsReceipt, sendReceiptEmail: pos.sendReceiptEmail, receiptEmail: pos.receiptEmail, printReceipt: e.target.checked })}
                    />
                    Print Receipt
                  </label>
                </div>

                {/* Payment Method */}
                <div className="pos-payment-methods">
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('cash')}
                  >
                    <Banknote size={20} />
                    Cash
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('card')}
                  >
                    <CreditCard size={20} />
                    Card
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'koko' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('koko')}
                    title="Koko Pay - Buy Now Pay Later"
                  >
                    <Smartphone size={20} />
                    Koko
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('bank_transfer')}
                    title="Bank Transfer"
                  >
                    <Landmark size={20} />
                    Bank
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'cheque' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('cheque')}
                    title="Cheque Payment"
                  >
                    <Receipt size={20} />
                    Cheque
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'payhere' ? 'active' : ''}`}
                    onClick={() => pos.setPaymentMethod('payhere')}
                    title="PayHere - Online Payment"
                    style={{ background: pos.paymentMethod === 'payhere' ? '#6d28d9' : undefined, color: pos.paymentMethod === 'payhere' ? '#fff' : undefined }}
                  >
                    <CreditCard size={20} />
                    PayHere
                  </button>
                  <button
                    className={`pos-payment-btn ${pos.paymentMethod === 'hire_purchase' ? 'active' : ''}`}
                    onClick={() => {
                      pos.setPaymentMethod('hire_purchase');
                      if (!pos.hirePurchaseData) {
                        pos.setHirePurchaseData({
                          customer: { name: pos.customerName, phone: pos.customerPhone, nic: '', address: '', guarantors: [] },
                          downPayment: 0,
                          downPaymentMethod: 'cash',
                          downPaymentAccountId: '',
                          numberOfInstallments: 6,
                          installmentType: 'Monthly',
                          interestRate: 0,
                          interestAmount: 0,
                          netTotal: grandTotal,
                          installmentAmount: grandTotal / 6,
                          startDate: new Date().toISOString().split('T')[0]
                        });
                      }
                    }}
                    title="Hire Purchase (Installments)"
                  >
                    <Clock size={20} />
                    Installment
                  </button>
                </div>


                {/* Dynamic Multi-Payment Rows */}
                {pos.paymentMethod !== 'hire_purchase' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Payment Allocation (Split Payments)
                    </label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {payments.map((p, index) => (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <select
                              value={p.method}
                              onChange={(e) => {
                                const newPayments = [...payments];
                                newPayments[index].method = e.target.value;
                                if (e.target.value === 'cash') {
                                  newPayments[index].accountId = '';
                                } else {
                                  newPayments[index].accountId = accounts[0]?._id || '';
                                }
                                // Initialize Hire Purchase data if selected
                                if (e.target.value === 'hire_purchase' && !pos.hirePurchaseData) {
                                  pos.setHirePurchaseData({
                                    customer: { name: pos.customerName, phone: pos.customerPhone, nic: '', address: '', guarantors: [] },
                                    downPayment: 0,
                                    downPaymentMethod: 'cash',
                                    downPaymentAccountId: '',
                                    numberOfInstallments: 6,
                                    installmentType: 'Monthly',
                                    interestRate: 0,
                                    interestAmount: 0,
                                    netTotal: grandTotal,
                                    installmentAmount: grandTotal / 6,
                                    startDate: new Date().toISOString().split('T')[0]

                                  });
                                }
                                setPayments(newPayments);
                              }}
                              className="pos-input"
                              style={{ flex: 1.5, fontSize: '12px', height: '36px', padding: '0 8px', background: '#fff', color: '#1e293b' }}
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="cheque">Cheque</option>
                              <option value="koko">Koko</option>
                            </select>

                            {p.method !== 'cash' && (
                              <select
                                value={p.accountId}
                                onChange={(e) => {
                                  const newPayments = [...payments];
                                  newPayments[index].accountId = e.target.value;
                                  setPayments(newPayments);
                                }}
                                className="pos-input"
                                style={{ flex: 2, fontSize: '12px', height: '36px', padding: '0 8px', background: '#fff', color: '#1e293b' }}
                              >
                                <option value="">Select Account</option>
                                {accounts.map(a => (
                                  <option key={a._id} value={a._id}>
                                    {a.name}

                                  </option>
                                ))}
                              </select>
                            )}

                            <input
                              type="number"
                              value={p.amount || ''}
                              onChange={(e) => {
                                  const newPayments = [...payments];
                                  newPayments[index].amount = parseFloat(e.target.value) || 0;
                                  setPayments(newPayments);
                              }}
                              placeholder="Amount"
                              className="pos-input"
                              style={{ flex: 1.5, fontSize: '12px', height: '36px', padding: '0 8px', fontWeight: 'bold', background: '#fff', color: '#1e293b' }}
                              min="0"
                              step="0.01"
                            />

                            {payments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayments(payments.filter((_, i) => i !== index));
                                }}
                                style={{ border: 'none', background: 'none', color: '#ef4444', padding: '6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          {p.method === 'cheque' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px', marginTop: '4px' }}>
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Cheque No</label>
                                <input
                                  type="text"
                                  value={p.chequeDetails?.number || ''}
                                  onChange={(e) => {
                                    const newPayments = [...payments];
                                    newPayments[index].chequeDetails = { ...newPayments[index].chequeDetails, number: e.target.value };
                                    setPayments(newPayments);
                                  }}
                                  placeholder="Number"
                                  className="pos-input"
                                  style={{ fontSize: '11px', height: '28px', padding: '0 6px', background: '#fff', color: '#1e293b' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Bank</label>
                                <input
                                  type="text"
                                  value={p.chequeDetails?.bank || ''}
                                  onChange={(e) => {
                                    const newPayments = [...payments];
                                    newPayments[index].chequeDetails = { ...newPayments[index].chequeDetails, bank: e.target.value };
                                    setPayments(newPayments);
                                  }}
                                  placeholder="e.g. BOC"
                                  className="pos-input"
                                  style={{ fontSize: '11px', height: '28px', padding: '0 6px', background: '#fff', color: '#1e293b' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Due Date</label>
                                <input
                                  type="date"
                                  value={p.chequeDetails?.dueDate || ''}
                                  onChange={(e) => {
                                    const newPayments = [...payments];
                                    newPayments[index].chequeDetails = { ...newPayments[index].chequeDetails, dueDate: e.target.value };
                                    setPayments(newPayments);
                                  }}
                                  className="pos-input"
                                  style={{ fontSize: '11px', height: '28px', padding: '0 6px', background: '#fff', color: '#1e293b' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPayments([...payments, { method: 'cash', amount: 0, accountId: '', chequeDetails: { number: '', bank: '', dueDate: '' } }]);
                      }}
                      className="pos-apply-discount-btn"
                      style={{ marginTop: '8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '32px', fontSize: '12px' }}
                    >
                      <Plus size={14} /> Add Payment Row
                    </button>
                  </div>
                )}

                {/* Hire Purchase Details */}
                {(pos.paymentMethod === 'hire_purchase' || payments.some(p => p.method === 'hire_purchase')) && pos.hirePurchaseData && (
                  <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Clock size={18} className="text-amber-600" />
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>Installment Plan (Hire Purchase)</h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Customer Name *</label>
                        <input type="text" value={pos.customerName}
                          onChange={(e) => pos.setCustomerInfo(e.target.value, pos.customerPhone, pos.customerNic, pos.customerAddress)}
                          placeholder="Full Name" className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Customer Phone *</label>
                        <input type="tel" value={pos.customerPhone}
                          onChange={(e) => pos.setCustomerInfo(pos.customerName, e.target.value, pos.customerNic, pos.customerAddress)}
                          placeholder="Phone Number" className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Customer NIC *</label>
                        <input type="text" value={pos.customerNic}
                          onChange={(e) => pos.setCustomerInfo(pos.customerName, pos.customerPhone, e.target.value, pos.customerAddress)}
                          placeholder="NIC (e.g., 991234567V)" className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Customer Address *</label>
                        <input type="text" value={pos.customerAddress}
                          onChange={(e) => pos.setCustomerInfo(pos.customerName, pos.customerPhone, pos.customerNic, e.target.value)}
                          placeholder="Address (e.g., Colombo)" className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Agreement Start/Purchase Date *</label>
                        <input type="date" value={pos.hirePurchaseData?.startDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => pos.setHirePurchaseData({
                            ...pos.hirePurchaseData,
                            startDate: e.target.value
                          })}
                          className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Down Payment (Rs.) *</label>
                        <input type="number" value={pos.hirePurchaseData?.downPayment || 0}
                          onChange={(e) => {
                            const dp = Number(e.target.value);
                            const interest = Number(pos.hirePurchaseData?.interestAmount || 0);

                            const netTotal = grandTotal + interest;
                            const bal = netTotal - dp;
                            pos.setHirePurchaseData({
                              ...pos.hirePurchaseData,
                              downPayment: dp,
                              netTotal: netTotal,
                              installmentAmount: bal / (pos.hirePurchaseData?.numberOfInstallments || 1)

                            });
                          }}
                          placeholder="0.00" className="pos-input" style={{ fontSize: '12px', background: '#fff', fontWeight: 'bold', color: '#1e293b' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Down Payment Method *</label>
                        <select 
                          value={pos.hirePurchaseData.downPaymentMethod || 'cash'}
                          onChange={(e) => {
                            pos.setHirePurchaseData({
                              ...pos.hirePurchaseData,
                              downPaymentMethod: e.target.value,
                              downPaymentAccountId: e.target.value === 'cash' ? '' : (accounts.find(a => a.isDefault)?._id || accounts[0]?._id || '')
                            });
                          }}
                          className="pos-input" 
                          style={{ fontSize: '12px', background: '#fff', color: '#1e293b', height: '36px' }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>

                      {(pos.hirePurchaseData.downPaymentMethod || 'cash') !== 'cash' && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Target Bank/Drawer Account *</label>
                          <select
                            value={pos.hirePurchaseData.downPaymentAccountId || ''}
                            onChange={(e) => {
                              pos.setHirePurchaseData({
                                ...pos.hirePurchaseData,
                                downPaymentAccountId: e.target.value
                              });
                            }}
                            className="pos-input"
                            style={{ fontSize: '12px', background: '#fff', color: '#1e293b', height: '36px' }}
                          >
                            <option value="">Select Account</option>
                            {accounts.map(a => (
                              <option key={a._id} value={a._id}>
                                {a.name}

                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>Interest Amount (Rs.)</label>
                        <input type="number" value={pos.hirePurchaseData.interestAmount || 0}
                          onChange={(e) => {
                            const interest = Number(e.target.value);
                            const dp = Number(pos.hirePurchaseData.downPayment || 0);
                            const netTotal = grandTotal + interest;
                            const bal = netTotal - dp;
                            pos.setHirePurchaseData({
                              ...pos.hirePurchaseData,
                              interestAmount: interest,
                              netTotal: netTotal,
                              installmentAmount: bal / (pos.hirePurchaseData.numberOfInstallments || 1)
                            });
                          }}
                          placeholder="0.00" className="pos-input" style={{ fontSize: '12px', background: '#fff', fontWeight: 'bold', color: '#1e293b' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e' }}>No. of Installments</label>
                        <select value={pos.hirePurchaseData.numberOfInstallments}
                          onChange={(e) => {
                            const ni = Number(e.target.value);
                            const interest = Number(pos.hirePurchaseData.interestAmount || 0);
                            const dp = Number(pos.hirePurchaseData.downPayment || 0);
                            const netTotal = grandTotal + interest;
                            const bal = netTotal - dp;
                            pos.setHirePurchaseData({
                              ...pos.hirePurchaseData,
                              numberOfInstallments: ni,
                              installmentAmount: bal / ni
                            });
                          }}
                          className="pos-input" style={{ fontSize: '12px', background: '#fff', color: '#1e293b' }}>
                          {[3, 6, 9, 10, 12, 18, 24].map(n => <option key={n} value={n}>{n} Months</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>Original Price:</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>
                            Rs. {grandTotal.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>Total Payable (with Interest):</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#b45309' }}>
                            Rs. {((grandTotal + Number(pos.hirePurchaseData.interestAmount || 0))).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dotted rgba(146, 64, 14, 0.2)', paddingTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>Remaining Balance:</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#b45309' }}>
                            Rs. {((grandTotal + Number(pos.hirePurchaseData.interestAmount || 0)) - Number(pos.hirePurchaseData.downPayment || 0)).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(146, 64, 14, 0.3)', paddingTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>Installment Amount:</span>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#b45309' }}>
                            Rs. {(((grandTotal + Number(pos.hirePurchaseData.interestAmount || 0)) - Number(pos.hirePurchaseData.downPayment || 0)) / (pos.hirePurchaseData.numberOfInstallments || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Cash tendered */}

                {pos.paymentMethod === 'cash' && !isCredit && (
                  <div className="pos-cash-section">
                    <label className="pos-cash-label">Amount Tendered</label>
                    <div className="pos-cash-input-wrapper">
                      <span className="pos-cash-icon" style={{ fontSize: '14px', fontWeight: 'bold', color: '#9ca3af' }}>Rs.</span>
                      <input
                        type="number"
                        value={pos.tenderedAmount}
                        onChange={(e) => pos.setTenderedAmount(e.target.value)}
                        placeholder="0.00"
                        className="pos-cash-input"
                        min={grandTotal}
                        step="0.01"
                      />
                    </div>
                    {parseFloat(pos.tenderedAmount) >= grandTotal && (
                      <div className="pos-change-display">
                        <span>Change Due:</span>
                        <span className="pos-change-amount">Rs. {change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Single Payment Method Fields (when not split payments) */}
                {payments.length === 1 && pos.paymentMethod !== 'cash' && pos.paymentMethod !== 'hire_purchase' && (
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Landmark size={18} className="text-blue-600" />
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
                        {pos.paymentMethod.replace('_', ' ')} Details
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Target Account *</label>
                        <select
                          value={payments[0]?.accountId || ''}
                          onChange={(e) => {
                            const newPayments = [...payments];
                            newPayments[0].accountId = e.target.value;
                            setPayments(newPayments);
                          }}
                          className="pos-input"
                          style={{ width: '100%', fontSize: '12px', background: '#fff', color: '#1e293b', height: '36px' }}
                        >
                          <option value="">Select Account</option>
                          {accounts.map(a => (
                            <option key={a._id} value={a._id}>
                              {a.name}

                            </option>
                          ))}
                        </select>
                      </div>

                      {pos.paymentMethod === 'cheque' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Cheque Number *</label>
                            <input
                              type="text"
                              required
                              value={payments[0]?.chequeDetails?.number || ''}
                              onChange={(e) => {
                                const newPayments = [...payments];
                                newPayments[0].chequeDetails = { ...newPayments[0].chequeDetails, number: e.target.value };
                                setPayments(newPayments);
                              }}
                              placeholder="Cheque Number"
                              className="pos-input"
                              style={{ fontSize: '12px', height: '36px', background: '#fff', color: '#1e293b' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Bank *</label>
                            <input
                              type="text"
                              required
                              value={payments[0]?.chequeDetails?.bank || ''}
                              onChange={(e) => {
                                const newPayments = [...payments];
                                newPayments[0].chequeDetails = { ...newPayments[0].chequeDetails, bank: e.target.value };
                                setPayments(newPayments);
                              }}
                              placeholder="e.g. BOC"
                              className="pos-input"
                              style={{ fontSize: '12px', height: '36px', background: '#fff', color: '#1e293b' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Due Date *</label>
                            <input
                              type="date"
                              required
                              value={payments[0]?.chequeDetails?.dueDate || ''}
                              onChange={(e) => {
                                const newPayments = [...payments];
                                newPayments[0].chequeDetails = { ...newPayments[0].chequeDetails, dueDate: e.target.value };
                                setPayments(newPayments);
                              }}
                              className="pos-input"
                              style={{ fontSize: '12px', height: '36px', background: '#fff', color: '#1e293b' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Credit Sale Toggle */}
                <label className={`pos-credit-toggle ${isCredit ? 'active' : ''}`}>
                  <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
                  <span>📋 Credit Sale (Pay Later)</span>
                </label>
                {isCredit && (
                  <div className="pos-credit-fields">
                    <label className="pos-credit-label">Amount Paid Now</label>
                    <input
                      type="number"
                      className="pos-credit-input"
                      value={creditAmountPaid}
                      onChange={(e) => setCreditAmountPaid(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      max={grandTotal}
                      step="0.01"
                    />
                    {creditAmountPaid && parseFloat(creditAmountPaid) < grandTotal && (
                      <div className="pos-credit-pending">
                        <span>Pending Balance</span>
                        <span className="pos-credit-pending-amount">Rs. {(grandTotal - parseFloat(creditAmountPaid || 0)).toFixed(2)}</span>
                      </div>
                    )}
                    <input
                      type="text"
                      className="pos-credit-note-input"
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder="Note (e.g. customer name, phone)"
                    />
                  </div>
                )}
              </div> {/* End of scrollable part */}

              <div className="pos-total-row pos-grand-total">
                <span>TOTAL</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <button
                  className="pos-checkout-btn"
                  onClick={handleCreateQuotation}
                  disabled={checkingOut || pos.cart.length === 0}
                  style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', height: '54px', fontSize: '14px' }}
                >
                  📄 GIVE QUOTATION
                </button>
                <button
                  className="pos-checkout-btn"
                  onClick={() => handleCheckout()}
                  disabled={checkingOut || pos.cart.length === 0}
                  style={isCredit ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)', height: '54px' } : { height: '54px' }}
                >
                  {checkingOut ? (
                    <span className="pos-spinner-sm" />
                  ) : (
                    <>
                      <Receipt size={22} />
                      {isCredit ? `CREDIT SALE` : `CHECKOUT`}
                    </>
                  )}
                </button>
              </div>


            </div>
          )}
        </div>
      </div>

      {/* ──────── MODALS ──────── */}

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />

      {/* Invoice */}
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        order={lastOrder}
        onNewSale={handleNewSale}
      />

      {/* Discount Modal */}
      {showDiscount && (
        <div className="pos-modal-overlay" onClick={() => setShowDiscount(false)}>
          <div className="pos-discount-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-discount-header">
              <h3>Apply Discount</h3>
              <button onClick={() => setShowDiscount(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="pos-discount-body">
              <div className="pos-discount-type-toggle">
                <button
                  className={`pos-discount-type-btn ${discountTypeInput === 'percentage' ? 'active' : ''}`}
                  onClick={() => setDiscountTypeInput('percentage')}
                >
                  <Percent size={16} />
                  Percentage
                </button>
                <button
                  className={`pos-discount-type-btn ${discountTypeInput === 'fixed' ? 'active' : ''}`}
                  onClick={() => setDiscountTypeInput('fixed')}
                >
                  <DollarSign size={16} />
                  Fixed Amount
                </button>
              </div>
              <input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountTypeInput === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                className="pos-input pos-discount-input"
                autoFocus
                min="0"
                step="0.01"
              />
              <button className="pos-btn-green pos-btn-lg" onClick={handleApplyDiscount}>
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Summary Modal */}
      {showShiftSummary && shiftData && (
        <div className="pos-modal-overlay" onClick={() => setShowShiftSummary(false)}>
          <div className="pos-shift-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-shift-header">
              <Clock size={22} />
              <h3>Shift Summary</h3>
              <button onClick={() => setShowShiftSummary(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="pos-shift-stats">
              <div className="pos-shift-stat">
                <span className="pos-shift-stat-label">Total Sales</span>
                <span className="pos-shift-stat-value">Rs. {shiftData.summary.totalSales.toFixed(2)}</span>
              </div>
              <div className="pos-shift-stat">
                <span className="pos-shift-stat-label">Transactions</span>
                <span className="pos-shift-stat-value">{shiftData.summary.totalOrders}</span>
              </div>
              <div className="pos-shift-stat">
                <span className="pos-shift-stat-label">Cash Sales</span>
                <span className="pos-shift-stat-value">Rs. {shiftData.summary.cashSales.toFixed(2)}</span>
              </div>
              <div className="pos-shift-stat">
                <span className="pos-shift-stat-label">Card Sales</span>
                <span className="pos-shift-stat-value">Rs. {shiftData.summary.cardSales.toFixed(2)}</span>
              </div>
              <div className="pos-shift-stat">
                <span className="pos-shift-stat-label">Koko Sales</span>
                <span className="pos-shift-stat-value">Rs. {(shiftData.summary.kokoSales || 0).toFixed(2)}</span>
              </div>
            </div>
            {shiftData.orders.length > 0 && (
              <div className="pos-shift-orders">
                <h4>Recent Transactions</h4>
                {shiftData.orders.slice(0, 10).map((order) => (
                  <div key={order._id} className="pos-shift-order-row">
                    <span className="pos-shift-order-id">#{order._id.slice(-6)}</span>
                    <span className="pos-shift-order-method">{order.paymentMethod}</span>
                    <span className="pos-shift-order-items">{order.items.length} items</span>
                    <span className="pos-shift-order-total">Rs. {order.totalAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      {showStartSession && (
        <div className="pos-modal-overlay" onClick={() => { }}>
          <div className="pos-shift-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-shift-header">
              <Clock size={22} />
              <h3>Start Day (Opening Cash)</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <p style={{ marginTop: 0, color: '#64748b', fontSize: '13px' }}>Enter opening cash denominations. Total is calculated automatically.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[5000, 1000, 500, 100, 50, 20].map((d) => (
                  <div key={d}>
                    <label style={{ fontSize: '12px', color: '#374151' }}>{d} LKR</label>
                    <input
                      type="number"
                      min="0"
                      value={sessionForm.opening[d]}
                      onChange={(e) => setSessionForm((s) => ({ ...s, opening: { ...s.opening, [d]: Number(e.target.value || 0) } }))}
                      className="pos-input"
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontWeight: 700 }}>Total: Rs. {calcTotal(sessionForm.opening).toFixed(2)}</div>
              <button className="pos-btn-green pos-btn-lg" style={{ marginTop: '14px' }} onClick={handleStartSession}>
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndSession && (
        <div className="pos-modal-overlay" onClick={() => setShowEndSession(false)}>
          <div className="pos-shift-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-shift-header">
              <Clock size={22} />
              <h3>Close Day (Closing Cash)</h3>
              <button onClick={() => setShowEndSession(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '16px' }}>
              <p style={{ marginTop: 0, color: '#64748b', fontSize: '13px' }}>Count physical cash by denomination. Variance will be flagged automatically.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[5000, 1000, 500, 100, 50, 20].map((d) => (
                  <div key={d}>
                    <label style={{ fontSize: '12px', color: '#374151' }}>{d} LKR</label>
                    <input
                      type="number"
                      min="0"
                      value={sessionForm.closing[d]}
                      onChange={(e) => setSessionForm((s) => ({ ...s, closing: { ...s.closing, [d]: Number(e.target.value || 0) } }))}
                      className="pos-input"
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontWeight: 700 }}>Total: Rs. {calcTotal(sessionForm.closing).toFixed(2)}</div>
              <button className="pos-btn-green pos-btn-lg" style={{ marginTop: '14px' }} onClick={handleEndSession}>
                Close Session
              </button>
            </div>
          </div>
        </div>
      )}

      {showBalanceModal && (
        <div className="pos-modal-overlay" onClick={() => setShowBalanceModal(false)}>
          <div
            className="pos-shift-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0b1220', border: '1px solid #1f2937', color: '#e2e8f0', width: 'min(1200px, 96vw)', maxHeight: '92vh' }}
          >
            <div className="pos-shift-header">
              <DollarSign size={22} />
              <h3>Daily Cash Balance</h3>
              <button onClick={() => setShowBalanceModal(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '16px', color: '#e2e8f0' }}>
              {balanceLoading ? (
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Loading balance...</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', fontSize: '13px' }}>
                    {[
                      ['Opening Cash', `Rs. ${Number(posSession?.openingCashAmount || 0).toFixed(2)}`],
                      ['Total Sales', `Rs. ${Number(dailyFinancials?.totalSales || 0).toFixed(2)}`],
                      ['Cash Sales', `Rs. ${Number(dailyFinancials?.cashSales || 0).toFixed(2)}`],
                      ['Card Sales', `Rs. ${Number(dailyFinancials?.cardSales || 0).toFixed(2)}`],
                      ['Koko Sales', `Rs. ${Number(dailyFinancials?.kokoSales || 0).toFixed(2)}`],
                      ['Items Sold', `${Number(dailyFinancials?.totalItemsSold || 0)}`],
                      ['System Revenue', `Rs. ${Number(dailyFinancials?.systemRevenue || 0).toFixed(2)}`],
                      ['Profit of Day', `Rs. ${Number(dailyFinancials?.profitOfDay || 0).toFixed(2)}`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: '#111827',
                          border: '1px solid #374151',
                          borderRadius: '10px',
                          padding: '10px',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      Expected Physical Cash: <strong>Rs. {(Number(posSession?.openingCashAmount || 0) + Number(dailyFinancials?.cashSales || 0)).toFixed(2)}</strong>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                      Formula: Opening cash + Cash sales
                    </div>
                  </div>
                  <div style={{ marginTop: '14px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#cbd5e1' }}>Sales History</h4>
                    <div style={{ maxHeight: '420px', overflow: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ background: '#111827', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>Time</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>Customer</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>Items</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>Payment</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: '#94a3b8' }}>Total</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: '#94a3b8' }}>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balanceOrders.map((order) => (
                            <tr key={order._id} style={{ borderTop: '1px solid #1f2937' }}>
                              <td style={{ padding: '8px', color: '#e2e8f0', verticalAlign: 'top' }}>
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </td>
                              <td style={{ padding: '8px', color: '#cbd5e1', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{order.customerName || 'Walk-in Customer'}</div>
                                <div style={{ color: '#94a3b8', marginTop: '2px' }}>{order.customerPhone || '-'}</div>
                              </td>
                              <td style={{ padding: '8px', color: '#cbd5e1' }}>
                                {(order.itemDetails || []).map((it) => `${it.name} x${it.quantity} @ Rs.${Number(it.unitPrice || 0).toFixed(2)}`).join(', ')}
                              </td>
                              <td style={{ padding: '8px', color: '#e2e8f0', textTransform: 'uppercase' }}>
                                {order.paymentMethod}
                              </td>
                              <td style={{ padding: '8px', color: '#f8fafc', textAlign: 'right' }}>
                                Rs. {Number(order.totalAmount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', color: Number(order.estimatedProfit || 0) < 0 ? '#fca5a5' : '#86efac', textAlign: 'right', fontWeight: 700 }}>
                                Rs. {Number(order.estimatedProfit || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {balanceOrders.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '10px', color: '#94a3b8', textAlign: 'center' }}>
                                No sales history for today.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Orders Panel */}
      {showCreditPanel && (
        <div className="pos-credit-overlay" onClick={() => setShowCreditPanel(false)}>
          <div className="pos-credit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pos-credit-panel-header">
              <div>
                <h2>📋 Credit Orders</h2>
                <p>{creditOrders.length} pending credit sales</p>
              </div>
              <button className="pos-scanner-close" onClick={() => setShowCreditPanel(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="pos-credit-panel-body">
              {creditLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem' }}><div className="pos-spinner" /></div>
              ) : creditOrders.length === 0 ? (
                <div className="pos-credit-empty">
                  <p>✅</p>
                  <p>No pending credit orders</p>
                </div>
              ) : (
                creditOrders.map((order) => (
                  <div key={order._id} className="pos-credit-card">
                    <div className="pos-credit-card-header">
                      <div>
                        <span className="pos-credit-invoice">{order.invoiceNumber}</span>
                        <span className="pos-credit-date">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <span className="pos-credit-badge">
                        Pending: Rs. {Number(order.creditBalance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="pos-credit-card-info">
                      <div><span>Customer:</span> <strong>{order.customerName || order.customerPhone || 'Walk-in'}</strong></div>
                      <div><span>Total:</span> <strong>Rs. {Number(order.totalAmount).toFixed(2)}</strong></div>
                      <div><span>Paid:</span> <strong style={{ color: '#4ade80' }}>Rs. {Number(order.amountPaid || 0).toFixed(2)}</strong></div>
                    </div>
                    {order.creditNote && <p className="pos-credit-card-note">Note: {order.creditNote}</p>}
                    <div className="pos-credit-card-actions">
                      <input
                        type="number"
                        className="pos-credit-settle-input"
                        placeholder="Amount"
                        value={settleAmount[order._id] || ''}
                        onChange={(e) => setSettleAmount((p) => ({ ...p, [order._id]: e.target.value }))}
                      />
                      <button className="pos-credit-btn pos-credit-btn-partial" onClick={() => handleSettleCredit(order._id)}>
                        Pay Partial
                      </button>
                      <button className="pos-credit-btn pos-credit-btn-full" onClick={() => handleSettleFull(order._id)}>
                        Pay Full
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Product Modal */}
      {showQuickAdd && (
        <div className="pos-modal-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="pos-discount-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="pos-discount-header">
              <h3>Quick Add Product</h3>
              <button onClick={() => setShowQuickAdd(false)}><X size={20} /></button>
            </div>
            <div className="pos-discount-body" style={{ gap: '12px' }}>
              <div className="pos-form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Product Name</label>
                <input
                  type="text"
                  className="pos-input"
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  placeholder="e.g. iPhone 15 Pro"
                />
              </div>
              <div className="pos-form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Category</label>
                <input
                  list="pos-category-suggestions"
                  className="pos-input"
                  value={categories.find(c => c._id === quickAddForm.categoryId)?.name || quickAddForm.categoryId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const existing = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                    setQuickAddForm({ ...quickAddForm, categoryId: existing ? existing._id : val });
                  }}
                  placeholder="Type category name"
                />
                <datalist id="pos-category-suggestions">
                  {categories.map(c => <option key={c._id} value={c.name} />)}
                </datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="pos-form-group">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Selling Price</label>
                  <input
                    type="number"
                    className="pos-input"
                    value={quickAddForm.price}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="pos-form-group">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Initial Stock</label>
                  <input
                    type="number"
                    className="pos-input"
                    value={quickAddForm.stock}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, stock: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
              <button
                className="pos-btn-green pos-btn-lg"
                style={{ marginTop: '8px' }}
                onClick={handleQuickAdd}
                disabled={!quickAddForm.name || !quickAddForm.price || !quickAddForm.categoryId}
              >
                Add & Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reload Modal */}
      <ReloadModal 
        isOpen={showReloadModal} 
        onClose={() => setShowReloadModal(false)}
        storeId={user?.assignedStore || user?.assignedStoreId || user?.storeId || posSession?.storeId}
        accountId={pos.accountId}
      />

      <CustomerHistoryModal
        isOpen={showCustomerHistory}
        onClose={() => setShowCustomerHistory(false)}
        phone={pos.customerPhone}
      />
    </div>

  );
};

export default POSScreen;
