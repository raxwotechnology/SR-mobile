import {
  LayoutDashboard, Users, Store, Tag, ShoppingBag, Monitor,
  Ticket, BarChart3, DollarSign, Wallet, Package, Gift,
  CreditCard, UserCog, UsersRound, RotateCcw, Barcode, TrendingUp, Brain,
<<<<<<< HEAD
  Clock, Target, Settings, ChevronRight, Globe, History, Landmark, FileText, Smartphone, Wrench,
=======
  Clock, Target, Settings, ChevronRight, Globe, History, Landmark, FileText, Smartphone,
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
} from 'lucide-react';



// Groups shape: [{ label: string, items: [{ path, label, icon }] }]
const adminNavGroups = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'User & Employee Management',
    items: [
      { path: '/admin/users',      label: 'Users',      icon: Users },
      { path: '/admin/employees',  label: 'Employees',  icon: UsersRound },
      { path: '/admin/attendance', label: 'Attendance', icon: Clock },
      { path: '/admin/leaves',     label: 'Leaves',     icon: Clock },
      { path: '/admin/targets',    label: 'Targets',    icon: Target },
    ],
  },
  {
    label: 'Business Management',
    items: [
      { path: '/admin/stores',     label: 'Stores',     icon: Store },
      { path: '/admin/categories', label: 'Categories', icon: Tag },
      { path: '/admin/products',   label: 'Products & Accessories', icon: Package },
      { path: '/admin/phones',     label: 'Mobile Phones', icon: Monitor },
      { path: '/admin/inventory',  label: 'Stock Report',  icon: Package },
    ],


  },
  {
    label: 'Sales & Operations',
    items: [
      { path: '/admin/orders',         label: 'Orders',         icon: ShoppingBag },
      { path: '/admin/returns',        label: 'Returns',        icon: RotateCcw },
      { path: '/pos',                  label: 'POS Terminal',   icon: Monitor },
      { path: '/admin/repairs',        label: 'Device Repairs', icon: Wrench },
      { path: '/admin/reloads',        label: 'Reloads & Bills', icon: Smartphone },
      { path: '/admin/sales-tracking', label: 'Sales Tracking', icon: TrendingUp },
    ],
  },
  {
    label: 'Marketing & Promotions',
    items: [
      { path: '/admin/vouchers',    label: 'Vouchers',    icon: Ticket },
      { path: '/admin/promotions',  label: 'Promotions',  icon: Gift },
    ],
  },
  {
    label: 'Barcode System',
    items: [
      { path: '/admin/barcodes',      label: 'Barcodes',          icon: Barcode },
      { path: '/barcode-generator',   label: 'Barcode Generator', icon: Barcode },
    ],
  },
  {
    label: 'Suppliers & Payments',
    items: [
      { path: '/admin/suppliers',         label: 'Suppliers List',    icon: Users },
      { path: '/admin/supplier-payments', label: 'Supplier Payments', icon: Wallet },
    ],


  },
  {
    label: 'Financial Management',
    items: [
      { path: '/admin/accounts',   label: 'Manage Accounts',   icon: Landmark },
      { path: '/admin/cheques',    label: 'Cheque Management', icon: FileText },
      { path: '/admin/hp',         label: 'Installments (HP)', icon: Clock },
      { path: '/admin/expenses',   label: 'Expenses & Income', icon: Wallet },
      { path: '/admin/financials', label: 'Financials',        icon: DollarSign },
      { path: '/admin/profit-reports', label: 'Profit Reports', icon: TrendingUp },
      { path: '/admin/payroll',    label: 'Payroll',           icon: CreditCard },
      { path: '/admin/overtime',   label: 'Overtime Pay',      icon: Clock },
    ],
  },
  {
    label: 'Analytics & Reports',
    items: [
      { path: '/admin/reports',          label: 'Reports',          icon: BarChart3 },
      { path: '/admin/customer-history', label: 'Customer History', icon: History },
      { path: '/admin/predictions',      label: 'AI Predictions',   icon: Brain },

    ],
  },
  {
    label: 'System Settings',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Customer View',
    items: [
      { path: '/', label: 'Customer View', icon: Globe },
    ],
  },
];

// Helper function to filter navigation based on user permissions
export const getAdminNavGroups = (user) => {
  if (!user) return adminNavGroups;

  const isSuperAdmin = user.email === 'admin@mobilehub.com' || user.isSuperAdmin;
  const p = user.permissions || {};

  // If super admin, return everything
  if (isSuperAdmin) return adminNavGroups;

  // Otherwise, filter based on permissions object
  return adminNavGroups.map(group => {
    let filteredItems = group.items;

    if (group.label === 'User & Employee Management' && !p.employees) filteredItems = [];
    if (group.label === 'Business Management' && !p.products) filteredItems = [];
    if (group.label === 'Sales & Operations' && !p.sales) filteredItems = [];
    if (group.label === 'Financial Management' && !p.finance) filteredItems = [];
    if (group.label === 'Analytics & Reports' && !p.reports) filteredItems = [];
    if (group.label === 'Suppliers & Payments' && !p.suppliers) filteredItems = [];
    
    // Some general groups might still show a few items, or none.
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);
};

export { adminNavGroups };
