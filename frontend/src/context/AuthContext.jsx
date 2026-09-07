import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { setAuthTokenProvider } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useClerkAuth();
  const clerk = useClerk();

  const isLoaded = isUserLoaded && isAuthLoaded;

  // Set up auth token provider for axios API requests
  useEffect(() => {
    setAuthTokenProvider(async () => {
      if (isSignedIn && getToken) {
        return await getToken();
      }
      return null;
    });
  }, [isSignedIn, getToken]);

  const user = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    return {
      _id: clerkUser.id,
      id: clerkUser.id,
      clerkId: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || 'Customer',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      imageUrl: clerkUser.imageUrl,
      clerkUser,
    };
  }, [isSignedIn, clerkUser]);

  const logout = async () => {
    if (clerk?.signOut) {
      await clerk.signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        clerkUser,
        loading: !isLoaded,
        isAuthenticated: !!isSignedIn,
        getToken,
        logout,
        openSignIn: clerk?.openSignIn,
        openSignUp: clerk?.openSignUp,
        openUserProfile: clerk?.openUserProfile,
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

export default AuthContext;

