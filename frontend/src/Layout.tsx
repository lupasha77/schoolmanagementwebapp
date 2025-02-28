import React, { ReactNode } from 'react';
import { AppShell, Burger, Flex, Skeleton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLocation } from 'react-router-dom'; // Import useLocation 
import { HeaderMegaMenu } from './components/HeaderMegaMenu/HeaderMegaMenu';
import { FooterLinks } from './components/FooterLinks/FooterLinks';
import { NavbarSimpleColored } from './components/NavbarSimpleColored/NavbarSimpleColored';
import  AuthProvider  from './components/context/AuthProvider'; // Import the AuthProvider 
import { AdminNavbar } from './components/NavbarSimpleColored/AdminNavbar';
import { StaffNavbar } from './components/NavbarSimpleColored/StaffNavbar';
import { StudentNavbar } from './components/NavbarSimpleColored/StudentNavbar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const location = useLocation(); // Get the current route

  // Determine which Navbar to show based on the current route
  const isAdminRoute = location.pathname.startsWith('/admin-dashboard');
  const isStaffRoute = location.pathname.startsWith('/staff-dashboard');
  const isStudentRoute = location.pathname.startsWith('/student-dashboard');

  let NavbarComponent = NavbarSimpleColored; // Default Navbar

  if (isAdminRoute) {
    NavbarComponent = AdminNavbar; // Admin Navbar for /admin-dashboard
  } else if (isStaffRoute) {
    NavbarComponent = StaffNavbar; // Staff Navbar for /staff-dashboard
  } else if (isStudentRoute) {
    NavbarComponent = StudentNavbar; // Student Navbar for /student-dashboard
  }

  return (
    <AuthProvider> {/* Wrap the app with AuthProvider */} 
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 320,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        footer={{ height: 60 }}
        padding="xs"
      >
        <AppShell.Header>
          <Flex h="100%" px="md" justify="space-between" align="center" color="gray" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
            <HeaderMegaMenu />
          </Flex>
        </AppShell.Header>
        <AppShell.Navbar>
          <NavbarComponent /> {/* Render the determined Navbar */}
          {Array(15)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} h={28} mt="sm" animate={false} />
            ))}
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
        <AppShell.Footer p="md">
          <FooterLinks />
        </AppShell.Footer>
      </AppShell> 
    </AuthProvider>
  );
};

export default Layout;
