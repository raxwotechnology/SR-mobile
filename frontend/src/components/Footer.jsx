import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, MessageCircle, Camera, Play } from 'lucide-react';
import useSettingsStore from '../store/settingsStore';
import useAuthStore from '../store/authStore';
import { getImageUrl } from '../utils/imageHelper';

const Footer = () => {
  const user = useAuthStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Mobile Hub';
  const footerText = (settings?.footerText && !settings.footerText.includes('Mobile Hub. All rights reserved.'))
    ? settings.footerText
    : `© ${new Date().getFullYear()} Raxwo (Pvt) LTD. All rights reserved.`;
  const brandEmail = settings?.email || 'support@mobilehub.com';
  const brandPhone = settings?.phone || '+94 11 255 5000';
  const brandAddress = settings?.address || '88 Tech Avenue, Colombo 03';
  const brandLogoUrl = getImageUrl(settings?.logoUrl) || '/logo.png';

  const roleFooterLinks = {
    admin: [
      { to: '/admin', label: 'Overview' },
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/returns', label: 'Returns' },
      { to: '/admin/financials', label: 'Financials' },
    ],
    manager: [
      { to: '/manager', label: 'Overview' },
      { to: '/manager/orders', label: 'Orders' },
      { to: '/manager/returns', label: 'Returns' },
      { to: '/manager/employees', label: 'Employees' },
    ],
    cashier: [
      { to: '/employee', label: 'Dashboard' },
      { to: '/pos', label: 'POS' },
      { to: '/employee/returns', label: 'Returns' },
      { to: '/employee/stock', label: 'Stock' },
    ],
    deliveryGuy: [
      { to: '/delivery', label: 'Deliveries' },
      { to: '/employee/attendance', label: 'Attendance' },
      { to: '/employee/leaves', label: 'Leaves' },
      { to: '/employee/profile', label: 'Profile' },
    ],
    stockEmployee: [
      { to: '/employee', label: 'Dashboard' },
      { to: '/employee/stock', label: 'Stock' },
      { to: '/employee/attendance', label: 'Attendance' },
      { to: '/employee/profile', label: 'Profile' },
    ],
  };
  const staffRole = user?.role && roleFooterLinks[user.role] ? user.role : null;

  return (
    <footer className="bg-slate-950 text-white relative overflow-hidden mt-auto border-t border-slate-800/80">
      {/* Staff Quick Bar if logged in as staff */}
      {staffRole && (
        <div className="bg-zinc-900 border-b border-white/10 py-2.5">
          <div className="base-container flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-blue-400 font-semibold m-0 flex items-center gap-1.5">
              <span>🛡️</span> {brandName} • <span className="capitalize">{staffRole} Portal</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {roleFooterLinks[staffRole].map((l) => (
                <Link key={l.to} to={l.to} className="text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {/* Main Footer */}
      <div className="base-container py-12 md:py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="text-2xl font-bold text-primary-blue mb-4 inline-flex items-center gap-2">
              <img src={brandLogoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
              <span>{brandName}</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Elevate your tech lifestyle with curated smartphones, laptops, and premium accessories in one destination.
            </p>
            <div className="flex gap-3">
              {[Globe, MessageCircle, Camera, Play].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary-blue transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 mt-0">Quick Links</h4>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {[
                { to: '/shop', label: 'New Arrivals' },
                { to: '/deals', label: 'Tech Deals' },
                { to: '/stores', label: 'Our Boutiques' },
                { to: '/shop', label: 'Categories' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-gray-400 hover:text-primary-blue transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-white mb-4 mt-0">Customer Service</h4>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {['Help Center', 'Track Order', 'Shipping Info', 'Returns & Exchange', 'Privacy Policy'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-primary-blue transition-colors text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 mt-0">Contact Us</h4>
            <div className="space-y-3">
              <p className="text-sm text-gray-400 flex items-start gap-2 m-0">
                <MapPin size={16} className="mt-0.5 text-primary-blue flex-shrink-0" />
                {brandAddress}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2 m-0">
                <Phone size={16} className="text-primary-blue flex-shrink-0" />
                {brandPhone}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2 m-0">
                <Mail size={16} className="text-primary-blue flex-shrink-0" />
                {brandEmail}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="base-container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500 m-0">{footerText}</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">We accept:</span>
            <div className="flex gap-2 text-lg">
              <span>💳</span>
              <span>🏦</span>
              <span>💵</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
