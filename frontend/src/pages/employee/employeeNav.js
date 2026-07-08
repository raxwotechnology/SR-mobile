import {
  LayoutDashboard, User, Clock, Calendar, CreditCard,
  Monitor, Truck, Package, Barcode, Timer, Globe, Wrench,
} from 'lucide-react';

const getEmployeeNavGroups = (role) => {
  const groups = [
    {
      label: 'My Dashboard',
      items: [
        { path: '/employee',         label: 'Dashboard',      icon: LayoutDashboard },
        { path: '/employee/profile', label: 'My Profile',     icon: User },
      ],
    },
    {
      label: 'Work & Attendance',
      items: [
        { path: '/employee/attendance', label: 'Attendance',       icon: Clock },
        { path: '/employee/leaves',     label: 'Leave Requests',   icon: Calendar },
        { path: '/employee/overtime',   label: 'Overtime',         icon: Timer },
      ],
    },
    {
      label: 'Payroll',
      items: [
        { path: '/employee/salary', label: 'Salary & EPF/ETF', icon: CreditCard },
      ],
    },
  ];

  // Role-specific tools
  const tools = [];
  if (role === 'cashier') {
    tools.push({ path: '/pos',                label: 'POS Terminal',       icon: Monitor });
    tools.push({ path: '/employee/repairs',   label: 'Device Repairs',     icon: Wrench });
    tools.push({ path: '/employee/stock',     label: 'Stock View',         icon: Package });
    tools.push({ path: '/barcode-generator',  label: 'Barcode Generator',  icon: Barcode });
  }
  if (role === 'stockEmployee') {
    tools.push({ path: '/employee/stock', label: 'Stock View', icon: Package });
  }
  if (role === 'deliveryGuy') {
    tools.push({ path: '/delivery', label: 'Deliveries', icon: Truck });
  }

  if (tools.length > 0) {
    groups.push({ label: 'My Tools', items: tools });
  }

  groups.push({
    label: 'Customer View',
    items: [{ path: '/', label: 'Customer View', icon: Globe }],
  });

  return groups;
};

// Flat list for backward compat
const getEmployeeNavItems = (role) =>
  getEmployeeNavGroups(role).flatMap(g => g.items);

export { getEmployeeNavGroups };
export default getEmployeeNavItems;
