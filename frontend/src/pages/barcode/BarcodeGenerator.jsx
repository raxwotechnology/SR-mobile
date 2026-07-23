import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Printer, Download, Package, Barcode, Plus, Minus, Store, X, Trash2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import DashboardLayout from '../../components/DashboardLayout';
<<<<<<< HEAD
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
import { getAdminProducts, logBarcodeGeneration, getSettings, updateSettings } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-toastify';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

// Dynamic nav items based on role
import { adminNavGroups } from '../admin/adminNavItems';
import { managerNavGroups } from '../storeOwner/managerNavItems';
import { getEmployeeNavGroups } from '../employee/employeeNav';

const DEFAULT_PRINTERS = [
  { _id: 'p1', name: 'Zebra ZD220 (50mm x 30mm)', layout: '50x30', connection: 'USB', isDefault: true },
  { _id: 'p2', name: 'Xprinter XP-365B (38mm x 25mm)', layout: '38x25', connection: 'USB', isDefault: false },
  { _id: 'p3', name: 'A4 Laser Printer (3-Col Grid)', layout: 'a4_3col', connection: 'System Spooler', isDefault: false }
];

const BarcodeGenerator = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(12);
  const [shopName, setShopName] = useState('Mobile Hub');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const printRef = useRef(null);

  // Printers Configuration States
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
<<<<<<< HEAD
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
  const [newPrinter, setNewPrinter] = useState({ name: '', layout: '50x30', connection: 'USB' });
  const [printerAssignments, setPrinterAssignments] = useState({});

  useEffect(() => {
    loadProducts();
    loadSettings();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await getAdminProducts();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await getSettings();
      if (data?.shopName) setShopName(data.shopName);
      if (data?.labelPrinters && data.labelPrinters.length > 0) {
        setPrinters(data.labelPrinters);
        const def = data.labelPrinters.find(p => p.isDefault) || data.labelPrinters[0];
        setSelectedPrinter(def);
      } else {
        setPrinters(DEFAULT_PRINTERS);
        setSelectedPrinter(DEFAULT_PRINTERS[0]);
      }
    } catch {
      setPrinters(DEFAULT_PRINTERS);
      setSelectedPrinter(DEFAULT_PRINTERS[0]);
    }
  };

  const handleSavePrinters = async (updatedPrinters) => {
    try {
      const { data } = await updateSettings({ labelPrinters: updatedPrinters });
      setPrinters(data.labelPrinters || []);
      const def = data.labelPrinters?.find(p => p.isDefault) || data.labelPrinters?.[0] || null;
      setSelectedPrinter(def);
      toast.success('Printers list updated');
    } catch {
      toast.error('Failed to update printers list');
    }
  };

  const handleAddPrinter = (e) => {
    e.preventDefault();
    if (!newPrinter.name.trim()) return toast.warning('Printer name is required');
    const updated = [
      ...printers,
      {
        _id: 'temp_' + Date.now(),
        name: newPrinter.name.trim(),
        layout: newPrinter.layout,
        connection: newPrinter.connection,
        isDefault: printers.length === 0
      }
    ];
    setPrinters(updated);
    setNewPrinter({ name: '', layout: '50x30', connection: 'USB' });
    handleSavePrinters(updated);
  };

<<<<<<< HEAD
  const handleDeleteClick = (printer) => {
    setItemToDelete(printer);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    const updated = printers.filter(p => p._id !== itemToDelete._id);
=======
  const handleDeletePrinter = (id) => {
    const updated = printers.filter(p => p._id !== id);
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
    if (updated.length > 0 && !updated.some(p => p.isDefault)) {
      updated[0].isDefault = true;
    }
    setPrinters(updated);
    handleSavePrinters(updated);
  };

  const handleSetDefaultPrinter = (id) => {
    const updated = printers.map(p => ({
      ...p,
      isDefault: p._id === id
    }));
    setPrinters(updated);
    handleSavePrinters(updated);
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const getBarcodeValue = (product) => {
    return product.barcode || product.sku || `ZFC-${product._id?.slice(-8).toUpperCase()}`;
  };

  const handleGenerate = async () => {
    if (!selectedProduct) {
      toast.warning('Please select a product first');
      return;
    }
    setGenerating(true);
    try {
      await logBarcodeGeneration({
        productId: selectedProduct._id,
        quantity,
        printerName: selectedPrinter?.name || 'Default Printer'
      });
      setGenerated(true);
      
      // Initialize printer assignments: default printer gets the full quantity, others get 0
      const initial = {};
      printers.forEach(p => {
        initial[p._id] = p._id === selectedPrinter?._id ? quantity : 0;
      });
      setPrinterAssignments(initial);

      toast.success(`${quantity} barcode labels generated for ${selectedPrinter?.name || 'Default Printer'}`);
      setTimeout(() => renderBarcodes(), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate barcodes');
    } finally {
      setGenerating(false);
    }
  };

  const renderBarcodes = useCallback(() => {
    if (!selectedProduct) return;
    const barcodeValue = getBarcodeValue(selectedProduct);
    const svgs = document.querySelectorAll('.barcode-svg');
    svgs.forEach(svg => {
      try {
        JsBarcode(svg, barcodeValue, {
          format: 'CODE128',
          width: selectedPrinter?.layout === '38x25' ? 1.2 : 1.5,
          height: selectedPrinter?.layout === '38x25' ? 22 : 36,
          displayValue: true,
          fontSize: 9,
          margin: 1,
          textMargin: 1,
        });
      } catch { /* ignore invalid */ }
    });
  }, [selectedProduct, selectedPrinter]);

  useEffect(() => {
    if (generated && selectedProduct) {
      setTimeout(() => renderBarcodes(), 50);
    }
  }, [generated, selectedProduct, quantity, selectedPrinter, renderBarcodes]);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateAssignment = (printerId, val) => {
    const qty = Math.max(0, Math.min(500, parseInt(val) || 0));
    setPrinterAssignments(prev => ({
      ...prev,
      [printerId]: qty
    }));
  };

  const handlePrintForPrinter = async (printer, qty) => {
    if (qty <= 0) {
      toast.warning(`Please assign a quantity greater than 0 to ${printer.name}`);
      return;
    }
    
    // Switch active printer and quantity
    setSelectedPrinter(printer);
    setQuantity(qty);
    
    // Log the print transaction to the backend
    try {
      await logBarcodeGeneration({
        productId: selectedProduct._id,
        quantity: qty,
        printerName: printer.name
      });
    } catch (err) {
      console.error('Failed to log printer assignment:', err);
    }
    
    // Wait for render of layout styles and JSBarcode SVGs to complete, then print
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const getLayoutStyles = () => {
    const layout = selectedPrinter?.layout || '50x30';
    if (layout === '50x30') {
      return `
        @media print {
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-only {
            position: fixed !important;
            left: 0; top: 0;
            width: 50mm !important;
            height: 30mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: 50mm 30mm !important;
            margin: 0 !important;
          }
          .barcode-grid {
            display: block !important;
            width: 50mm !important;
            height: 30mm !important;
          }
          .barcode-label {
            width: 50mm !important;
            height: 30mm !important;
            border: none !important;
            padding: 1.5mm !important;
            page-break-after: always !important;
            break-after: always !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `;
    }
    if (layout === '38x25') {
      return `
        @media print {
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-only {
            position: fixed !important;
            left: 0; top: 0;
            width: 78mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: 78mm 25mm !important;
            margin: 0 !important;
          }
          .barcode-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2mm !important;
            width: 78mm !important;
          }
          .barcode-label {
            width: 38mm !important;
            height: 25mm !important;
            border: none !important;
            padding: 1mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `;
    }
    if (layout === '80mm') {
      return `
        @media print {
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-only {
            position: fixed !important;
            left: 0; top: 0;
            width: 80mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: 80mm auto !important;
            margin: 0 !important;
          }
          .barcode-grid {
            display: block !important;
            width: 80mm !important;
          }
          .barcode-label {
            width: 80mm !important;
            border: none !important;
            padding: 2.5mm !important;
            page-break-after: always !important;
            break-after: always !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `;
    }
    // Default / A4 grid
    return `
      @media print {
        body * { visibility: hidden !important; }
        .print-only, .print-only * { visibility: visible !important; }
        .print-only {
          position: fixed !important;
          left: 0; top: 0;
          width: 210mm !important;
          padding: 5mm !important;
        }
        @page {
          size: A4 !important;
          margin: 5mm !important;
        }
        .barcode-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 3mm !important;
        }
        .barcode-label {
          border: 0.5pt solid #ccc !important;
          padding: 3.5mm !important;
          text-align: center !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-sizing: border-box !important;
        }
      }
    `;
  };

  const getPreviewDimensions = () => {
    const layout = selectedPrinter?.layout || '50x30';
    if (layout === '50x30') return { width: '180px', minHeight: '110px' };
    if (layout === '38x25') return { width: '160px', minHeight: '95px' };
    if (layout === '80mm') return { width: '220px', minHeight: '130px' };
    return { width: '200px', minHeight: '130px' };
  };

  const getNavItems = () => {
    if (user?.role === 'admin') return adminNavGroups;
    if (user?.role === 'manager') return managerNavGroups || [];
    return getEmployeeNavGroups(user?.role);
  };

  const dashTitle = user?.role === 'admin' ? 'Mobile Hub Admin Panel' :
    user?.role === 'manager' ? 'Store Dashboard' : 'Employee Portal';

  return (
    <DashboardLayout navItems={getNavItems()} title={dashTitle}>
      <div className="no-print">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
            <Barcode size={24} /> Barcode Generator
          </h1>
          <p className="text-muted-text text-sm mt-1">Generate print-ready barcode labels for products</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — Product Selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-3 flex items-center gap-2">
                <Package size={18} /> Select Product
              </h2>
              <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or barcode..."
                  className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-6 text-muted-text text-sm">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-6 text-muted-text text-sm">No products found</div>
                ) : (
                  filteredProducts.slice(0, 30).map(product => (
                    <div
                      key={product._id}
                      onClick={() => { setSelectedProduct(product); setGenerated(false); }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedProduct?._id === product._id
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-navy truncate">{product.name}</p>
                        <p className="text-xs text-muted-text">
                          SKU: {product.sku || 'N/A'} • Rs. {product.price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right — Settings & Preview */}
          <div className="space-y-4">
            {/* Label Settings */}
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-3 flex items-center gap-2">
                <Store size={18} /> Label Settings
              </h2>

              {selectedProduct ? (
                <div className="space-y-4">
                  {/* Product Info */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="font-semibold text-dark-navy">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-text mt-1">
                      SKU: {selectedProduct.sku || 'N/A'} • Price: Rs. {selectedProduct.price?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-text mt-1">
                      Barcode: {getBarcodeValue(selectedProduct)}
                    </p>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="text-xs font-medium text-muted-text block mb-1">Shop Name on Label</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={e => setShopName(e.target.value)}
                      className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* Printer Select Dropdown */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-muted-text block">Link Label Printer</label>
                      <button
                        type="button"
                        onClick={() => setShowPrinterModal(true)}
                        className="text-xs font-bold text-blue-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                      >
                        ⚙️ Link Printer
                      </button>
                    </div>
                    <select
                      value={selectedPrinter?._id || ''}
                      onChange={e => {
                        const prt = printers.find(p => p._id === e.target.value);
                        setSelectedPrinter(prt);
                      }}
                      className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-dark-navy"
                    >
                      {printers.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.layout === '50x30' ? '50x30mm' : p.layout === '38x25' ? '38x25mm' : p.layout === '80mm' ? '80mm Continuous' : 'A4 Grid'} - {p.connection}) {p.isDefault ? '· [Default]' : ''}
                        </option>
                      ))}
                    </select>
                    {selectedPrinter && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Linked to Printer: {selectedPrinter.name}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-xs font-medium text-muted-text block mb-1">Number of Labels</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-9 h-9 rounded-lg border border-card-border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center border border-card-border rounded-xl py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(500, quantity + 1))}
                        className="w-9 h-9 rounded-lg border border-card-border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Plus size={16} />
                      </button>
                      {/* Quick presets */}
                      {[12, 24, 48].map(n => (
                        <button
                          key={n}
                          onClick={() => setQuantity(n)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            quantity === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50"
                  >
                    <Barcode size={18} />
                    {generating ? 'Generating...' : `Generate ${quantity} Labels`}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-text">
                  <Package size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a product from the left to get started</p>
                </div>
              )}
            </div>

            {/* Single Label Preview & Assignments */}
            {selectedProduct && generated && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                  <h2 className="font-semibold text-dark-navy mb-3">Label Preview ({selectedPrinter?.name})</h2>
                  <div 
                    className="border border-gray-200 rounded-xl p-4 text-center bg-slate-50 transition-all flex flex-col justify-between items-center" 
                    style={{ ...getPreviewDimensions(), margin: '0 auto' }}
                  >
                    <p className="text-[9px] font-bold text-gray-700 mb-0.5">{shopName}</p>
                    <p className="text-xs font-semibold text-dark-navy truncate w-full">{selectedProduct.name}</p>
                    <p className="text-sm font-bold text-blue-600 my-0.5">Rs. {selectedProduct.price?.toFixed(2)}</p>
                    <svg className="barcode-svg mx-auto" style={{ maxWidth: '100%', height: '40px' }}></svg>
                    <p className="text-[8px] text-gray-500 mt-0.5">SKU: {selectedProduct.sku || 'N/A'}</p>
                  </div>

                  <button
                    onClick={handlePrint}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-dark-navy hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Printer size={16} /> Print Active Layout ({quantity} Labels)
                  </button>
                </div>

                {/* Printer Assignments & Routing */}
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-dark-navy text-sm flex items-center gap-2">
                      <Printer size={18} className="text-blue-600" /> Printer Assignment & Routing
                    </h3>
                    <p className="text-xs text-muted-text mt-1">
                      Distribute and print the generated labels across your connected/linked printers:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {printers.map(p => {
                      const assignedQty = printerAssignments[p._id] || 0;
                      return (
                        <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-card-border bg-slate-50 gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-dark-navy truncate">{p.name}</span>
                              {p.isDefault && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded uppercase">Default</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-text mt-0.5">
                              Connection: {p.connection} • Layout: {
                                p.layout === '50x30' ? '50x30mm' :
                                p.layout === '38x25' ? '38x25mm' :
                                p.layout === '80mm' ? '80mm Continuous' : 'A4 Label Grid'
                              }
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateAssignment(p._id, assignedQty - 1)}
                                className="w-7 h-7 rounded bg-white border border-card-border flex items-center justify-center hover:bg-gray-100"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                value={assignedQty}
                                onChange={e => handleUpdateAssignment(p._id, e.target.value)}
                                className="w-12 text-center border border-card-border rounded py-0.5 text-xs font-semibold bg-white"
                              />
                              <button
                                onClick={() => handleUpdateAssignment(p._id, assignedQty + 1)}
                                className="w-7 h-7 rounded bg-white border border-card-border flex items-center justify-center hover:bg-gray-100"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            
                            <button
                              onClick={() => handlePrintForPrinter(p, assignedQty)}
                              disabled={assignedQty <= 0}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                            >
                              <Printer size={12} /> Print ({assignedQty})
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Status */}
                  {(() => {
                    const totalAssigned = Object.values(printerAssignments).reduce((a, b) => a + b, 0);
                    const diff = totalAssigned - quantity;
                    return (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-card-border">
                        <span className="font-medium text-muted-text">
                          Total Assigned: <strong className={diff === 0 ? "text-emerald-600" : "text-amber-600"}>{totalAssigned}</strong> / {quantity} labels
                        </span>
                        {diff === 0 ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            ✓ All labels routed
                          </span>
                        ) : diff > 0 ? (
                          <span className="text-amber-600 font-semibold">
                            ⚠️ Over-assigned (+{diff})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold">
                            ⚠️ Under-assigned ({Math.abs(diff)} left)
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ PRINT AREA — only visible when printing ═══════ */}
      {generated && selectedProduct && (
        <div className="print-only" ref={printRef}>
          <style>{getLayoutStyles()}</style>
          <div className="barcode-grid">
            {Array.from({ length: quantity }).map((_, i) => (
              <div key={i} className="barcode-label">
                <p className="shop-name-label" style={{ fontSize: '8px', fontWeight: 700, margin: '0 0 1px', color: '#333' }}>{shopName}</p>
                <p className="product-name-label" style={{ fontSize: '10px', fontWeight: 600, margin: '0 0 2px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProduct.name}
                </p>
                <p className="price-label" style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0', color: '#c026d3' }}>
                  Rs. {selectedProduct.price?.toFixed(2)}
                </p>
                <svg className="barcode-svg" style={{ maxWidth: '160px', display: 'block', margin: '0 auto' }}></svg>
                <p className="sku-label" style={{ fontSize: '7px', color: '#888', margin: '1px 0 0' }}>SKU: {selectedProduct.sku || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printer Manager Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-card-border bg-slate-50">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                ⚙️ Link & Manage Label Printers
              </h2>
              <button onClick={() => setShowPrinterModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Existing Printers List */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-dark-navy block">Linked Printers</label>
                {printers.length === 0 ? (
                  <p className="text-sm text-muted-text py-2">No printers configured yet.</p>
                ) : (
                  printers.map(p => (
                    <div key={p._id} className="flex items-center justify-between p-3 rounded-xl border border-card-border bg-slate-50 text-sm">
                      <div>
                        <p className="font-bold text-dark-navy">{p.name}</p>
                        <p className="text-xs text-muted-text">
                          Connection: {p.connection} · Layout: {
                            p.layout === '50x30' ? '50mm x 30mm (Single)' :
                            p.layout === '38x25' ? '38mm x 25mm (Double)' :
                            p.layout === '80mm' ? '80mm Continuous' : 'A4 Label Grid'
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.isDefault ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md uppercase">Default</span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultPrinter(p._id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Set Default
                          </button>
                        )}
                        <button
<<<<<<< HEAD
                          onClick={() => handleDeleteClick(p)}
=======
                          onClick={() => handleDeletePrinter(p._id)}
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Printer Form */}
              <form onSubmit={handleAddPrinter} className="border-t border-card-border pt-4 space-y-3">
                <label className="text-xs font-bold text-dark-navy block">Link New Label Printer</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Printer Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TSC TTP-244 Pro"
                      value={newPrinter.name}
                      onChange={e => setNewPrinter({ ...newPrinter, name: e.target.value })}
                      className="w-full border border-card-border rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Connection Port/Type</label>
                    <input
                      type="text"
                      placeholder="e.g. USB001 or 192.168.1.150"
                      value={newPrinter.connection}
                      onChange={e => setNewPrinter({ ...newPrinter, connection: e.target.value })}
                      className="w-full border border-card-border rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Label layout / Roll Size</label>
                  <select
                    value={newPrinter.layout}
                    onChange={e => setNewPrinter({ ...newPrinter, layout: e.target.value })}
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="50x30">50mm x 30mm (Single Column)</option>
                    <option value="38x25">38mm x 25mm (Double Column)</option>
                    <option value="80mm">80mm Roll (Thermal Monospace)</option>
                    <option value="a4_3col">Standard A4 Sheet (3-Column Grid)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus size={14} /> Add & Link Printer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
<<<<<<< HEAD

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name || 'this printer'}
      />
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
    </DashboardLayout>
  );
};

export default BarcodeGenerator;
