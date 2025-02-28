// src/types/auth.ts
export interface User {
    email: string;
    firstName: string; 
    role: string;
    id: string;
    accessToken: string;
    avatar:string;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    success: boolean;
    error?: string;
    user?: User; // Assuming User is a type that represents the user data
  }
  
  export interface AuthContextType {
    user: User | null;
    login: (credentials: LoginCredentials) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    isLoggedIn: boolean;
    refreshToken: () => Promise<boolean>;
    isVerifying:boolean;
  }
  