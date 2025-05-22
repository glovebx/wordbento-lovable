
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { axiosPrivate } from "@/lib/axios";

interface User {
  uuid: string;
  username: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password1: string, password2: string) => Promise<boolean>;
  logout: () => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
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

const initiateSessionFetch = async (): Promise<User | null> => {
  // Removed the check for sessionFetchPromise.
  // A new API call will be initiated every time this function is called.

  console.log("Initiating session fetch."); // Log every time a fetch is initiated

  try {
      const response = await axiosPrivate.get('/api/auth/session');
      console.log('Response headers:', response.headers);
      console.log('Response body:', response.data);

      if (response.data?.user) {
          console.log('User authenticated:', response.data.user);
          // Return the authenticated user data
          return response.data.user as User;
      } else {
          console.log('No user data found.');
          return null; // Return null if no user is authenticated
      }
  } catch (error) {
      console.error('Failed to fetch session:', error);
      // Error handling remains the same
      return null; // Return null on error
  }
  // Removed the finally block as sessionFetchPromise is no longer managed here
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
        try {
            // const response = await axiosPrivate.get('/api/auth/session');
            // console.log('Response headers:', response.headers);
            // console.log('Response body:', response.data);

            // if (response.data?.user) {
            //   setUser(response.data.user);
            //     console.log('User authenticated:', response.data.user);
            // } else {
            //   setUser(null);
            //     console.log('No user data found.');
            // }
            const user = await initiateSessionFetch();
            setUser(user);
            
        } catch (error) {
            console.error('Failed to fetch session:', error);
            setUser(null);
        // } finally {
        //     setLoading(false);
        }
    };

    fetchSession();
  }, []);

  // Simulated login function - would be replaced by actual authentication
  const login = async (username: string, password: string): Promise<boolean> => {
    // Simple validation - in real app would check against database
    if (username && password.length >= 6) {
      // setUser({
      //   id: '1',
      //   username: username,
      // });
      try {
        const response = await axiosPrivate.post('/api/auth/login', JSON.stringify({ usernameOrEmail: username, password }));
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.data);

        if (response.data?.user) {
          setUser(response.data.user);
            console.log('User authenticated:', response.data.user);
            return true;
        } else {
          setUser(null);
            console.log('No user data found.');
        }
      } catch (error) {
          console.error('Failed to fetch session:', error);
          setUser(null);
      // } finally {
      //     setLoading(false);
      }
    }
    return false;
  };

  // Simulated login function - would be replaced by actual authentication
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    // Simple validation - in real app would check against database
    if (username && password.length >= 6 && email.indexOf('@') > 0) {
      try {
        const uuid = crypto.randomUUID(); // Generate UUID
        const response = await axiosPrivate.post('/api/auth/register', JSON.stringify({ username, email, password, uuid }));
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.data);

        if (response.data?.user) {
          setUser(response.data.user);
            console.log('User authenticated:', response.data.user);
            return true;
        } else {
          setUser(null);
            console.log('No user data found.');
        }
      } catch (error) {
          console.error('Failed to fetch session:', error);
          setUser(null);
      // } finally {
      //     setLoading(false);
      }
    }
    return false;
  };  

  const logout = async () => {
    // setUser(null);
    // setBookmarks([]);
      try {
        const response = await axiosPrivate.post('/api/auth/logout');
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.data);

        // setUser(null);
        console.log('logout successfully.');
      } catch (error) {
          console.error('Failed to logout:', error);
          // setUser(null);
      } finally {
          setUser(null);
          setBookmarks([]);
      }    
  };

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        login, 
        register,
        logout,
        bookmarks,
        toggleBookmark
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};