import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { axiosPrivate } from "@/lib/axios";

interface User {
  uuid: string;
  username: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password1: string, password2: string) => Promise<boolean>;
  logout: () => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsSessionLoading(true);
    console.log("AuthContext: Initiating session fetch...");
    try {
      const response = await axiosPrivate.get('/api/auth/session');
      console.log('AuthContext: Session fetch response status:', response.status);
      console.log('AuthContext: Session fetch response data:', response.data);

      if (response.data?.user) {
        setUser(response.data.user as User);
        console.log('AuthContext: User authenticated from session:', response.data.user);
      } else {
        setUser(null);
        console.log('AuthContext: No user data found in session.');
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch session:', error);
      setUser(null);
    } finally {
      setIsSessionLoading(false);
      // Removed the problematic console.log here.
      // The useEffect below will log the actual updated user state.
    }
  }, []);

  // Fetch session on initial mount
  useEffect(() => {
    console.log("AuthContext: Running initial session check useEffect.");
    refreshSession();
  }, [refreshSession]);

  // New useEffect to log user state whenever it changes
  useEffect(() => {
    console.log('AuthContext: User state changed. Current user:', user, 'isAuthenticated:', !!user);
  }, [user]); // This effect runs whenever 'user' state changes

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log("AuthContext: Attempting login...");
    try {
      const response = await axiosPrivate.post('/api/auth/login', JSON.stringify({ usernameOrEmail: username, password }));
      console.log('AuthContext: Login API response status:', response.status);
      console.log('AuthContext: Login API response data:', response.data);

      if (response.data?.user) {
        setUser(response.data.user as User);
        console.log('AuthContext: Login successful, user set directly from login response.');
        // await refreshSession(); // Re-verify session after successful login
        return true;
      } else {
        setUser(null);
        console.log('AuthContext: Login failed: No user data found in response.');
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      setUser(null);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    if (username && password.length >= 6 && email.indexOf('@') > 0) {
      console.log("AuthContext: Attempting registration...");
      try {
        // 放到服务器端处理
        // const uuid = crypto.randomUUID();
        const response = await axiosPrivate.post('/api/auth/register', JSON.stringify({ username, email, password }));
        console.log('AuthContext: Register API response status:', response.status);
        console.log('AuthContext: Register API response data:', response.data);

        if (response.data?.user) {
          setUser(response.data.user as User);
          console.log('AuthContext: Registration successful, user set directly from register response.');
          // await refreshSession(); // Re-verify session after successful registration
          return true;
        } else {
          setUser(null);
          console.log('AuthContext: Registration failed: No user data found in response.');
          return false;
        }
      } catch (error) {
        console.error('AuthContext: Registration failed:', error);
        setUser(null);
        return false;
      }
    }
    return false;
  };

  const logout = async () => {
    console.log("AuthContext: Attempting logout...");
    try {
      const response = await axiosPrivate.post('/api/auth/logout');
      console.log('AuthContext: Logout API response status:', response.status);
      console.log('AuthContext: Logout API response data:', response.data);
      console.log('AuthContext: Logout successful.');
    } catch (error) {
      console.error('AuthContext: Failed to logout:', error);
    } finally {
      setUser(null);
      setBookmarks([]);
      console.log('AuthContext: User state cleared after logout.');
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarks(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Log AuthProvider's current state on each render (for general debugging, can be removed in production)
  // console.log('AuthContext: AuthProvider render - user:', user, 'isAuthenticated:', !!user, 'isSessionLoading:', isSessionLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSessionLoading,        
        login,
        register,
        logout,
        bookmarks,
        toggleBookmark,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
