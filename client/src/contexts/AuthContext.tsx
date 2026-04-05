// import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo, useRef } from 'react';
// import { axiosPrivate } from "@/lib/axios";

// export interface User {
//   uuid: string;
//   username: string;
//   role: string;
//   avatar?: string | null; 
// }

// export interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   isSessionLoading: boolean;
//   login: (username: string, password: string) => Promise<boolean>;
//   register: (username: string, password1: string, password2: string) => Promise<boolean>;
//   logout: () => void;
//   bookmarks: string[];
//   toggleBookmark: (id: string) => void;
//   refreshSession: () => Promise<void>;
// }

// export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// interface AuthProviderProps {
//   children: ReactNode;
// }

// export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [bookmarks, setBookmarks] = useState<string[]>([]);
//   const [isSessionLoading, setIsSessionLoading] = useState(true);
//   const sessionCheckHasRun = useRef(false); // Sentinel to prevent double-execution in Strict Mode

//   useEffect(() => {
//     console.log('AuthProvider mounted');
//     return () => console.log('AuthProvider unmounted');
//   }, []);

//   const refreshSession = useCallback(async () => {
//     setIsSessionLoading(true);
//     // console.log("AuthContext: Initiating session fetch...");
//     try {
//       const response = await axiosPrivate.get('/api/auth/session');
//       // console.log('AuthContext: Session fetch response status:', response.status);
//       // console.log('AuthContext: Session fetch response data:', response.data);

//       if (response.data?.user) {
//         setUser(response.data.user as User);
//         // console.log('AuthContext: User authenticated from session:', response.data.user);
//       } else {
//         setUser(null);
//         // console.log('AuthContext: No user data found in session.');
//       }
//     } catch (error) {
//       console.error('AuthContext: Failed to fetch session:', error);
//       setUser(null);
//     } finally {
//       setIsSessionLoading(false);
//       // Removed the problematic console.log here.
//       // The useEffect below will log the actual updated user state.
//     }
//   }, []);

//   // Fetch session on initial mount
//   useEffect(() => {
//     if (sessionCheckHasRun.current) {
//       // If the check has already run (e.g., due to Strict Mode re-mount), do nothing.
//       return;
//     }
//     sessionCheckHasRun.current = true; // Mark as run

//     // console.log("AuthContext: Running initial session check useEffect.");
//     refreshSession();
//   }, [refreshSession]);

//   // // New useEffect to log user state whenever it changes
//   // useEffect(() => {
//   //   // console.log('AuthContext: User state changed. Current user:', user, 'isAuthenticated:', !!user);
//   // }, [user]); // This effect runs whenever 'user' state changes

//   // Listen for global sessionExpired event (emitted by axios interceptor) to clear client state
//   useEffect(() => {
//     const handleSessionExpired = () => {
//       console.warn('AuthContext: sessionExpired event received — clearing client auth state.');
//       setUser(null);
//       setBookmarks([]);
//       setIsSessionLoading(false);
//     };

//     window.addEventListener('sessionExpired', handleSessionExpired as EventListener);
//     return () => {
//       window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
//     };
//   }, []);

//   const login = useCallback(async (username: string, password: string): Promise<boolean> => {
//     setIsSessionLoading(true);
//     try {
//       const response = await axiosPrivate.post('/api/auth/login', JSON.stringify({ usernameOrEmail: username, password }));
//       if (response.data?.user) {
//         setUser(response.data.user as User);
//         return true;
//       } else {
//         setUser(null);
//         return false;
//       }
//     } catch (error) {
//       console.error('AuthContext: Login failed:', error);
//       setUser(null);
//       return false;
//     } finally {
//       setIsSessionLoading(false);
//     }
//   }, []);

//   const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
//     if (username && password.length >= 6 && email.indexOf('@') > 0) {
//       // console.log("AuthContext: Attempting registration...");
//       try {
//         // 放到服务器端处理
//         // const uuid = crypto.randomUUID();
//         const response = await axiosPrivate.post('/api/auth/register', JSON.stringify({ username, email, password }));
//         // console.log('AuthContext: Register API response status:', response.status);
//         // console.log('AuthContext: Register API response data:', response.data);

//         if (response.data?.user) {
//           // 让用户再次点击登录
//           setUser(null);
//           return true;
//         } else {
//           setUser(null);
//           // console.log('AuthContext: Registration failed: No user data found in response.');
//           return false;
//         }
//       } catch (error) {
//         console.error('AuthContext: Registration failed:', error);
//         setUser(null);
//         return false;
//       }
//     }
//     return false;
//   }, []);

//   const logout = useCallback(async () => {
//     // console.log("AuthContext: Attempting logout...");
//     try {
//       // const response = 
//       await axiosPrivate.post('/api/auth/logout');
//       // console.log('AuthContext: Logout API response status:', response.status);
//       // console.log('AuthContext: Logout API response data:', response.data);
//       // console.log('AuthContext: Logout successful.');
//     } catch (error) {
//       console.error('AuthContext: Failed to logout:', error);
//     } finally {
//       setUser(null);
//       setBookmarks([]);
//       // console.log('AuthContext: User state cleared after logout.');
//     }
//   }, []);

//   const toggleBookmark = useCallback((id: string) => {
//     setBookmarks(prev =>
//       prev.includes(id)
//         ? prev.filter(item => item !== id)
//         : [...prev, id]
//     );
//   }, []);

//   // Log AuthProvider's current state on each render (for general debugging, can be removed in production)
//   // console.log('AuthContext: AuthProvider render - user:', user, 'isAuthenticated:', !!user, 'isSessionLoading:', isSessionLoading);

//   const authValue = useMemo(() => ({
//     user,
//     isAuthenticated: !!user,
//     isSessionLoading,
//     login,
//     register,
//     logout,
//     bookmarks,
//     toggleBookmark,
//     refreshSession,
//   }), [user, isSessionLoading, bookmarks, login, register, logout, toggleBookmark, refreshSession]);

//   return (
//     <AuthContext.Provider
//       value={authValue}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { axiosPrivate } from "@/lib/axios";

export interface User {
  uuid: string;
  username: string;
  role: string;
  avatar?: string | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password1: string) => Promise<boolean>;
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
  // 初始状态设为 true，确保首屏加载时先走验证流程
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // useEffect(() => {
  //   console.log('AuthProvider mounted');
  //   return () => console.log('AuthProvider unmounted');
  // }, []);

  /**
   * 刷新/获取当前会话状态
   */
  const refreshSession = useCallback(async () => {
    setIsSessionLoading(true);
    try {
      const response = await axiosPrivate.get('/api/auth/session');
      if (response.data?.user) {
        setUser(response.data.user as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch session:', error);
      setUser(null);
    } finally {
      // 延迟一点点关闭 loading，确保状态同步渲染
      setIsSessionLoading(false);
    }
  }, []);

  /**
   * 初始化挂载时执行一次 Session 检查
   */
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * 监听全局 Session 过期事件
   */
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setBookmarks([]);
      setIsSessionLoading(false);
    };

    window.addEventListener('sessionExpired', handleSessionExpired as EventListener);
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
    };
  }, []);

  /**
   * 登录逻辑
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsSessionLoading(true); // 登录开始，进入加载态
    try {
      const response = await axiosPrivate.post('/api/auth/login', JSON.stringify({ 
        usernameOrEmail: username, 
        password 
      }));
      
      if (response.data?.user) {
        setUser(response.data.user as User);
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      return false;
    } finally {
      setIsSessionLoading(false); // 登录结束
    }
  }, []);

  /**
   * 注册逻辑
   */
  const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await axiosPrivate.post('/api/auth/register', JSON.stringify({ 
        username, 
        email, 
        password 
      }));
      return !!response.data?.user;
    } catch (error) {
      console.error('AuthContext: Registration failed:', error);
      return false;
    }
  }, []);

  /**
   * 登出逻辑
   */
  const logout = useCallback(async () => {
    try {
      await axiosPrivate.post('/api/auth/logout');
    } catch (error) {
      console.error('AuthContext: Failed to logout:', error);
    } finally {
      setUser(null);
      setBookmarks([]);
      setIsSessionLoading(false);
    }
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const authValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isSessionLoading,
    login,
    register,
    logout,
    bookmarks,
    toggleBookmark,
    refreshSession,
  }), [user, isSessionLoading, bookmarks, login, register, logout, toggleBookmark, refreshSession]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};