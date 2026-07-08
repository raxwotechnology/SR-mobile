import {
  LayoutDashboard, Package, ShoppingBag, Users, UsersRound, Clock,
  Calendar, Target, BarChart3, RotateCcw, Barcode,
  Wallet, Monitor, Globe, TrendingUp, Wrench,
} from 'lucide-react';

const managerNavGroups = [
  {
    label: 'Dashboard',
    items: [
      { path: '/manager', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Employee Management',
    items: [
      { path: '/manager/employees',  label: 'Employees',  icon: UsersRound },
      { path: '/manager/attendance', label: 'Attendance', icon: Clock },
      { path: '/manager/leaves',     label: 'Leaves',     icon: Calendar },
      { path: '/manager/targets',    label: 'Targets',    icon: Target },
      { path: '/manager/performance',label: 'Performance',icon: BarChart3 },
    ],
  },
  {
    label: 'Store Operations',
    items: [
      { path: '/manager/products', label: 'Products',  icon: Package },
      { path: '/manager/orders',   label: 'Orders',    icon: ShoppingBag },
      { path: '/manager/returns',  label: 'Returns',   icon: RotateCcw },
      { path: '/manager/repairs',  label: 'Device Repairs', icon: Wrench },
    ],
  },
  {
    label: 'Suppliers & Payments',
    items: [
      { path: '/manager/supplier-payments', label: 'Supplier Payments', icon: Wallet },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/pos',              label: 'POS Terminal',      icon: Monitor },
      { path: '/barcode-generator',label: 'Barcode Generator', icon: Barcode },
    ],
  },
  {
    label: 'Customer View',
    items: [
      { path: '/', label: 'Customer View', icon: Globe },
    ],
  },
];

const managerNavItems = managerNavGroups.flatMap(g => g.items);

export { managerNavGroups };
export default managerNavItems;
