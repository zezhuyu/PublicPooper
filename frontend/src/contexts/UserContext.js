'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('publicpooper_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('publicpooper_user');
        }
      }
    }
    setLoading(false);
  }, []);

  const loginUser = async (userData) => {
    try {
      const createdUser = await apiService.createUser(userData);
      setUser(createdUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('publicpooper_user', JSON.stringify(createdUser));
      }
      return createdUser;
    } catch (error) {
      console.error('Login failed:', error);
      
      // Enhanced error handling for CORS issues
      if (error.message.includes('CORS_ERROR')) {
        throw new Error('Login blocked by CORS policy. Please ensure the backend server is running and has CORS properly configured.');
      }
      
      throw error;
    }
  };

  const loginByUsername = async (username) => {
    try {
      console.log('Attempting to login by username:', username);
      const foundUser = await apiService.loginByUsername(username);
      setUser(foundUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('publicpooper_user', JSON.stringify(foundUser));
      }
      return foundUser;
    } catch (error) {
      console.error('Username login failed:', error);
      
      // Enhanced error handling for CORS issues
      if (error.message.includes('CORS_ERROR')) {
        throw new Error('Login blocked by CORS policy. Please ensure the backend server is running and has CORS properly configured.');
      }
      
      throw error;
    }
  };

  const logoutUser = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('publicpooper_user');
    }
  };

  const value = {
    user,
    loading,
    loginUser,
    loginByUsername,
    logoutUser,
    isLoggedIn: !!user,
    isPremium: user?.type === 'premium',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
