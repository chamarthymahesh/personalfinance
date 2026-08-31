import { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import axios from 'axios';
import { LayoutDashboard, Receipt, ShieldCheck, TrendingUp, Landmark, Building2, PieChart, LogOut, User, ChevronLeft, ChevronRight, Settings, Bell, BarChart2, Home, Zap, Smartphone, Wifi, GraduationCap, CreditCard, Package, Mail, Shield, HeartPulse, Umbrella, HandCoins, Car, MoreHorizontal, PiggyBank, Plus } from 'lucide-react';
const Bills = lazy(() => import('./components/Bills'));
const Reports = lazy(() => import('./components/Reports'));
const SettingsPanel = lazy(() => import('./components/Settings'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DueAlerts = lazy(() => import('./components/DueAlerts'));
import './index.css';

import { API_URL } from './config';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('isAuthenticated') === 'true');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingPaymentBill, setPendingPaymentBill] = useState(null);
  const [stats, setStats] = useState({ bills: 0, investments: 0, loans: 0 });
  const [categories, setCategories] = useState([]);
  const [activeExpensesCount, setActiveExpensesCount] = useState({});

  useEffect(() => {
    setStats({
      bills: 45000,
      investments: 1200000,
      loans: 500000
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, expRes] = await Promise.all([
          axios.get(`${API_URL}/categories`, { timeout: 12000 }),
          axios.get(`${API_URL}/expenses`, { timeout: 12000 })
        ]);
        setCategories(catRes.data);

        // Fetch expenses to get counts for badges (active/unpaid records)
        const counts = {};
        expRes.data.forEach(exp => {
          if (exp.status === 'Unpaid') {
            counts[exp.category] = (counts[exp.category] || 0) + 1;
          }
        });
        setActiveExpensesCount(counts);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        // Retry after 3 seconds if it fails
        setTimeout(fetchData, 3000);
      }
    };
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleOpenPayment = (e) => {
      const bill = e.detail;
      const cat = categories.find(c => c.name === bill.category);
      if (cat) {
        setPendingPaymentBill(bill);
        setActiveTab(cat._id);
      }
    };

    const handleNavAlerts = () => setActiveTab('due-alerts');

    window.addEventListener('open-payment-modal-from-dashboard', handleOpenPayment);
    window.addEventListener('navigate-to-alerts', handleNavAlerts);
    
    return () => {
      window.removeEventListener('open-payment-modal-from-dashboard', handleOpenPayment);
      window.removeEventListener('navigate-to-alerts', handleNavAlerts);
    };
  }, [categories]);

const groupedCategories = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const mod = cat.module || 'expenses';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(cat);
      return acc;
    }, {});
  }, [categories]);
  const moduleNames = {
    expenses: 'FIXED BILLS',
    insurances: 'INSURANCE',
    investments: 'INVESTMENTS',
    loans: 'LOANS',
    properties: 'PROPERTY & FAMILY',
    credit_cards: 'CREDIT CARDS',
    other: 'OTHER',
    lending: 'LENDING & BORROWING',
    hand_loans: 'HAND LOANS'
  };

  const getSidebarIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('rent')) return <Home size={18} />;
    if (name.includes('electricity')) return <Zap size={18} />;
    if (name.includes('phone')) return <Smartphone size={18} />;
    if (name.includes('internet')) return <Wifi size={18} />;
    if (name.includes('school')) return <GraduationCap size={18} />;
    if (name.includes('card')) return <CreditCard size={18} />;
    if (name.includes('vehicle') || name.includes('car')) return <Car size={18} />;
    if (name.includes('loan') || name.includes('emi')) return <Landmark size={18} />;
    if (name.includes('health')) return <HeartPulse size={18} />;
    if (name.includes('postal')) return <Mail size={18} />;
    if (name.includes('term')) return <Umbrella size={18} />;
    if (name.includes('lic')) return <Shield size={18} />;
    if (name.includes('insurance')) return <ShieldCheck size={18} />;
    if (name.includes('fund') && name.includes('lump')) return <PiggyBank size={18} />;
    if (name.includes('fund') || name.includes('investment')) return <TrendingUp size={18} />;
    if (name.includes('property')) return <Building2 size={18} />;
    if (name.includes('interest')) return <HandCoins size={18} />;
    if (name.includes('hand loan')) return <HandCoins size={18} />;
    if (name.includes('chit')) return <PiggyBank size={18} />;
    if (name.includes('other')) return <MoreHorizontal size={18} />;
    return <Receipt size={18} />;
  };

  const handleNewEntry = () => {
    // Select the 'Other expenses' category or default to the first one available
    const targetCat = categories.find(c => c.name === 'Other expenses') || categories[0];
    if (targetCat) {
      setActiveTab(targetCat._id);
      setTimeout(() => window.dispatchEvent(new Event('open-new-entry')), 100);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Dashboard...</div>}><Dashboard onNewEntry={handleNewEntry} /></Suspense>;
      case 'due-alerts':
        return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Alerts...</div>}><DueAlerts /></Suspense>;
      case 'reports':
        return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Reports...</div>}><Reports /></Suspense>;
      case 'settings':
        return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Settings...</div>}><SettingsPanel /></Suspense>;
      default:
        // Check if the active tab is a category ID
        const category = categories.find(c => c._id === activeTab);
        if (category) {
          return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Bills...</div>}><Bills selectedCategory={category} pendingPaymentBill={pendingPaymentBill} clearPendingPayment={() => setPendingPaymentBill(null)} /></Suspense>;
        }
        return <Suspense fallback={<div style={{padding: '2rem'}}>Loading Bills...</div>}><Bills pendingPaymentBill={pendingPaymentBill} clearPendingPayment={() => setPendingPaymentBill(null)} /></Suspense>;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, loginForm);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: 'var(--bg-dark)', 
        backgroundImage: `radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%)`
      }}>
        <div className="glass-card" style={{width: '400px', padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
             <div className="sidebar-logo-icon" style={{width: '60px', height: '60px', fontSize: '2rem'}}>ख</div>
          </div>
          <h1 className="sidebar-logo" style={{fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--accent-secondary)', background: 'none', WebkitTextFillColor: 'initial'}}>The Ledger</h1>
          <p style={{color: 'var(--text-muted)', marginBottom: '2rem', fontFamily: 'Inter, sans-serif'}}>Personal finance register</p>
          
          <form onSubmit={handleLogin} style={{textAlign: 'left'}}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="text" className="form-input" required 
                value={loginForm.email} 
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} 
                placeholder="Enter your email" />
            </div>
            <div className="form-group" style={{marginBottom: '2rem'}}>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" required 
                value={loginForm.password} 
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
                placeholder="Enter your password" />
            </div>
            {loginError && <div style={{color: 'var(--accent-danger)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center'}}>{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '1rem', fontSize: '1rem'}}>Secure Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ '--sidebar-width': isSidebarCollapsed ? '80px' : '260px' }}>
      <aside className="sidebar">
        <div className="sidebar-logo-container" style={{justifyContent: isSidebarCollapsed ? 'center' : 'space-between'}}>
          {!isSidebarCollapsed && (
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <div className="sidebar-logo-icon">ख</div>
              <div>
                <h1 className="sidebar-logo">The Ledger</h1>
                <div className="sidebar-logo-sub">Personal finance register</div>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-sidebar)', borderRadius: '8px', padding: '0.25rem', color: 'var(--text-sidebar)', cursor: 'pointer', display: 'flex'}}
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <ul className="nav-links" style={{padding: '1rem 1rem 0'}}>
          <li className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'}}>
            <div className="nav-link-content">
              <LayoutDashboard size={18} />
              {!isSidebarCollapsed && <span>Dashboard</span>}
            </div>
          </li>
          <li className={`nav-link ${activeTab === 'due-alerts' ? 'active' : ''}`} onClick={() => setActiveTab('due-alerts')} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'}}>
            <div className="nav-link-content">
              <Bell size={18} />
              {!isSidebarCollapsed && <span>Due alerts</span>}
            </div>
          </li>
          <li className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'}}>
            <div className="nav-link-content">
              <BarChart2 size={18} />
              {!isSidebarCollapsed && <span>Reports</span>}
            </div>
          </li>
        </ul>

        {/* Dynamic Category Sections — scrollable area */}
        <div style={{flex: 1, overflowY: 'auto'}}>
          {['expenses', 'credit_cards', 'investments', 'insurances', 'lending', 'hand_loans', 'loans', 'properties', 'other'].map(mod => {
            const cats = groupedCategories[mod];
            if (!cats || cats.length === 0) return null;
            return (
              <div key={mod} className="sidebar-section">
                {!isSidebarCollapsed && <div className="sidebar-section-title">{moduleNames[mod] || mod}</div>}
                <ul className="nav-links">
                  {cats.map(cat => (
                    <li key={cat._id} className={`nav-link ${activeTab === cat._id ? 'active' : ''}`} onClick={() => setActiveTab(cat._id)} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'}}>
                      <div className="nav-link-content">
                        {getSidebarIcon(cat.name)}
                        {!isSidebarCollapsed && <span>{cat.name}</span>}
                      </div>
                      {!isSidebarCollapsed && activeExpensesCount[cat.name] > 0 && (
                        <span className="sidebar-badge">{activeExpensesCount[cat.name]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          
          <ul className="nav-links" style={{padding: '0'}}>
            <li className={`nav-link`} onClick={() => setActiveTab('settings')} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', color: 'var(--text-muted)'}}>
              <div className="nav-link-content">
                <Plus size={18} />
                {!isSidebarCollapsed && <span>Add new...</span>}
              </div>
            </li>
          </ul>
        </div>

        
        <ul className="nav-links" style={{padding: '1rem'}}>
          <li className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', borderTop: '1px solid var(--border-sidebar)', paddingTop: '1rem', marginTop: '0.5rem'}}>
            <div className="nav-link-content">
              <Settings size={18} />
              {!isSidebarCollapsed && <span>Admin Settings</span>}
            </div>
          </li>
        </ul>

        <div style={{
          marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          flexDirection: isSidebarCollapsed ? 'column' : 'row', gap: isSidebarCollapsed ? '1rem' : '0'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <User size={18} color="white" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div style={{fontSize: '0.875rem', fontWeight: '600', color: 'white', whiteSpace: 'nowrap'}}>Mahesh C.</div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap'}}>Premium User</div>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('isAuthenticated');
              setIsAuthenticated(false);
            }}
            style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem'}}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
