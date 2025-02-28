import  { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconBellRinging,
  IconCreditCard, 
  IconHome2,
  IconMessage2,
  IconPhoneCalling,
  IconReportAnalytics,
  IconSettings,
  IconLogout
} from '@tabler/icons-react';
import classes from './NavbarSimpleColored.module.css';
import { Group } from '@mantine/core';

const navItems = [
  { link: '/dashboard', label: 'Dashboard', icon: IconHome2 },
  { link: '/dashboard/notifications', label: 'Notifications', icon: IconBellRinging },
  { link: '/dashboard/transactions/tokens', label: 'Utility Tokens Transactions', icon: IconReportAnalytics },
  { link: '/dashboard/transactions/wallets', label: 'Wallet & Payment Statement', icon: IconCreditCard },
  { link: '/dashboard/messages', label: 'Messages', icon: IconMessage2 },
  { link: '/dashboard/contact', label: 'Contact Support', icon: IconPhoneCalling }, 
  { link: '/dashboard/profile', label: 'Settings', icon: IconSettings }
];

const NavbarDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);

  const handleLogout = () => {
    // Add your logout logic here
    sessionStorage.removeItem('accessToken');
    // console.log('Logged out');
    navigate('/login'); // Redirect to login page after logout
  };

  const links = navItems.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
        navigate(item.link); // Navigate to the link
      }}
    >
      <item.icon className={classes.linkIcon} stroke="1.5" />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
      {links}
      
        </Group>
        <a
        className={classes.link}
        href="/logout"
        onClick={(event) => {
          event.preventDefault();
          handleLogout();
        }}
      >
        <IconLogout className={classes.linkIcon} stroke="1.5" />
        <span>Log out</span>
      </a>
      </div>
    </nav>
  );
};

export default NavbarDashboard;




  