import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../utils/api/axios';
import { User, LoginCredentials, LoginResponse } from '../../types/auth';
import { AxiosError, AxiosResponse } from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { AuthContextType } from '../../types/auth';
import { refreshToken, forceLogout, STORAGE_KEYS } from '../../utils/api/authUtils';


interface ApiErrorResponse {
  error?: string;
  data?: {
    error?: string;
  };
  status?: number;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  user_email: string;
  role: string;
  firstName: string;
  avatar?: string;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error('[Auth] Error parsing user from localStorage:', error);
        localStorage.removeItem(STORAGE_KEYS.user);
        return null;
      }
    }
    return null;
  });
  const [isVerifying, setIsVerifying] = useState(true);

  const clearStorageAndLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const handleNavigation = useCallback((role: string) => {
    //Console.log('[Auth] Navigating based on role:', role);
    const routes = {
      admin: '/admin-dashboard',
      student: '/student-dashboard',
      staff: '/staff-dashboard',
      default: '/dashboard'
    };
    
    const route = routes[role as keyof typeof routes] || routes.default;
    //Console.log('[Auth] Navigating to:', route);
    
    setTimeout(() => {
      navigate(route, { replace: true });
    }, 0);
  }, [navigate]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      //Console.log('[Auth] Attempting login...');
      const response = await api.post<LoginResponseData>('/auth/login', {
        user_email: credentials.email,
        password: credentials.password,
      });

      //Console.log('[Auth] Login response received:', response.data);
      const { access_token, refresh_token, role, user_email, firstName, avatar } = response.data;

      const userData: User = {
        email: user_email,
        role: role,
        firstName: firstName,
        avatar: avatar || '',
        id: '', // Add any additional required fields
        accessToken: access_token
      };

      await Promise.all([
        localStorage.setItem(STORAGE_KEYS.accessToken, access_token),
        localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token),
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData))
      ]);

      setUser(userData);
      //Console.log('[Auth] User state updated:', userData);

      //Console.log('[Auth] About to navigate for role:', role);
      handleNavigation(role);

      return { success: true, user: userData };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error('[Auth] Login error:', axiosError);
      return {
        success: false,
        error: axiosError.response?.data?.error || 'Login failed',
      };
    }
  }, [handleNavigation]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.accessToken);
      if (token) {
        await api.post('/auth/logout', null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      clearStorageAndLogout();
    }
  }, [clearStorageAndLogout]);

  const verifyAuth = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) {
      setIsVerifying(false);
      return false;
    }

    try {
      const response = await api.post('/auth/verify', null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200 && response.data.user) {
        setUser(response.data.user);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(response.data.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Verification failed:', error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        if (error.response?.status === 401) {
          await forceLogout();
          clearStorageAndLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [clearStorageAndLogout]);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const authContextValue: AuthContextType = useMemo(() => ({
    user,
    login,
    logout,
    isLoggedIn: !!user,
    refreshToken,
    isVerifying,
  }), [user, login, logout, isVerifying]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {!isVerifying && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;