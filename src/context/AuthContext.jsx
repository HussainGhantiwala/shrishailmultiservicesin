import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Restoration
    authService.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });

    // 2. Subscribe to Supabase Auth state changes (Step 6)
    const { data: { subscription } } = authService.onAuthStateChange((event, authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setUser(response.user);
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    return authService.resetPassword(email);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      return freshUser;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  };

  const updateProfile = async (profileData) => {
    if (!user?.id) throw new Error('Not authenticated');
    const updatedUser = await authService.updateProfile(user.id, profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!user?.email) throw new Error('Account email missing');
    return await authService.changePassword({
      email: user.email,
      currentPassword,
      newPassword,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isCustomer: user?.role === 'customer',
        canManageCustomers: user?.role === 'admin' || user?.role === 'staff',
        login,
        logout,
        resetPassword,
        refreshUser,
        updateProfile,
        changePassword,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
