import React from 'react';
import ManagerRepairs from '../storeOwner/ManagerRepairs';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';

const EmployeeRepairs = () => {
  const { user } = useAuthStore();
  const navItems = getEmployeeNavGroups(user?.role);

  return (
    <ManagerRepairs 
      isEmployee={true}
      navItems={navItems}
    />
  );
};

export default EmployeeRepairs;
