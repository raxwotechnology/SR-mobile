import React from 'react';
import ManagerRepairs from '../storeOwner/ManagerRepairs';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const AdminRepairs = () => {
  const { selectedStoreId } = useAdminStoreStore();
  const storeIdFilter = selectedStoreId !== 'all' ? selectedStoreId : undefined;

  return (
    <ManagerRepairs 
      isAdmin={true} 
      navItems={navItems} 
      storeIdFilter={storeIdFilter} 
    />
  );
};

export default AdminRepairs;
