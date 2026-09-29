import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { LeavingSiteProvider } from './lib/leaving-site';
import { ToastProvider } from './lib/toast';
import { Button } from './components/Button';

// Public pages
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Websites } from './pages/Websites';
import { WebsiteDetail } from './pages/WebsiteDetail';
import { Models } from './pages/Models';
import { ModelDetail } from './pages/ModelDetail';
import { CategoryDetail } from './pages/CategoryDetail';
import { SearchPage } from './pages/SearchPage';
import { ComparePage } from './pages/ComparePage';
import { RecommendPage } from './pages/RecommendPage';
import { StackDetail } from './pages/StackDetail';
import { Profile } from './pages/Profile';
import { Favorites } from './pages/Favorites';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Submit } from './pages/Submit';

// Admin pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminWebsites } from './pages/admin/AdminWebsites';
import { AdminModels } from './pages/admin/AdminModels';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminPlans } from './pages/admin/AdminPlans';
import { AdminPricing } from './pages/admin/AdminPricing';
import { AdminSubmissions } from './pages/admin/AdminSubmissions';
import { AdminVerification } from './pages/admin/AdminVerification';
import { AdminSources } from './pages/admin/AdminSources';
import { AdminChanges } from './pages/admin/AdminChanges';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAudit } from './pages/admin/AdminAudit';

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') ?? 'dark',
  );
  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem('ai_discover_theme', next);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  const links = [
    { to: '/explore', label: 'Explore' },
    { to: '/websites', label: 'Websites' },
    { to: '/models', label: 'Models' },
    { to: '/recommend', label: 'Recommend' },
    { to: '/compare', label: 'Compare' },
    { to: '/search', label: 'Search' },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button
          type="button"
          className="btn btn-ghost btn-sm menu-button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <Link to="/" className="brand">
          <span className="brand-mark">AI</span>Discovery
        </Link>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`} aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/submit"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Submit
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </NavLink>
          )}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          {user ? (
            <>
              <NavLink to="/favorites" className="nav-link">
                ♥ Saved
              </NavLink>
              <NavLink to="/profile" className="nav-link">
                {user.displayName ?? user.email}
              </NavLink>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                Log in
              </NavLink>
              <Button size="sm" onClick={() => navigate('/signup')}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <p>
            <strong>AI Discovery</strong> — find the right AI for your goal.
          </p>
          <div className="footer-links">
            <Link to="/explore">Explore</Link>
            <Link to="/recommend">Get recommendations</Link>
            <Link to="/submit">Submit a listing</Link>
            <Link to="/search">Search</Link>
          </div>
        </div>
        <p className="footer-note">
          Data is verified against official sources where marked VERIFIED. Items
          marked DEMO are fictional sample data for evaluation only.
        </p>
      </div>
    </footer>
  );
}

function Layout() {
  return (
    <>
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <LeavingSiteProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="explore" element={<Explore />} />
                <Route path="websites" element={<Websites />} />
                <Route path="websites/:slug" element={<WebsiteDetail />} />
                <Route path="models" element={<Models />} />
                <Route path="models/:slug" element={<ModelDetail />} />
                <Route path="categories/:slug" element={<CategoryDetail />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="recommend" element={<RecommendPage />} />
                <Route path="stack/:id" element={<StackDetail />} />
                <Route path="profile" element={<Profile />} />
                <Route path="favorites" element={<Favorites />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
                <Route path="submit" element={<Submit />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="websites" element={<AdminWebsites />} />
                  <Route path="models" element={<AdminModels />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="plans" element={<AdminPlans />} />
                  <Route path="pricing" element={<AdminPricing />} />
                  <Route path="submissions" element={<AdminSubmissions />} />
                  <Route path="verification" element={<AdminVerification />} />
                  <Route path="sources" element={<AdminSources />} />
                  <Route path="changes" element={<AdminChanges />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="audit" element={<AdminAudit />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </LeavingSiteProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="empty-state-block">
      <p className="empty-state-title">Page not found</p>
      <p className="empty-state-hint">
        The page you are looking for does not exist. <Link to="/">Go home</Link>.
      </p>
    </div>
  );
}
