import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Moon, 
  Sun, 
  Eye, 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  Layers, 
  Landmark,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { PrototypeBadge } from './PrototypeBadge';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);

  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/', label: 'मुख्य पृष्ठ / HOME' },
    { path: '/exploration', label: 'EXPLORATION GIS', hasDropdown: true },
    { path: '/drill-planning', label: 'DRILL TARGETS' },
    { path: '/mine-twin', label: 'MINE TWIN' },
    { path: '/production', label: 'PRODUCTION' },
    { path: '/equipment', label: 'EQUIPMENT' },
    { path: '/decisions', label: 'DECISION CENTER' },
    { path: '/what-if', label: 'WHAT-IF SIMULATOR' },
    { path: '/field-survey', label: 'FIELD SURVEY' },
    { path: '/data-models', label: 'DATA & MODELS' },
    { path: '/security', label: 'SECURITY CENTER' },
    { path: '/contact', label: 'CONTACT' },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(item.path));

  return (
    <header className="w-full flex-shrink-0 z-50 bg-white border-b border-slate-200 shadow-sm relative font-sans">
      {/* 1. TOP UTILITY BAR */}
      <div className="bg-slate-100 text-slate-700 text-[11px] px-4 md:px-8 py-1 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="bg-[#1E3A8A] text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase">
            Govt of India PSU
          </span>
          <span className="hidden sm:inline text-slate-600">Ministry of Steel | MOIL Limited</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-700">
          {/* Dark / Light Toggle Icon */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 rounded-full hover:bg-slate-200 text-slate-800 transition-colors"
            title="Toggle Accessibility High Contrast"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-800" />}
          </button>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-300">
            <span className="text-[#1E3A8A] font-bold cursor-pointer hover:underline">हिन्दी</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-slate-900">Eng</span>
          </div>

          {/* Font Size Adjusters */}
          <div className="flex items-center gap-1 text-slate-800 border-r border-slate-300 pr-3 font-mono font-bold">
            <button onClick={() => setFontSize('small')} className={`px-1 rounded ${fontSize === 'small' ? 'bg-[#1E3A8A] text-white' : 'hover:bg-slate-200'}`}>A-</button>
            <button onClick={() => setFontSize('normal')} className={`px-1 rounded ${fontSize === 'normal' ? 'bg-[#1E3A8A] text-white' : 'hover:bg-slate-200'}`}>A</button>
            <button onClick={() => setFontSize('large')} className={`px-1 rounded ${fontSize === 'large' ? 'bg-[#1E3A8A] text-white' : 'hover:bg-slate-200'}`}>A+</button>
          </div>

          {/* Quick Links */}
          <span className="hidden md:inline hover:text-[#1E3A8A] cursor-pointer font-semibold">Skip To Main Content</span>
          <span className="hidden lg:inline hover:text-[#1E3A8A] cursor-pointer font-semibold flex items-center gap-1">
            <Eye className="w-3 h-3 text-[#1E3A8A]" />
            Screen Reader Access
          </span>
        </div>
      </div>

      {/* 2. MAIN HEADER BRANDING & NATIONAL EMBLEM */}
      <div className="px-4 md:px-8 py-3 bg-white flex items-center justify-between border-b border-slate-100">
        {/* Left: MOIL Logo & Tagline */}
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#003366] text-white flex flex-col items-center justify-center border-2 border-amber-400 shadow-md flex-shrink-0">
            <span className="text-[9px] font-extrabold tracking-tighter leading-none text-amber-300">मॉयल</span>
            <span className="text-[10px] font-black tracking-wider leading-none">MOIL</span>
          </div>
          <div>
            <h1 className="font-extrabold text-lg md:text-xl text-[#003366] tracking-tight leading-none font-serif">
              MOIL LIMITED
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              (A Government of India Enterprise)
            </p>
            <p className="text-[11px] font-bold text-slate-800 italic mt-0.5">
              Adding <span className="text-[#003366] font-black not-italic">Strength</span> to Steel
            </p>
          </div>
        </NavLink>

        {/* Center: Official National Emblem of India (Ashok Stambha) */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="w-10 h-12 flex flex-col items-center justify-center">
            <Landmark className="w-7 h-7 text-amber-700" />
            <span className="text-[9px] font-bold text-slate-800 tracking-widest uppercase mt-0.5 font-serif">
              सत्यमेव जयते
            </span>
          </div>
        </div>

        {/* Right: Search & Platform Tag */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col text-right">
            <div className="flex items-center gap-1 text-xs font-bold text-[#003366]">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>MnVision 360 GIS</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Balaghat Belt Operations</span>
          </div>

          <PrototypeBadge 
            type="badge" 
            isReal={['/', '/exploration', '/drill-planning', '/data-models'].some(p => location.pathname === p || location.pathname.startsWith('/exploration/'))} 
          />

          {/* Drawer Menu Button */}
          <button 
            onClick={() => setDrawerOpen(true)}
            className="p-2 bg-slate-100 hover:bg-[#003366] hover:text-white text-[#003366] rounded border border-slate-300 transition-colors"
            title="Open MOIL Portal Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. HORIZONTAL NAVIGATION BAR WITH DYNAMIC RBAC FILTERING */}
      <nav className="bg-white border-t border-b-2 border-[#003366] px-4 md:px-8 relative shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <ul className="flex items-center space-x-1 font-bold text-xs text-[#003366] uppercase tracking-wider py-0 whitespace-nowrap overflow-x-auto scrollbar-none">
            {visibleNavItems.map((item) => (
              <li 
                key={item.path}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setActiveMegaMenu('exploration')}
                onMouseLeave={() => item.hasDropdown && setActiveMegaMenu(null)}
              >
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => 
                    `inline-flex items-center gap-1 px-3.5 py-3 border-b-2 transition-colors ${
                      isActive ? 'border-[#003366] text-[#003366] font-extrabold bg-blue-50/50' : 'border-transparent hover:text-amber-700 hover:border-amber-500'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  {item.hasDropdown && <ChevronDown className="w-3 h-3 text-amber-600" />}
                </NavLink>

                {/* Mega-Menu Dropdown for Exploration */}
                {item.hasDropdown && activeMegaMenu === 'exploration' && (
                  <div className="absolute left-0 top-full bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 min-w-[500px] z-50 grid grid-cols-2 gap-6 normal-case text-slate-800 font-sans border-t-4 border-[#003366]">
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#003366] text-xs uppercase tracking-wider border-b pb-1">
                        GIS Map Layers
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline font-semibold block">Prospectivity Heatmap (XGBoost)</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">Sentinel-2 Optical Reflectance</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">Sentinel-1 C-band SAR</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">SRTM DEM Topography</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">GSI Sausar Lithology Contacts</NavLink></li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-[#003366] text-xs uppercase tracking-wider border-b pb-1">
                        AI & Validation
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li><NavLink to="/drill-planning" className="hover:text-[#003366] hover:underline font-semibold block">Drill Target AI Polygons</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">SpatialBlockCV Validation</NavLink></li>
                        <li><NavLink to="/exploration" className="hover:text-[#003366] hover:underline block">SHAP Explainability Engine</NavLink></li>
                        <li><NavLink to="/data-models" className="hover:text-[#003366] hover:underline block">Geospatial Dataset Registry</NavLink></li>
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* User Auth Profile Badge & Logout */}
          <div className="flex items-center gap-2 pl-4 text-xs">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right text-[11px]">
                  <span className="font-bold text-[#003366] leading-none flex items-center gap-1 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="JWT Active & Enforced" />
                    {user.username}
                  </span>
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase mt-0.5">
                    [{user.role}]
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1"
                  title="Sign Out & End Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="bg-[#003366] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-[#002244] transition flex items-center gap-1 border border-[#D4AF37] shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Login</span>
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* 4. SLIDE-OVER DRAWER MENU */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="w-80 md:w-96 bg-white/95 backdrop-blur-xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-xs">
                    MOIL
                  </div>
                  <div>
                    <h3 className="font-bold text-[#003366] text-sm font-serif">MOIL LIMITED</h3>
                    <p className="text-[10px] text-slate-500">Government of India Enterprise</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Portal Links */}
              <div className="space-y-3 font-semibold text-slate-800 text-xs">
                <p className="text-[10px] font-bold uppercase text-[#003366] tracking-wider">Quick PSU Portals</p>
                <NavLink to="/contact" onClick={() => setDrawerOpen(false)} className="block py-1.5 px-3 rounded hover:bg-blue-50 text-[#003366]">
                  कर्मचारी कल्याण / Employee Welfare
                </NavLink>
                <a href="https://www.moil.nic.in/public/home" target="_blank" rel="noreferrer" className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  निविदा / Tenders Portal
                </a>
                <NavLink to="/contact" onClick={() => setDrawerOpen(false)} className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  करियर / Careers & MOIL-Bharti
                </NavLink>
                <NavLink to="/exploration" onClick={() => setDrawerOpen(false)} className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  वर्तमान घटनाएं / Current Exploration Events
                </NavLink>
                <NavLink to="/contact" onClick={() => setDrawerOpen(false)} className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  जन शिकायत दर्ज करें / Public Grievance
                </NavLink>
                <NavLink to="/data-models" onClick={() => setDrawerOpen(false)} className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  आर्काइव डेटा / Archive Dataset Registry
                </NavLink>
                <a href="https://www.moil.nic.in/public/home" target="_blank" rel="noreferrer" className="block py-1.5 px-3 rounded hover:bg-blue-50 text-slate-700">
                  पर्यावरण रिपोर्ट / Environmental Reports
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono">
              MOIL Bhavan, Katol Road, Nagpur - 440013
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
