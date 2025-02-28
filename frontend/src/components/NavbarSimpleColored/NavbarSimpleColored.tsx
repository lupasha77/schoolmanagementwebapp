// NavbarSimpleColored.tsx
import { useState } from 'react';
import {
  Icon2fa,
  IconBellRinging,
  IconHome2,
  IconMessage2,
  IconPhoneOutgoing,
  IconReportAnalytics,
//   IconLogout,
  IconSettings,
//   IconSwitchHorizontal,
} from '@tabler/icons-react';
import { 
//   Code,
     Group } from '@mantine/core';
// import { MantineLogo } from '@mantinex/mantine-logo';
import classes from './NavbarSimpleColored.module.css';

const data = [
  { link: '', label: 'Notifications', icon: IconBellRinging },
  { link: '', label: 'Home', icon: IconHome2 },
  { link: '', label: 'Reports', icon: IconReportAnalytics },
  { link: '', label: 'Contact Us', icon: IconPhoneOutgoing },
  { link: '', label: 'Messages', icon: IconMessage2 },
  { link: '', label: 'Password Change', icon: Icon2fa },
  { link: '', label: 'Profile', icon: IconSettings },
];

export function NavbarSimpleColored() {
  const [active, setActive] = useState('Home');

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          {/* <MantineLogo size={28} inverted style={{ color: 'white' }} /> */}
          {/* <Code fw={700} className={classes.version}>
            v3.1.2
          </Code> */}
        </Group>
        {links}
      </div>

      {/* <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconSwitchHorizontal className={classes.linkIcon} stroke={1.5} />
          <span>Change account</span>
        </a>

        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div> */}
    </nav>
  );
}