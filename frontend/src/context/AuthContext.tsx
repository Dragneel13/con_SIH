import React, { createContext, useContext, useState } from 'react';

export interface User {
  username: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (path: string) => boolean;
  getDefaultDashboard: (role?: string) => string;
}

const ALL_SYSTEM_ROUTES = [
  '/',
  '/login',
  '/contact',
  '/exploration',
  '/drill-planning',
  '/target-resource',
  '/mine-twin',
  '/production',
  '/shortfall',
  '/shortfall-analysis',
  '/corrective-actions',
  '/optimization',
  '/equipment',
  '/decisions',
  '/decision-center',
  '/what-if',
  '/weather',
  '/security',
  '/field-survey',
  '/data-models',
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Admin': ALL_SYSTEM_ROUTES,
  'Operations Manager': ALL_SYSTEM_ROUTES,
  'Geologist': [
    '/',
    '/login',
    '/contact',
    '/exploration',
    '/drill-planning',
    '/target-resource',
    '/field-survey',
    '/data-models',
    '/weather',
  ],
  'Field Officer': [
    '/',
    '/login',
    '/contact',
    '/field-survey',
    '/exploration',
    '/weather',
  ]
};

const DEFAULT_DASHBOARDS: Record<string, string> = {
  'Admin': '/',
  'Operations Manager': '/',
  'Geologist': '/exploration',
  'Field Officer': '/field-survey'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('user_role');
    const savedFullName = localStorage.getItem('user_fullname');
    const savedEmail = localStorage.getItem('user_email');
    if (savedUsername && savedRole) {
      return {
        username: savedUsername,
        role: savedRole,
        full_name: savedFullName || undefined,
        email: savedEmail || undefined,
      };
    }
    return null;
  });

  const isAuthenticated = Boolean(token && user);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('username', newUser.username);
    localStorage.setItem('user_role', newUser.role);
    if (newUser.full_name) localStorage.setItem('user_fullname', newUser.full_name);
    if (newUser.email) localStorage.setItem('user_email', newUser.email);
  };

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_fullname');
    localStorage.removeItem('user_email');
  };

  const getDefaultDashboard = (roleOverride?: string): string => {
    const activeRole = roleOverride || user?.role || 'Guest';
    return DEFAULT_DASHBOARDS[activeRole] || '/';
  };

  const hasPermission = (path: string): boolean => {
    if (path === '/' || path === '/login' || path === '/contact') {
      return true;
    }

    // Admin role has full unrestricted access to all pages across the system
    if (user && (user.role === 'Admin' || user.role.toLowerCase() === 'admin')) {
      return true;
    }

    const cleanPath = path.split('?')[0].split('#')[0];
    const basePath = cleanPath.split('/')[1] ? `/${cleanPath.split('/')[1]}` : cleanPath;

    if (!user) {
      return basePath === '/exploration' || basePath === '/contact';
    }

    const allowed = ROLE_PERMISSIONS[user.role];
    if (!allowed) return false;

    return allowed.includes(basePath) || allowed.includes(cleanPath);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        getDefaultDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
