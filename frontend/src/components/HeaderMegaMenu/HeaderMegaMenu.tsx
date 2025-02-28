import { useState, useEffect, useCallback } from "react";
import { Group, Button, Box, Flex, Menu, Avatar } from "@mantine/core";
import { IconSun, IconMoon, IconUser, IconLogout, IconDashboard } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthHook";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";

interface User {
  id: string;
  email: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'staff' | 'student' | string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
}

export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

  return (
    <Button
      onClick={() => setColorScheme(computedColorScheme === "light" ? "dark" : "light")}
      variant="default"
      leftSection={computedColorScheme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
      px="sm"
    />
  );
}

export function HeaderMegaMenu() {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth() as AuthContextType;
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);

  const getDashboardPath = (role: string = '') => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '/admin-dashboard';
      case 'staff':
        return '/staff-dashboard';
      case 'student':
        return '/student-dashboard';
      default:
        return '/dashboard';
    }
  };

  const fetchAvatar = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/avatar/get-avatar/${user.id}`);
      const data = await response.json();
      if (response.ok && data.avatar_url) {
        setAvatarUrl(`${import.meta.env.VITE_BACKEND_URL}${data.avatar_url}`);
      }
    } catch (error) {
      console.error("Error fetching avatar:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchAvatar();
    }
  }, [isLoggedIn, fetchAvatar]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error instanceof Error ? error.message : String(error));
      sessionStorage.clear();
      navigate("/login");
    }
  }, [logout, navigate]);

  return (
    <Box bg="cyan.6">
      <Flex h={60} px="md" justify="space-between" align="center" gap={5}>
        <Group>
          <Button variant="subtle" onClick={() => navigate("/")}>Home</Button>
          {isLoggedIn && user && (
            <Button 
              variant="subtle" 
              onClick={() => navigate(getDashboardPath(user.role))}
            >
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
            </Button>
          )}
          <Button variant="subtle">News</Button>
          <Button variant="subtle">Projects</Button>
        </Group>

        <Group>
          <ThemeToggle />
          {isLoggedIn && user ? (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Avatar 
                  src={avatarUrl || undefined} 
                  alt="Profile Avatar" 
                  radius="xl" 
                  size="md" 
                  style={{ cursor: "pointer" }} 
                />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconUser size={14} />} 
                  onClick={() => navigate("/dashboard/profile")}
                >
                  Profile
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconDashboard size={14} />} 
                  onClick={() => navigate(getDashboardPath(user.role))}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconLogout size={14} />} 
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <>
              <Button variant="default" onClick={() => navigate("/login")}>Login</Button>
              <Button onClick={() => navigate("/register")}>Sign Up</Button>
            </>
          )}
        </Group>
      </Flex>
    </Box>
  );
}

export default HeaderMegaMenu;