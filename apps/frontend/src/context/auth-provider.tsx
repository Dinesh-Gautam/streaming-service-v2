'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { jwtDecode } from 'jwt-decode';

import {
  loginAction,
  logoutAction,
  refreshTokenAction,
} from '@/actions/auth/actions';

// Define the shape of the user object decoded from the JWT
interface UserPayload {
  id: string;
  name: string;
  role: 'user' | 'admin';
  email: string;
  // iat and exp are automatically added by jwt
}

// Define the shape of the AuthContext
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserPayload | null;
  login: (accessToken: string) => void;
  logout: () => Promise<void>;
  accessToken: string | null;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider is a component that provides authentication state to its children.
 * It manages JWTs, user information, and provides login/logout functions.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const logout = useCallback(async () => {
    await logoutAction();
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const result = await refreshTokenAction();
      if (result.accessToken) {
        login(result.accessToken);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    }
  }, []);

  const login = (newAccessToken: string) => {
    try {
      const decoded = jwtDecode<UserPayload>(newAccessToken);
      setUser(decoded);
      setAccessToken(newAccessToken);
    } catch (error) {
      console.error('Failed to process login:', error);
      // Ensure clean state if login fails
      logout();
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated: !!accessToken,
    user,
    login,
    logout,
    accessToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

/**
 * Custom hook to use the AuthContext.
 * Throws an error if used outside of an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
