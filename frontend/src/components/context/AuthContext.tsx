
// src/components/context/AuthContext.ts
// AuthContext.ts
import { createContext } from 'react';
import { AuthContextType } from '../../types/auth';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  isLoggedIn: false,
  refreshToken: async () => false,
  isVerifying:false
});