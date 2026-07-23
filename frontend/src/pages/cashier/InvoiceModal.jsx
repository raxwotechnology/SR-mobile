import { useEffect, useRef, useState } from 'react';
import { X, Printer, RotateCcw } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { getImageUrl } from '../../utils/imageHelper';
import useSettingsStore from '../../store/settingsStore';
import { sendInvoiceReceipt } from '../../services/api';
import { toast } from 'react-toastify';

const InvoiceModal = ({ isOpen, onClose, order, onNewSale }) => {
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Mobile Hub';
  const brandAddress = settings?.address || '';
  const brandPhone = settings?.phone || '';
  const brandEmail = settings?.email || '';
  const receiptTemplate = settings?.documentTemplates?.posReceipt || {};
  const invoiceTemplate = settings?.documentTemplates?.invoice || {};
  
  const [layoutMode, setLayoutMode] = useState('receipt'); // 'receipt' or 'invoice'
  const [smsRecipient, setSmsRecipient] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const documentTemplate = layoutMode === 'receipt' ? receiptTemplate : invoiceTemplate;
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (order) {
      setSmsRecipient(order.customerPhone || '');
      setEmailRecipient(order.customerEmail || '');
    }
  }, [order]);

  useEffect(() => {
    if (isOpen && order?.invoiceNumber && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, order.invoiceNumber || order.quotationNumber, {
          format: 'CODE128',
          width: 1.2,
          height: 30,
          displayValue: true,
          fontSize: 10,
          margin: 4,
          textMargin: 2,
        });
      } catch { /* ignore */ }
    }
  }, [isOpen, order, layoutMode]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    onNewSale();
    onClose();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleSendSms = async () => {
    if (!smsRecipient) {
      toast.error('Please enter a phone number');
      return;
    }
    try {
      setSendingSms(true);
      await sendInvoiceReceipt(order._id, { type: 'sms', recipient: smsRecipient });
      toast.success('SMS receipt sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send SMS receipt');
    } finally {
      setSendingSms(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      setSendingEmail(true);
      await sendInvoiceReceipt(order._id, { type: 'email', recipient: emailRecipient });
      toast.success('Email receipt sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send Email receipt');
    } finally {
      setSendingEmail(false);
    }
  };

  const subtotal = order.subtotal ?? order.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? order.totalAmount;
  const discountAmount = order.discountAmount || 0;
  const couponDiscount = order.couponDiscount || 0;
  const totalDiscount = discountAmount + couponDiscount;
  const taxAmount = order.tax || 0;
  const showTax = documentTemplate.showTax !== false;
  const showWarranty = documentTemplate.showWarranty !== false && settings?.receiptSettings?.showWarranty !== false;
  const showBarcode = documentTemplate.showBarcode !== false;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-invoice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: layoutMode === 'invoice' ? '800px' : '420px', width: '100%', transition: 'all 0.3s' }}>
        {/* Close button — hidden when printing */}
        <button className="pos-invoice-close no-print" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Layout Mode Selector — hidden when printing */}
        <div className="flex justify-center border-b border-gray-100 p-3 no-print" style={{ gap: '10px' }}>
          <button 
            type="button"
            onClick={() => setLayoutMode('receipt')} 
            style={{ 
              padding: '6px 16px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              borderRadius: '8px', 
              border: layoutMode === 'receipt' ? 'none' : '1px solid #e2e8f0', 
              background: layoutMode === 'receipt' ? '#2563eb' : 'transparent',
              color: layoutMode === 'receipt' ? '#fff' : '#64748b',
              cursor: 'pointer'
            }}
          >
            POS Receipt (80mm)
          </button>
          <button 
            type="button"
            onClick={() => setLayoutMode('invoice')} 
            style={{ 
              padding: '6px 16px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              borderRadius: '8px', 
              border: layoutMode === 'invoice' ? 'none' : '1px solid #e2e8f0', 
              background: layoutMode === 'invoice' ? '#2563eb' : 'transparent',
              color: layoutMode === 'invoice' ? '#fff' : '#64748b',
              cursor: 'pointer'
            }}
          >
            A4 Invoice
          </button>
        </div>

        {/* ═══════ Professional Receipt/Invoice Content ═══════ */}
        <div className="pos-receipt" id="pos-receipt-content" style={{ padding: '20px', background: '#fff', color: '#111' }}>
          {layoutMode === 'invoice' ? (
            /* ═══════ Tax Invoice Layout (A4 Style) ═══════ */
            <div className="a4-invoice-content" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#334155' }}>
              {/* Corporate Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  {settings?.logo && (
                    <img src={getImageUrl(settings.logo)} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '8px', display: 'block', borderRadius: '8px' }} />
                  )}
                  {settings?.letterheadHeader ? (
                    <div style={{ fontSize: '11px', whiteSpace: 'pre-line', color: '#334155', lineHeight: '1.4', fontFamily: 'inherit', textAlign: 'left' }}>
                      {settings.letterheadHeader}
                    </div>
                  ) : (
                    <>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                        {order.storeId?.name || brandName}
                      </h2>
                      <p style={{ fontSize: '11px', margin: '4px 0 0', color: '#64748b', lineHeight: '1.4' }}>
                        {order.storeId?.address || brandAddress}<br />
                        Phone: {order.storeId?.phone || brandPhone} | Email: {order.storeId?.email || brandEmail}
                      </p>
                    </>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', margin: 0, letterSpacing: '1px' }}>
                    TAX INVOICE
                  </h1>
                  <p style={{ fontSize: '11px', margin: '4px 0 0', color: '#64748b', lineHeight: '1.4' }}>
                    Invoice No: <strong style={{ color: '#1e293b' }}>{order.invoiceNumber || order._id?.slice(-8).toUpperCase()}</strong><br />
                    Date: {formatDate(order.createdAt)} | Time: {formatTime(order.createdAt)}
                  </p>
                </div>
              </div>

              {/* Info Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>Customer Details</h3>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>{order.customerName || 'Walk-in Customer'}</p>
                  {order.customerPhone && <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px 0' }}>Phone: {order.customerPhone}</p>}
                  {order.customerNic && <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px 0' }}>NIC: {order.customerNic}</p>}
                  {order.customerAddress && <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Address: {order.customerAddress}</p>}

                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>Transaction Info</h3>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px 0' }}>Method: <strong style={{ textTransform: 'uppercase', color: '#1e293b' }}>{order.paymentMethod}</strong></p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Cashier: {order.cashierId?.name || 'System'}</p>
                </div>
              </div>

              {/* Items Grid */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '60px' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '100px' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '100px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.warranty && <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>Warranty: {item.warranty}</div>}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#334155' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#334155' }}>Rs. {item.price.toLocaleString()}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>Rs. {(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Credit Plan Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
                <div>
                  {order.paymentMethod === 'hire_purchase' && (
                    <div style={{ border: '1px solid #fde68a', background: '#fffbeb', padding: '12px', borderRadius: '12px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 800, color: '#92400e', borderBottom: '1px solid #fde68a', paddingBottom: '4px' }}>
                        INSTALLMENT PLAN (CREDIT SALE)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: '#92400e' }}>
                        <div>Original Price:</div>
                        <div style={{ fontWeight: 700, textAlign: 'right' }}>Rs. {subtotal.toLocaleString()}</div>

                        <div>Down Payment:</div>
                        <div style={{ fontWeight: 700, textAlign: 'right' }}>Rs. {(order.hirePurchaseData?.downPayment || order.tenderedAmount || 0).toLocaleString()}</div>

                        <div>Interest Added:</div>
                        <div style={{ fontWeight: 700, textAlign: 'right' }}>Rs. {(order.hirePurchaseData?.interestAmount || 0).toLocaleString()}</div>

                        <div>Plan Duration:</div>
                        <div style={{ textAlign: 'right' }}>{order.hirePurchaseData?.numberOfInstallments || 'N/A'} Months</div>

                        <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #fde68a', margin: '4px 0' }} />

                        <div style={{ fontWeight: 800 }}>Installment:</div>
                        <div style={{ fontWeight: 900, fontSize: '13px', color: '#b45309', textAlign: 'right' }}>Rs. {(order.hirePurchaseData?.installmentAmount || 0).toLocaleString()}/month</div>
                      </div>
                    </div>
                  )}

                  {order.isCredit && !order.hirePurchaseData && (
                    <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', color: '#92400e' }}>
                        <span>Paid Advance:</span>
                        <span style={{ fontWeight: 700 }}>Rs. {(order.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                        <span>Balance Outstanding:</span>
                        <span>Rs. {(order.creditBalance || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '260px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b' }}>
                    <span>Subtotal:</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626' }}>
                      <span>Discount:</span>
                      <span>-Rs. {totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {showTax && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b' }}>
                      <span>Tax:</span>
                      <span>Rs. {taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #e2e8f0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                    <span>GRAND TOTAL:</span>
                    <span>Rs. {order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms, Letterhead & Seal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <div style={{ width: '65%', fontSize: '10px', color: '#64748b', textAlign: 'left' }}>
                  {settings?.letterheadFooter ? (
                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4', marginBottom: '8px' }}>
                      {settings.letterheadFooter}
                    </div>
                  ) : (
                    <p style={{ margin: '0 0 6px 0' }}>{settings?.receiptSettings?.footerMessage || 'Thank you for your purchase!'}</p>
                  )}
                  {settings?.receiptSettings?.termsAndConditions && <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontStyle: 'italic' }}>T&C: {settings.receiptSettings.termsAndConditions}</p>}
                  {showWarranty && settings?.receiptSettings?.warrantyTerms && <p style={{ margin: 0, fontSize: '9px', fontStyle: 'italic' }}>Warranty: {settings.receiptSettings.warrantyTerms}</p>}
                </div>
                
                <div style={{ width: '30%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {(settings?.sealUrl || settings?.seal) && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <img src={getImageUrl(settings.sealUrl || settings.seal)} alt="Seal" style={{ width: '64px', height: '64px', objectFit: 'contain', opacity: 0.8, margin: '0 auto' }} />
                      <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Seal</div>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #cbd5e1', width: '100%', textAlign: 'center', paddingTop: '4px', fontSize: '10px', fontWeight: 600, color: '#475569' }}>
                    Authorized Signature
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ═══════ Narrow POS Receipt Layout (80mm Style) ═══════ */
            <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>
              {/* Store Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: '12px', marginBottom: '10px' }}>
                {settings?.logo && (
                  <img src={getImageUrl(settings.logo)} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 6px', display: 'block', borderRadius: '8px' }} />
                )}
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', color: '#111', letterSpacing: '1px' }}>
                  {order.storeId?.name || brandName}
                </h2>
                {(order.storeId?.address || brandAddress) && (
                  <p style={{ fontSize: '10px', margin: '0', color: '#555' }}>
                    {order.storeId?.address || brandAddress}
                  </p>
                )}
                {(order.storeId?.phone || brandPhone) && (
                  <p style={{ fontSize: '10px', margin: '0', color: '#555' }}>
                    Tel: {order.storeId?.phone || brandPhone}
                    {(order.storeId?.email || brandEmail) && ` | ${order.storeId?.email || brandEmail}`}
                  </p>
                )}
              </div>

              {/* Invoice Title */}
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '3px', color: '#333' }}>
                  {order.quotationNumber ? 'QUOTATION' : (documentTemplate.title || 'RECEIPT').toUpperCase()}
                </p>
              </div>

              {/* Invoice Meta */}
              <div style={{ fontSize: '11px', borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '8px 0', margin: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: '#666' }}>{order.quotationNumber ? 'Quotation #' : 'Invoice #'}</span>
                  <span style={{ fontWeight: 700, color: '#111' }}>{order.quotationNumber || order.invoiceNumber || order._id?.slice(-8).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: '#666' }}>Date:</span>
                  <span style={{ color: '#111' }}>{formatDate(order.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: '#666' }}>Time:</span>
                  <span style={{ color: '#111' }}>{formatTime(order.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: '#666' }}>Cashier:</span>
                  <span style={{ color: '#111' }}>{order.cashierId?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Payment:</span>
                  <span style={{ fontWeight: 700, color: '#111', textTransform: 'uppercase', background: '#f3f4f6', padding: '1px 8px', borderRadius: '4px', fontSize: '10px' }}>
                    {order.paymentMethod}
                  </span>
                </div>
              </div>

              {(order.customerName || order.customerPhone || order.customerNic || order.customerAddress) && (

                <div style={{ fontSize: '11px', borderBottom: '1px dashed #999', padding: '6px 0', margin: '0 0 6px' }}>
                  {order.customerName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ color: '#666' }}>Customer:</span>
                      <span style={{ color: '#111', fontWeight: 600 }}>{order.customerName}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>

                      <span style={{ color: '#666' }}>Phone:</span>
                      <span style={{ color: '#111' }}>{order.customerPhone}</span>
                    </div>
                  )}
                  {order.customerNic && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ color: '#666' }}>NIC:</span>
                      <span style={{ color: '#111' }}>{order.customerNic}</span>
                    </div>
                  )}
                  {order.customerAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Address:</span>
                      <span style={{ color: '#111', textAlign: 'right', maxWidth: '70%', wordBreak: 'break-word' }}>{order.customerAddress}</span>
                    </div>
                  )}

                </div>
              )}

              {/* Items Table */}
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 65px 70px', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#666', borderBottom: '1px solid #ddd', padding: '4px 0', textTransform: 'uppercase' }}>
                  <span>Item</span>
                  <span style={{ textAlign: 'center' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Price</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ padding: '5px 0', borderBottom: '1px dotted #eee' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 65px 70px', gap: '4px', fontSize: '11px' }}>
                      <span style={{ color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <span style={{ textAlign: 'center', color: '#333' }}>{item.quantity}</span>
                      <span style={{ textAlign: 'right', color: '#555' }}>{item.price.toFixed(2)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: '#111' }}>{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {showWarranty && item.warranty && (
                      <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic', marginTop: '1px' }}>
                        Warranty: {item.warranty}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderTop: '2px solid #333', margin: '8px 0 0', padding: '8px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#555' }}>
                  <span>Subtotal:</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#dc2626' }}>
                    <span>Discount:</span>
                    <span>-Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {order.couponCode && couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#dc2626' }}>
                    <span>Coupon ({order.couponCode}):</span>
                    <span>-Rs. {couponDiscount.toFixed(2)}</span>
                  </div>
                )}

                {showTax && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#555' }}>
                    <span>Tax:</span>
                    <span>Rs. {taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, padding: '8px 0', borderTop: '2px double #333', borderBottom: '2px double #333', margin: '6px 0', color: '#111' }}>
                  <span>TOTAL</span>
                  <span>Rs. {order.totalAmount.toFixed(2)}</span>
                </div>

                {order.paymentMethod === 'cash' && !order.isCredit && (
                  <div style={{ margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', color: '#555' }}>
                      <span>Amount Tendered:</span>
                      <span>Rs. {(order.tenderedAmount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                      <span>Change Due:</span>
                      <span>Rs. {(order.changeGiven || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {order.isCredit && (
                  <div style={{ margin: '6px 0', border: '1px solid #fde68a', background: '#fffbeb', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', color: '#92400e' }}>
                      <span>Amount Paid:</span>
                      <span style={{ fontWeight: 700 }}>Rs. {(order.amountPaid || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                      <span>Balance Due:</span>
                      <span>Rs. {(order.creditBalance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {order.paymentMethod === 'hire_purchase' && (
                  <div style={{ margin: '6px 0', border: '1px solid #fcd34d', background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 800, color: '#92400e', textAlign: 'center', borderBottom: '1px solid #fde68a', paddingBottom: '4px' }}>
                      INSTALLMENT PLAN (HP)
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#92400e' }}>
                      <span>Down Payment:</span>
                      <span style={{ fontWeight: 700 }}>Rs. {(order.hirePurchaseData?.downPayment || order.tenderedAmount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#92400e' }}>
                      <span>Terms:</span>
                      <span>{order.hirePurchaseData?.numberOfInstallments || 'N/A'} Months</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#b45309', marginTop: '4px', borderTop: '1px dashed #fde68a', paddingTop: '4px' }}>
                      <span>Installment:</span>
                      <span>Rs. {(order.hirePurchaseData?.installmentAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal Terms */}
              <div style={{ borderTop: '1px solid #111', paddingTop: '10px', marginTop: '10px' }}>
                {showWarranty && settings?.receiptSettings?.warrantyTerms && (
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 2px', color: '#111' }}>Warranty Policy:</p>
                    <p style={{ fontSize: '8px', color: '#555', margin: 0, lineHeight: '1.2' }}>{settings.receiptSettings.warrantyTerms}</p>
                  </div>
                )}
                {settings?.receiptSettings?.termsAndConditions && (
                  <div>
                    <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 2px', color: '#111' }}>Terms & Conditions:</p>
                    <p style={{ fontSize: '8px', color: '#555', margin: 0, lineHeight: '1.2' }}>{settings.receiptSettings.termsAndConditions}</p>
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div style={{ textAlign: 'center', margin: '10px 0 6px', borderTop: '1px dashed #999', paddingTop: '8px' }}>
                {showBarcode && <svg ref={barcodeRef} style={{ maxWidth: '200px', display: 'block', margin: '0 auto' }}></svg>}
                
                {(settings?.sealUrl || settings?.seal) && (
                  <img src={getImageUrl(settings.sealUrl || settings.seal)} alt="Seal" style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '6px auto', display: 'block', opacity: 0.8 }} />
                )}

                {(documentTemplate.footerText || settings?.receiptSettings?.footerMessage) && (
                  <p style={{ fontSize: '10px', color: '#111', fontWeight: 700, margin: '8px 0 0' }}>
                    {documentTemplate.footerText || settings.receiptSettings.footerMessage}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', borderTop: '1px dashed #999', paddingTop: '8px', marginTop: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 2px', color: '#333' }}>
                  {order.quotationNumber ? 'Quotation valid for 7 days' : 'Thank you for shopping with us!'}
                </p>
                <p style={{ fontSize: '9px', color: '#888', margin: '0 0 2px' }}>
                  Items: {order.items?.reduce((s, i) => s + i.quantity, 0)} | {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                </p>
                <p style={{ fontSize: '8px', color: '#aaa', margin: '4px 0 0' }}>
                  Powered by {brandName}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Send Receipt Panel — hidden when printing */}
        <div className="no-print" style={{ padding: '15px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Send Invoice / Receipt
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="SMS Phone Number (+947XXXXXXXX)" 
              value={smsRecipient}
              onChange={(e) => setSmsRecipient(e.target.value)}
              style={{ fontSize: '12px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#1e293b' }}
            />
            <button 
              type="button"
              onClick={handleSendSms}
              disabled={sendingSms}
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 0.2s' }}
            >
              {sendingSms ? 'Sending...' : 'Send SMS'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              style={{ fontSize: '12px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#1e293b' }}
            />
            <button 
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 0.2s' }}
            >
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>

        {/* Action buttons — hidden when printing */}
        <div className="pos-invoice-actions no-print" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
          <button className="pos-btn-outline" onClick={handlePrint}>
            <Printer size={18} />
            Print Layout
          </button>
          <button className="pos-btn-green pos-btn-lg" onClick={handleNewSale}>
            <RotateCcw size={18} />
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
