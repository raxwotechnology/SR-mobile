import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Upload, Globe, Phone, Mail, MapPin, Palette, DollarSign, Gift, Shield, Store, UserCog, FileText, ClipboardCheck, MessageSquare } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getSettings, updateSettings, uploadLogo, uploadImage } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useSettingsStore from '../../store/settingsStore';
import { getImageUrl } from '../../utils/imageHelper';

const SettingsInputField = ({ label, value, onChange, type = 'text', placeholder = '', suffix = '' }) => (
  <div>
    <label className="text-xs font-medium text-muted-text block mb-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
        placeholder={placeholder}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-text">{suffix}</span>}
    </div>
  </div>
);

const SettingsTextArea = ({ label, value, onChange, placeholder = '', rows = 3 }) => (
  <div>
    <label className="text-xs font-medium text-muted-text block mb-1">{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
      placeholder={placeholder}
    />
  </div>
);

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const fileRef = useRef(null);
  const sealFileRef = useRef(null);
  const setSettingsLocal = useSettingsStore((s) => s.setSettingsLocal);

  const [defaultPrinter, setDefaultPrinter] = useState(() => localStorage.getItem('default_printer') || '');

  const handlePrinterChange = (val) => {
    setDefaultPrinter(val);
    localStorage.setItem('default_printer', val);
  };

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await getSettings();
      setSettings(data);
      setSettingsLocal(data);
    } catch (err) { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (field, value) => {
    setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }));
  };

  const handleTemplateChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      documentTemplates: {
        ...prev.documentTemplates,
        [section]: {
          ...(prev.documentTemplates?.[section] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleTemplateFieldToggle = (section, field) => {
    setSettings(prev => {
      const current = prev.documentTemplates?.[section]?.fields?.[field] !== false;
      return {
        ...prev,
        documentTemplates: {
          ...prev.documentTemplates,
          [section]: {
            ...(prev.documentTemplates?.[section] || {}),
            fields: {
              ...(prev.documentTemplates?.[section]?.fields || {}),
              [field]: !current,
            },
          },
        },
      };
    });
  };

  const handleSmsTemplateChange = (field, value) => {
    setSettings(prev => ({ ...prev, smsTemplates: { ...prev.smsTemplates, [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateSettings(settings);
      setSettings(data);
      setSettingsLocal(data);
      toast.success('Settings saved successfully!');
    } catch (err) { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset file input so same file can be re-uploaded
    e.target.value = '';
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const { data } = await uploadLogo(formData);
      // Backend returns relative path like /uploads/logo-xxx.png
      const logoPath = data.logoUrl || data.logo;
      const merged = { ...settings, logoUrl: logoPath, logo: logoPath };
      setSettings(merged);
      // Force-update the global store so DashboardLayout & Navbar reflect instantly
      setSettingsLocal(merged);
      toast.success('Logo uploaded successfully! ✅');
    } catch (err) {
      toast.error('Failed to upload logo: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSealUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await uploadImage(formData);
      const sealPath = data.url;
      const merged = { ...settings, sealUrl: sealPath, seal: sealPath };
      setSettings(merged);
      setSettingsLocal(merged);
      toast.success('Seal uploaded successfully! ✅');
    } catch (err) {
      toast.error('Failed to upload seal: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Mobile Hub Admin Panel"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const tabs = [
    { key: 'general', label: 'General', icon: Globe },
    { key: 'contact', label: 'Contact', icon: Phone },
    { key: 'commerce', label: 'Commerce', icon: DollarSign },
    { key: 'loyalty', label: 'Loyalty', icon: Gift },
    { key: 'receipt', label: 'Receipt/A4 Designer', icon: FileText },
    { key: 'templates', label: 'Templates', icon: ClipboardCheck },
    { key: 'permissions', label: 'Permissions', icon: UserCog },
    { key: 'social', label: 'Social', icon: Palette },
    { key: 'advanced', label: 'Advanced', icon: Shield },
  ];

  return (
    <DashboardLayout navItems={navItems} title="Mobile Hub Admin Panel">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">⚙️ Brand Settings</h1>
            <p className="text-muted-text text-sm mt-1">Manage your tech and smart devices storefront configuration</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-primary-blue hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors shadow-md disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? 'bg-primary-blue text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* General */}
        {tab === 'general' && (
          <div className="space-y-6">
            {/* Logo */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Shop Branding</h2>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-card-border flex items-center justify-center overflow-hidden bg-gray-50">
                  {(settings.logoUrl || settings.logo) ? (
                    <img src={getImageUrl(settings.logoUrl || settings.logo)} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store size={32} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                    <Upload size={14} /> Upload Logo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <p className="text-xs text-muted-text mt-2">PNG, JPG, or SVG. Max 2MB.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <SettingsInputField label="Shop Name" value={settings.shopName} onChange={(v) => handleChange('shopName', v)} placeholder="Mobile Hub" />
                <SettingsInputField label="Tagline" value={settings.tagline} onChange={(v) => handleChange('tagline', v)} placeholder="Where style meets accessories" />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Footer</h2>
              <SettingsInputField label="Footer Text" value={settings.footerText} onChange={(v) => handleChange('footerText', v)} placeholder="© 2026 Mobile Hub. All rights reserved." />
            </div>

            {/* Hero Products */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-2">🏠 Landing Page Hero Products</h2>
              <p className="text-xs text-muted-text mb-4">These appear as floating badges on the homepage hero section.</p>
              {[0, 1].map((idx) => {
                const products = settings.heroProducts || [];
                const prod = products[idx] || { name: '', price: '', emoji: '' };
                const updateHeroProduct = (field, value) => {
                  const updated = [...(settings.heroProducts || [{ name: '', price: '', emoji: '' }, { name: '', price: '', emoji: '' }])];
                  if (!updated[idx]) updated[idx] = { name: '', price: '', emoji: '' };
                  updated[idx] = { ...updated[idx], [field]: value };
                  handleChange('heroProducts', updated);
                };
                return (
                  <div key={idx} className="mb-4 p-4 rounded-xl border border-card-border bg-gray-50">
                    <p className="text-xs font-bold text-muted-text mb-3 uppercase">Product Badge {idx + 1}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <SettingsInputField label="Name" value={prod.name} onChange={(v) => updateHeroProduct('name', v)} placeholder={idx === 0 ? 'Luxe Tote Bag' : 'Radiance Serum'} />
                      <SettingsInputField label="Price (LKR)" value={prod.price} onChange={(v) => updateHeroProduct('price', v)} type="number" placeholder="9500" />
                      <SettingsInputField label="Emoji" value={prod.emoji} onChange={(v) => updateHeroProduct('emoji', v)} placeholder={idx === 0 ? '👜' : '✨'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact */}
        {tab === 'contact' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Phone size={18} /> Contact Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <SettingsInputField label="Email" value={settings.email} onChange={(v) => handleChange('email', v)} placeholder="hello@mobilehub.com" />
              <SettingsInputField label="Primary Phone" value={settings.phone} onChange={(v) => handleChange('phone', v)} placeholder="+94 11 255 5000" />
              <SettingsInputField label="Secondary Phone" value={settings.phone2} onChange={(v) => handleChange('phone2', v)} placeholder="Optional" />
              <SettingsInputField label="Country" value={settings.country} onChange={(v) => handleChange('country', v)} placeholder="Sri Lanka" />
              <SettingsInputField label="City" value={settings.city} onChange={(v) => handleChange('city', v)} placeholder="Colombo" />
              <div className="sm:col-span-2">
                <SettingsInputField label="Full Address" value={settings.address} onChange={(v) => handleChange('address', v)} placeholder="88 Tech Avenue, Colombo 03" />
              </div>
            </div>
          </div>
        )}

        {/* Commerce */}
        {tab === 'commerce' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><DollarSign size={18} /> Currency & Pricing</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <SettingsInputField label="Default Currency" value={settings.currency} onChange={(v) => handleChange('currency', v)} />
                <SettingsInputField label="USD → LKR Rate" value={settings.exchangeRate} onChange={(v) => handleChange('exchangeRate', v)} type="number" suffix="LKR per USD" />
                <SettingsInputField label="Tax Rate" value={settings.taxRate} onChange={(v) => handleChange('taxRate', v)} type="number" suffix="e.g. 0.08 = 8%" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2">🚚 Delivery</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <SettingsInputField label="Free Delivery Threshold" value={settings.deliveryFeeThreshold} onChange={(v) => handleChange('deliveryFeeThreshold', v)} type="number" suffix="Rs." />
                <SettingsInputField label="Delivery Fee" value={settings.deliveryFee} onChange={(v) => handleChange('deliveryFee', v)} type="number" suffix="Rs." />
              </div>
              <p className="text-xs text-muted-text mt-3">Orders above the threshold get free delivery. Otherwise delivery fee is charged.</p>
            </div>
          </div>
        )}

        {/* Loyalty */}
        {tab === 'loyalty' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Gift size={18} /> Loyalty Points Configuration</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <SettingsInputField label="Points Per Unit Spent" value={settings.loyaltyPointsPerUnit} onChange={(v) => handleChange('loyaltyPointsPerUnit', v)} type="number" suffix="Rs. per 1 point" />
              <SettingsInputField label="Point Redemption Value" value={settings.loyaltyPointValue} onChange={(v) => handleChange('loyaltyPointValue', v)} type="number" suffix="Rs. per point" />
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800">
              <p className="font-medium mb-1">How it works:</p>
              <p className="text-xs">Customer earns 1 point for every Rs. {settings.loyaltyPointsPerUnit} spent.</p>
              <p className="text-xs">Each point is worth Rs. {settings.loyaltyPointValue} when redeemed.</p>
            </div>
          </div>
        )}

        {/* Receipt Settings */}
        {tab === 'receipt' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column: Settings Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-2 flex items-center gap-2"><FileText size={18} /> Receipt / Invoice Designer</h2>
                <p className="text-xs text-muted-text mb-6">Customize design templates, fonts, branding details, and legal text.</p>

                <div className="space-y-4">
                  {/* Template Style */}
                  <div>
                    <label className="text-xs font-semibold text-muted-text block mb-1">Layout Style Template</label>
                    <select
                      value={settings.receiptSettings?.layoutStyle || 'receipt'}
                      onChange={(e) => handleChange('receiptSettings', { ...settings.receiptSettings, layoutStyle: e.target.value })}
                      className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white"
                    >
                      <option value="receipt">80mm Thermal Receipt (POS)</option>
                      <option value="a4">A4 Professional Invoice (Billing)</option>
                    </select>
                  </div>

                  {/* Theme Color */}
                  <div>
                    <label className="text-xs font-semibold text-muted-text block mb-1">Brand Theme Accent Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={settings.receiptSettings?.themeColor || '#3b82f6'}
                        onChange={(e) => handleChange('receiptSettings', { ...settings.receiptSettings, themeColor: e.target.value })}
                        className="w-10 h-10 border border-card-border rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.receiptSettings?.themeColor || '#3b82f6'}
                        onChange={(e) => handleChange('receiptSettings', { ...settings.receiptSettings, themeColor: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1 border border-card-border rounded-xl py-2 px-3 text-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Header Title */}
                  <SettingsInputField
                    label="Header Logo / Title Text"
                    value={settings.receiptSettings?.headerTitle || settings.shopName}
                    onChange={(v) => handleChange('receiptSettings', { ...settings.receiptSettings, headerTitle: v })}
                    placeholder="e.g. Mobile Hub Corner"
                  />

                  {/* Subtitle / Branch details */}
                  <SettingsInputField
                    label="Header Subtitle / Contact Info"
                    value={settings.receiptSettings?.subtitle || settings.address}
                    onChange={(v) => handleChange('receiptSettings', { ...settings.receiptSettings, subtitle: v })}
                    placeholder="e.g. 88 Tech Avenue, Colombo 03"
                  />

                  {/* Official Store Seal Upload */}
                  <div>
                    <label className="text-xs font-semibold text-muted-text block mb-1">Official Store Seal Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border border-card-border flex items-center justify-center overflow-hidden bg-gray-50">
                        {(settings.sealUrl || settings.seal) ? (
                          <img src={getImageUrl(settings.sealUrl || settings.seal)} alt="Store Seal" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted-text">No Seal</span>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => sealFileRef.current?.click()}
                          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-dark-navy text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-card-border"
                        >
                          <Upload size={12} /> Upload Seal
                        </button>
                        <input
                          ref={sealFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSealUpload}
                          className="hidden"
                        />
                        <p className="text-[10px] text-muted-text mt-1">Rendered on official POS bills.</p>
                      </div>
                    </div>
                  </div>

                  {/* Letterhead Header Textarea */}
                  <SettingsTextArea
                    label="Letterhead Header Text (A4 Invoice)"
                    value={settings.letterheadHeader}
                    onChange={(v) => handleChange('letterheadHeader', v)}
                    placeholder="e.g. SMART MOBILE HUB (PVT) LTD\nNo. 12, Galle Road, Colombo\nReg: PV-12345"
                  />

                  {/* Letterhead Footer Textarea */}
                  <SettingsTextArea
                    label="Letterhead Footer Text (A4 Invoice)"
                    value={settings.letterheadFooter}
                    onChange={(v) => handleChange('letterheadFooter', v)}
                    placeholder="e.g. Thank you for shopping with us!\nContact: info@smartmobile.lk | Web: smartmobile.lk"
                  />

                  {/* Default Printer Selection */}
                  <div>
                    <label className="text-xs font-semibold text-muted-text block mb-1">Default Local Printer Assignment</label>
                    <select
                      value={defaultPrinter}
                      onChange={(e) => handlePrinterChange(e.target.value)}
                      className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white"
                    >
                      <option value="">-- No Default (Prompt System Dialogue) --</option>
                      <option value="Microsoft Print to PDF">Microsoft Print to PDF</option>
                      <option value="XP-80 Thermal Printer">XP-80 Thermal Printer (80mm)</option>
                      <option value="Canon LBP2900">Canon LBP2900 (A4 Laser)</option>
                      <option value="Epson L3110">Epson L3110 Series</option>
                    </select>
                    <p className="text-[10px] text-muted-text mt-1 font-mono">Current assignment saved in LocalStorage.</p>
                  </div>

                  {/* Footer Message */}
                  <SettingsInputField
                    label="Footer Greeting Message"
                    value={settings.receiptSettings?.footerMessage || 'Thank you for your purchase!'}
                    onChange={(v) => handleChange('receiptSettings', { ...settings.receiptSettings, footerMessage: v })}
                    placeholder="e.g. Thank you! Visit us again."
                  />

                  {/* Warranty Terms */}
                  <SettingsTextArea
                    label="Warranty & Serial Disclaimers"
                    value={settings.receiptSettings?.warrantyTerms}
                    onChange={(v) => handleChange('receiptSettings', { ...settings.receiptSettings, warrantyTerms: v })}
                    placeholder="Standard manufacturer warranty applies..."
                  />

                  {/* Terms & Conditions */}
                  <SettingsTextArea
                    label="Return / Exchange Policy Statement"
                    value={settings.receiptSettings?.termsAndConditions}
                    onChange={(v) => handleChange('receiptSettings', { ...settings.receiptSettings, termsAndConditions: v })}
                    placeholder="Goods sold are not returnable..."
                  />

                  {/* Show Warranty Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-dark-navy">Show Warranty Periods</p>
                      <p className="text-xs text-muted-text">Print the warranty details next to each line item</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('receiptSettings', { ...settings.receiptSettings, showWarranty: !settings.receiptSettings?.showWarranty })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.receiptSettings?.showWarranty !== false ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.receiptSettings?.showWarranty !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Live Preview Side Panel */}
            <div className="bg-gray-50 border border-card-border rounded-2xl p-6 flex flex-col justify-start items-center sticky top-6 shadow-inner" style={{ minHeight: '500px' }}>
              <h3 className="font-semibold text-dark-navy mb-1 self-start">📄 Document Live Preview</h3>
              <p className="text-xs text-muted-text mb-4 self-start">Visual representation of the printed template</p>

              {/* Thermal Receipt Preview */}
              {(settings.receiptSettings?.layoutStyle || 'receipt') === 'receipt' ? (
                <div className="w-[300px] bg-white border border-gray-300 shadow-lg p-5 font-mono text-[11px] text-dark-navy relative overflow-hidden" style={{ minHeight: '400px', borderStyle: 'dashed' }}>
                  <div className="text-center mb-4">
                    {(settings.logoUrl || settings.logo) && (
                      <img src={getImageUrl(settings.logoUrl || settings.logo)} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2 opacity-80" />
                    )}
                    <h4 className="font-bold text-sm uppercase">{settings.receiptSettings?.headerTitle || settings.shopName}</h4>
                    <p className="text-[10px] text-muted-text">{settings.receiptSettings?.subtitle || settings.address}</p>
                    <p className="text-[10px] text-muted-text">Tel: {settings.phone}</p>
                  </div>

                  <div className="border-b border-dashed border-gray-400 my-2" />

                  <div className="space-y-1">
                    <p>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    <p>Invoice: #INV-28491029</p>
                    <p>Cashier: {settings.shopName} Staff</p>
                  </div>

                  <div className="border-b border-dashed border-gray-400 my-2" />

                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">
                          <p>iPhone 15 Pro Max (256GB)</p>
                          <p className="text-[9px] text-muted-text">IMEI: 359182930491823</p>
                          {settings.receiptSettings?.showWarranty !== false && (
                            <p className="text-[9px] text-blue-600 font-sans font-semibold">Warranty: 12 Months</p>
                          )}
                        </td>
                        <td className="text-center py-1">1</td>
                        <td className="text-right py-1">Rs. 320,000</td>
                      </tr>
                      <tr>
                        <td className="py-1">
                          <p>Anker Nano USB-C Charger</p>
                          {settings.receiptSettings?.showWarranty !== false && (
                            <p className="text-[9px] text-blue-600 font-sans font-semibold">Warranty: 6 Months</p>
                          )}
                        </td>
                        <td className="text-center py-1">1</td>
                        <td className="text-right py-1">Rs. 8,500</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border-b border-dashed border-gray-400 my-2" />

                  <div className="space-y-1 text-right">
                    <p>Subtotal: Rs. 328,500</p>
                    <p>VAT (8%): Rs. 26,280</p>
                    <p className="font-bold text-xs">Grand Total: Rs. 354,780</p>
                  </div>

                  <div className="border-b border-dashed border-gray-400 my-2" />

                  <div className="text-center space-y-2 text-[10px] mt-4 font-sans text-muted-text">
                    <p className="font-bold">{settings.receiptSettings?.footerMessage || 'Thank you for your purchase!'}</p>
                    <p className="italic text-[9px]">{settings.receiptSettings?.termsAndConditions}</p>
                    <p className="italic text-[9px]">{settings.receiptSettings?.warrantyTerms}</p>
                    {(settings.sealUrl || settings.seal) && (
                      <div className="flex justify-center mt-2">
                        <img src={getImageUrl(settings.sealUrl || settings.seal)} alt="Store Seal" className="w-12 h-12 object-contain opacity-70" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* A4 Invoice Preview */
                <div className="w-[380px] bg-white border border-gray-200 shadow-lg p-6 font-sans text-[10px] text-dark-navy relative overflow-hidden" style={{ minHeight: '480px' }}>
                  {/* Top Color Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: settings.receiptSettings?.themeColor || '#3b82f6' }} />

                  <div className="flex justify-between items-start mb-6 mt-2">
                    <div>
                      {(settings.logoUrl || settings.logo) && (
                        <img src={getImageUrl(settings.logoUrl || settings.logo)} alt="Logo" className="w-14 h-14 object-contain mb-2 opacity-95" />
                      )}
                      {settings.letterheadHeader ? (
                        <pre className="font-sans text-[10px] leading-relaxed text-dark-navy whitespace-pre-line">
                          {settings.letterheadHeader}
                        </pre>
                      ) : (
                        <>
                          <h4 className="font-bold text-sm uppercase text-dark-navy" style={{ color: settings.receiptSettings?.themeColor || '#1e3a8a' }}>
                            {settings.receiptSettings?.headerTitle || settings.shopName}
                          </h4>
                          <p className="text-muted-text">{settings.receiptSettings?.subtitle || settings.address}</p>
                          <p className="text-muted-text">Email: {settings.email} | Tel: {settings.phone}</p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-text">Invoice</h3>
                      <p className="font-bold mt-1">#INV-28491029</p>
                      <p className="text-muted-text">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="border-b border-gray-200 my-4" />

                  {/* Customer / Billed To Section */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-bold text-muted-text uppercase text-[8px] tracking-wider">Billed To:</p>
                      <p className="font-bold text-dark-navy">John Doe</p>
                      <p className="text-muted-text">+94 77 123 4567</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-muted-text uppercase text-[8px] tracking-wider">Payment Details:</p>
                      <p className="font-bold text-dark-navy">Split Payment Method</p>
                      <p className="text-muted-text">Cash / Card</p>
                    </div>
                  </div>

                  {/* Products Table */}
                  <table className="w-full text-left text-[9px] mb-6 border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-muted-text uppercase font-bold text-[8px]">
                        <th className="py-2">Item Description</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2">
                          <p className="font-semibold text-dark-navy">iPhone 15 Pro Max (256GB)</p>
                          <p className="text-[8px] text-muted-text font-mono">IMEI: 359182930491823</p>
                          {settings.receiptSettings?.showWarranty !== false && (
                            <p className="text-[8px] text-blue-600 font-semibold">Warranty: 12 Months</p>
                          )}
                        </td>
                        <td className="text-center py-2">1</td>
                        <td className="text-right py-2">Rs. 320,000</td>
                        <td className="text-right py-2 font-semibold">Rs. 320,000</td>
                      </tr>
                      <tr>
                        <td className="py-2">
                          <p className="font-semibold text-dark-navy">Anker Nano USB-C Charger</p>
                          {settings.receiptSettings?.showWarranty !== false && (
                            <p className="text-[8px] text-blue-600 font-semibold">Warranty: 6 Months</p>
                          )}
                        </td>
                        <td className="text-center py-2">1</td>
                        <td className="text-right py-2">Rs. 8,500</td>
                        <td className="text-right py-2 font-semibold">Rs. 8,500</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-1/2 text-[8px] text-muted-text space-y-1">
                      <p className="font-bold uppercase tracking-wider text-dark-navy">Taxes & Disclaimers</p>
                      <p className="italic">{settings.receiptSettings?.warrantyTerms}</p>
                      <p className="italic">{settings.receiptSettings?.termsAndConditions}</p>
                    </div>
                    <div className="w-1/2 text-right space-y-1.5 text-[9px]">
                      <div className="flex justify-between">
                        <span className="text-muted-text">Subtotal:</span>
                        <span className="font-semibold">Rs. 328,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-text">Taxes (8%):</span>
                        <span className="font-semibold">Rs. 26,280</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-bold" style={{ color: settings.receiptSettings?.themeColor || '#3b82f6' }}>
                        <span>Total:</span>
                        <span>Rs. 354,780</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-6 pt-3 border-t border-gray-100">
                    <div className="w-2/3 text-[9px] text-muted-text">
                      {settings.letterheadFooter ? (
                        <pre className="font-sans text-[9px] leading-relaxed whitespace-pre-line text-left">
                          {settings.letterheadFooter}
                        </pre>
                      ) : (
                        <p>{settings.receiptSettings?.footerMessage || 'Thank you for your purchase!'}</p>
                      )}
                    </div>
                    <div className="w-1/3 flex justify-end">
                      {(settings.sealUrl || settings.seal) && (
                        <div className="relative">
                          <img src={getImageUrl(settings.sealUrl || settings.seal)} alt="Store Seal" className="w-14 h-14 object-contain opacity-75" />
                          <span className="absolute bottom-0 right-0 text-[8px] text-gray-400 font-sans">Official Seal</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Templates */}
        {tab === 'templates' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-4">
              {[
                { key: 'paysheet', label: 'Paysheets', layouts: ['standard', 'compact'] },
                { key: 'invoice', label: 'Invoices / Bills', layouts: ['a4', 'compact'] },
                { key: 'posReceipt', label: 'POS Receipts', layouts: ['thermal', 'compact'] },
              ].map((tpl) => {
                const data = settings.documentTemplates?.[tpl.key] || {};
                return (
                  <div key={tpl.key} className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                    <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><FileText size={17} /> {tpl.label}</h2>
                    <div className="space-y-3">
                      <SettingsInputField label="Document Title" value={data.title} onChange={(v) => handleTemplateChange(tpl.key, 'title', v)} />
                      <div>
                        <label className="text-xs font-medium text-muted-text block mb-1">Layout</label>
                        <select value={data.layout || tpl.layouts[0]} onChange={(e) => handleTemplateChange(tpl.key, 'layout', e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white">
                          {tpl.layouts.map((layout) => <option key={layout} value={layout}>{layout}</option>)}
                        </select>
                      </div>
                      <SettingsInputField label="Accent Color" value={data.accentColor} onChange={(v) => handleTemplateChange(tpl.key, 'accentColor', v)} placeholder="#2563eb" />
                      <SettingsTextArea label="Footer Text" value={data.footerText} onChange={(v) => handleTemplateChange(tpl.key, 'footerText', v)} rows={2} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><ClipboardCheck size={18} /> Paysheet Content Options</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['showEmployeeRole', 'Employee Role'],
                  ['showStore', 'Store'],
                  ['showProcessedBy', 'Processed By'],
                  ['showEmployerContributions', 'Employer EPF/ETF'],
                ].map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleTemplateFieldToggle('paysheet', field)}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold text-left ${settings.documentTemplates?.paysheet?.fields?.[field] !== false ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-muted-text'}`}
                  >
                    {settings.documentTemplates?.paysheet?.fields?.[field] !== false ? 'Show' : 'Hide'} {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-2 flex items-center gap-2"><MessageSquare size={18} /> SMS Templates</h2>
              <p className="text-xs text-muted-text mb-4">Use placeholders like {'{shopName}'}, {'{code}'}, {'{invoiceNo}'}, {'{total}'}, {'{orderNo}'}, and {'{status}'}.</p>
              <div className="grid lg:grid-cols-2 gap-4">
                <SettingsTextArea label="OTP Message" value={settings.smsTemplates?.otp} onChange={(v) => handleSmsTemplateChange('otp', v)} rows={2} />
                <SettingsTextArea label="Payment Message" value={settings.smsTemplates?.payment} onChange={(v) => handleSmsTemplateChange('payment', v)} rows={2} />
                <SettingsTextArea label="POS Receipt Message" value={settings.smsTemplates?.posReceipt} onChange={(v) => handleSmsTemplateChange('posReceipt', v)} rows={2} />
                <SettingsTextArea label="Order Status Message" value={settings.smsTemplates?.orderStatus} onChange={(v) => handleSmsTemplateChange('orderStatus', v)} rows={2} />
              </div>
            </div>
          </div>
        )}
        {/* Permissions */}
        {tab === 'permissions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><UserCog size={18} /> Role Permissions</h2>
              <p className="text-xs text-muted-text mb-6">Control feature access for each role. Changes take effect immediately after saving.</p>

              {/* Cashier Permissions */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-dark-navy mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-xs font-bold">C</span>
                  Cashier Permissions
                </h3>
                <div className="space-y-3 pl-9">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Barcode Generation</p>
                      <p className="text-xs text-muted-text">Allow cashiers to generate and print barcodes</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canGenerateBarcodes: !settings.rolePermissions?.cashier?.canGenerateBarcodes }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canGenerateBarcodes !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canGenerateBarcodes !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Return Access</p>
                      <p className="text-xs text-muted-text">Allow cashiers to process customer returns</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canAccessReturns: !settings.rolePermissions?.cashier?.canAccessReturns }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canAccessReturns ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canAccessReturns ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">View Inventory</p>
                      <p className="text-xs text-muted-text">Allow cashiers to view stock levels</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canViewInventory: !settings.rolePermissions?.cashier?.canViewInventory }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canViewInventory ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canViewInventory ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Apply Discounts</p>
                      <p className="text-xs text-muted-text">Allow cashiers to apply manual discounts at POS</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canApplyDiscounts: !(settings.rolePermissions?.cashier?.canApplyDiscounts !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canApplyDiscounts !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canApplyDiscounts !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Sales Reports</p>
                      <p className="text-xs text-muted-text">Allow cashiers to view sales reports</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canViewSalesReports: !settings.rolePermissions?.cashier?.canViewSalesReports }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canViewSalesReports ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canViewSalesReports ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Manager Permissions */}
              <div>
                <h3 className="text-sm font-bold text-dark-navy mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">M</span>
                  Manager Permissions
                </h3>
                <div className="space-y-3 pl-9">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Barcode Generation</p>
                      <p className="text-xs text-muted-text">Allow managers to generate and print barcodes</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canGenerateBarcodes: !settings.rolePermissions?.manager?.canGenerateBarcodes }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canGenerateBarcodes !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canGenerateBarcodes !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Return Access</p>
                      <p className="text-xs text-muted-text">Allow managers to process customer returns</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canAccessReturns: !settings.rolePermissions?.manager?.canAccessReturns }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canAccessReturns !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canAccessReturns !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Payroll Management</p>
                      <p className="text-xs text-muted-text">Allow managers to process salary payments</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManagePayroll: !(settings.rolePermissions?.manager?.canManagePayroll !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManagePayroll !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManagePayroll !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Supplier Payments</p>
                      <p className="text-xs text-muted-text">Allow managers to manage supplier payment ledger</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManageSupplierPayments: !(settings.rolePermissions?.manager?.canManageSupplierPayments !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManageSupplierPayments !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManageSupplierPayments !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">AI Predictions</p>
                      <p className="text-xs text-muted-text">Allow managers to view AI sales forecasts</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canViewPredictions: !settings.rolePermissions?.manager?.canViewPredictions }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canViewPredictions ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canViewPredictions ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Promotions</p>
                      <p className="text-xs text-muted-text">Allow managers to create and manage promotions</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManagePromotions: !(settings.rolePermissions?.manager?.canManagePromotions !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManagePromotions !== false ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManagePromotions !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">⚠️ Note:</p>
              <p className="text-xs">Admin always has full access to all features. Permission changes apply to Cashier and Manager roles only.</p>
              <p className="text-xs mt-1">Remember to click <strong>Save Changes</strong> after modifying permissions.</p>
            </div>
          </div>
        )}

        {/* Social */}
        {tab === 'social' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Palette size={18} /> Social Media Links</h2>
            <div className="space-y-4">
              <SettingsInputField label="Facebook URL" value={settings.socialLinks?.facebook} onChange={(v) => handleSocialChange('facebook', v)} placeholder="https://facebook.com/mobilehubcorner" />
              <SettingsInputField label="Instagram URL" value={settings.socialLinks?.instagram} onChange={(v) => handleSocialChange('instagram', v)} placeholder="https://instagram.com/mobilehubcorner" />
              <SettingsInputField label="Twitter URL" value={settings.socialLinks?.twitter} onChange={(v) => handleSocialChange('twitter', v)} placeholder="https://x.com/mobilehub" />
            </div>
          </div>
        )}

        {/* Advanced */}
        {tab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Shield size={18} /> Maintenance Mode</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-navy">Enable Maintenance Mode</p>
                  <p className="text-xs text-muted-text">When enabled, customers will see a maintenance page</p>
                </div>
                <button onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                  className={`w-14 h-7 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              {settings.maintenanceMode && (
                <div className="mt-3 bg-red-50 rounded-xl p-3 text-xs text-red-600 font-medium">⚠️ Maintenance mode is ON. Customers cannot access the site.</div>
              )}
            </div>

            {/* Config Summary */}
            <div className="bg-gray-50 rounded-2xl border border-card-border p-6">
              <h2 className="font-semibold text-dark-navy mb-3">Current Configuration</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { l: 'Currency', v: settings.currency },
                  { l: 'Exchange Rate', v: `1 USD = ${settings.exchangeRate} LKR` },
                  { l: 'Tax Rate', v: `${(settings.taxRate * 100).toFixed(0)}%` },
                  { l: 'Delivery Fee', v: `Rs. ${settings.deliveryFee}` },
                  { l: 'Free Delivery Above', v: `Rs. ${settings.deliveryFeeThreshold}` },
                  { l: 'Points per Rs.', v: `${settings.loyaltyPointsPerUnit}` },
                  { l: 'Point Value', v: `Rs. ${settings.loyaltyPointValue}` },
                  { l: 'Maintenance', v: settings.maintenanceMode ? '🔴 ON' : '🟢 OFF' },
                ].map(c => (
                  <div key={c.l} className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-muted-text">{c.l}</p>
                    <p className="font-semibold text-dark-navy mt-1">{c.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
