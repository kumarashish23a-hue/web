import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, setAccessToken } from './api';
import type { AdminRole, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  adminRole: AdminRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** True when the user holds any admin role. UI-only hint — the server enforces RBAC. */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      setAdminRole(data.adminRole ?? null);
    } catch {
      setUser(null);
      setAdminRole(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setAdminRole(data.adminRole ?? null);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { data } = await authApi.signup(email, password, displayName);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setAdminRole(data.adminRole ?? null);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* still clear local state even if the server call fails */
    }
    setAccessToken(null);
    setUser(null);
    setAdminRole(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      adminRole,
      loading,
      login,
      signup,
      logout,
      refresh,
      isAdmin: adminRole !== null,
    }),
    [user, adminRole, loading, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
