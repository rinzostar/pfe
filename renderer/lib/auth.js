import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ConvexAuthProvider, useAuthActions, useConvexAuth, useAuthToken } from "@convex-dev/auth/react";
import { setConvexAuthToken } from "./convexClient";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const AuthCtx = createContext({ user: null, loading: true, login: async () => {}, register: async () => {}, signOut: async () => {} });

export { ConvexAuthProvider };

export function AuthProvider({ children }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions();
  const token = useAuthToken();
  const user = useQuery(api.users.getMe);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setConvexAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!loading && !isAuthenticated && router.pathname !== '/login' && router.pathname !== '/register') {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  const login = async (email, password) => {
    await signIn("password", { email, password, flow: "signIn" });
  };

  const register = async (email, password, name, role = "student") => {
    await signIn("password", { email, password, name, role, flow: "signUp" });
  };

  const signOut = async () => {
    await convexSignOut();
    router.push('/login');
  };

  const authUser = user ? { ...user, id: user._id } : null;

  return (
    <AuthCtx.Provider value={{ user: authUser, loading, login, register, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, user, router]);
  return { user, loading };
}

export function getCurrentUser() {
  return null;
}

export function getAuthToken() {
  return null;
}
