import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Building2, QrCode, Smartphone, Users, DollarSign, 
  CheckCircle2, ArrowRight, Sparkles, ChevronDown, ChevronUp,
  Download, Lock, ShieldCheck, Play, Pause, ChevronLeft, ChevronRight,
  MapPin, Check, Sliders, Calendar, Shield, Settings, Plus, FileText, 
  Radio, Wifi, UserCheck, HelpCircle, ArrowUpRight, Zap
} from 'lucide-react';
import squarespaceHeroBg from '../../assets/squarespace_hero_bg.jpg';
import './Website.css';

export default function Website() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Active section tracking for the sticky pill sub-nav
  const [activeSubNav, setActiveSubNav] = useState('templates');

  // Sticky subnav visibility
  const [isScrolled, setIsScrolled] = useState(false);

  // Horizontal Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Nav Dropdowns
  const [openNavDropdown, setOpenNavDropdown] = useState(null);

  // Live IST Clock
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Interactive Live Simulator in Hero
  const [punchState, setPunchState] = useState({
    clockedIn: false,
    timestamp: null,
    location: 'Bengaluru Tech Park (HQ)'
  });

  // Interactive Checkboxes in Feature Directory
  const [checkedTeams, setCheckedTeams] = useState({
    ops: true,
    eng: true,
    hr: false
  });

  // Interactive Payroll Tab in Section 3
  const [selectedTaxPill, setSelectedTaxPill] = useState('EPF');

  // Interactive ROI Calculator State
  const [employeeCount, setEmployeeCount] = useState(120);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // QR Modal for Phone Download
  const [showQrModal, setShowQrModal] = useState(false);

  // Live Clock Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carousel slides data
  const carouselSlides = [
    {
      id: 'qr-standee',
      tag: 'Contactless Check-In',
      title: 'Office QR Standee & Geofencing',
      desc: 'Hardware-free attendance with rotating dynamic QR codes & sub-10m GPS perimeter.',
      bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      accentColor: '#10b981',
      badgeText: 'Live Station #01',
      stats: '0.8s Scan Speed • 99.8% Punctual',
      icon: <QrCode size={24} color="#fff" />
    },
    {
      id: 'payroll-engine',
      tag: 'Indian Statutory V2',
      title: '1-Click Compliant Indian Payroll',
      desc: 'Automate EPF (12%), ESIC, State PT slabs, and TDS deductions linked directly to live muster roll.',
      bg: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
      accentColor: '#f43f5e',
      badgeText: '100% Tax Compliant',
      stats: 'LOP Auto-Deducted • Batch PDF Slips',
      icon: <DollarSign size={24} color="#fff" />
    },
    {
      id: 'mobile-portal',
      tag: 'Android APK & PWA',
      title: 'Mobile Employee Self-Service',
      desc: 'Instant leave applications, camera QR punch-in, payslip downloads, and persistent 365-day login.',
      bg: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
      accentColor: '#6366f1',
      badgeText: 'Persistent Login',
      stats: 'Camera Permission • Offline Cache',
      icon: <Smartphone size={24} color="#fff" />
    },
    {
      id: 'shift-roster',
      tag: 'Operations & Planner',
      title: 'Rotational Shifts & Multi-Branch',
      desc: 'Create custom shifts (Day, Evening, Night), assign branch geofences, and manage leave balances.',
      bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
      accentColor: '#10b981',
      badgeText: 'Multi-Branch Active',
      stats: '42 Branches • Unlimited Rosters',
      icon: <Calendar size={24} color="#fff" />
    },
    {
      id: 'rbac-security',
      tag: 'Enterprise Security',
      title: '7-Tier RBAC & Audit Trails',
      desc: 'Granular roles: Super Admin, Org Admin, HR Admin, Manager, Payroll Manager, Finance, and Employee.',
      bg: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
      accentColor: '#f59e0b',
      badgeText: 'ISO 27001 Aligned',
      stats: 'TLS 1.3 Encrypted • Audit Trails',
      icon: <ShieldCheck size={24} color="#fff" />
    }
  ];

  // Auto-play timer for carousel
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, carouselSlides.length]);

  // Scroll listener for sticky sub-nav
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 380);

      // Section tracker
      const sections = ['templates', 'features', 'marketing', 'roi', 'faq'];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSubNav(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll
  const scrollTo = (id) => {
    setActiveSubNav(id);
    setOpenNavDropdown(null);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Simulate punch in hero
  const handleSimulatePunch = () => {
    if (punchState.clockedIn) {
      setPunchState({
        clockedIn: false,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        location: 'Bengaluru Tech Park (HQ)'
      });
    } else {
      setPunchState({
        clockedIn: true,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        location: 'Bengaluru Tech Park (HQ)'
      });
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
    if (roles.includes('SUPER_ADMIN')) return '/platform/dashboard';
    const isOnlyEmployee = roles.includes('EMPLOYEE') && 
      !roles.includes('ORG_ADMIN') && 
      !roles.includes('HR_ADMIN') && 
      !roles.includes('MANAGER') &&
      !roles.includes('PAYROLL_MANAGER') &&
      !roles.includes('FINANCE');
    if (isOnlyEmployee) return '/app/employee/dashboard';
    return '/app/dashboard';
  };

  // FAQ List
  const faqList = [
    {
      q: 'How does the Contactless QR Standee work without biometric machines?',
      a: 'Admins download and print an office QR standee from the HRMS portal to place at entrances. When employees arrive, they open the JMK HRMS mobile app and scan the code. The system cross-references the QR token with the employee\'s verified GPS coordinates (within a 50m office radius) and office network, validating attendance in under 3 seconds with zero hardware cost.'
    },
    {
      q: 'Does the mobile application require repeated logins every day?',
      a: 'No. The app uses secure long-lived enterprise tokens (persistent 365-day sessions). Once an employee logs in on their personal smartphone, they remain logged in even after phone reboots or days of inactivity, until they explicitly choose to sign out.'
    },
    {
      q: 'How does Payroll V2 handle Indian statutory taxes, PF, and ESI?',
      a: 'JMK HRMS features pre-configured Indian statutory deduction rules: Employee Provident Fund (EPF 12% subject to wage ceiling), Employee State Insurance (ESIC 0.75% / 3.25%), state-specific Professional Tax (PT slabs), and TDS calculations. Loss-of-Pay (LOP) is automatically deduced from actual attendance without manual spreadsheet imports.'
    },
    {
      q: 'Can employees use their mobile camera to scan the office standee?',
      a: 'Yes. The JMK HRMS mobile app includes native camera integration. When opening the punch screen, the app requests standard camera and location permissions. Once granted, scanning is instant. In case an employee scans via a normal phone camera, the QR directs them straight to the portal and app download page.'
    },
    {
      q: 'Can multi-branch and rotational shift rosters be managed centrally?',
      a: 'Yes. Organizations can configure unlimited branch locations with custom geofences and assign employees to rotating day, evening, or night shifts. Attendance punches are automatically matched against the employee’s active shift to compute overtime, half-days, or grace-period late marks.'
    },
    {
      q: 'Where do employees download the Android mobile app?',
      a: 'Employees can download the official production APK directly from the HRMS website navigation and footer by clicking "Download Mobile App" or visiting /jmk-hrms.apk. iOS users can also add the portal to their home screen with full PWA functionality.'
    }
  ];

  return (
    <div className="sq-page-root">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP GLOBAL NAVIGATION (Matches Screenshot 1)
          Interactive Frosted Mega-Menus on Dropdown Hover/Click
          ───────────────────────────────────────────────────────────── */}
      <header className="sq-top-nav">
        <div className="sq-nav-wrapper">
          
          {/* Logo on Left */}
          <Link to="/" className="sq-brand-link">
            <span className="sq-brand-icon">
              <Building2 size={22} strokeWidth={2.4} />
            </span>
            <span className="sq-brand-name">JMK HRMS</span>
          </Link>

          {/* Center Dropdown Links */}
          <nav className="sq-center-menu">
            
            {/* Modules Dropdown */}
            <div 
              className="sq-dropdown-wrapper"
              onMouseEnter={() => setOpenNavDropdown('modules')}
              onMouseLeave={() => setOpenNavDropdown(null)}
            >
              <button 
                type="button" 
                className="sq-menu-item"
                onClick={() => setOpenNavDropdown(openNavDropdown === 'modules' ? null : 'modules')}
              >
                <span>MODULES</span>
                <ChevronDown size={14} className={openNavDropdown === 'modules' ? 'sq-caret-up' : ''} />
              </button>

              {openNavDropdown === 'modules' && (
                <div className="sq-dropdown-menu">
                  <div className="sq-dropdown-item" onClick={() => scrollTo('templates')}>
                    <QrCode size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Smart QR Standee</strong>
                      <p>Hardware-free lobby check-in & GPS geofencing</p>
                    </div>
                  </div>
                  <div className="sq-dropdown-item" onClick={() => scrollTo('marketing')}>
                    <DollarSign size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Automated Payroll V2</strong>
                      <p>1-Click Indian EPF, ESIC, PT, and TDS runs</p>
                    </div>
                  </div>
                  <div className="sq-dropdown-item" onClick={() => scrollTo('features')}>
                    <Calendar size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Shift & Leave Planner</strong>
                      <p>Rotational rosters and multi-tier approval chains</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div 
              className="sq-dropdown-wrapper"
              onMouseEnter={() => setOpenNavDropdown('solutions')}
              onMouseLeave={() => setOpenNavDropdown(null)}
            >
              <button 
                type="button" 
                className="sq-menu-item"
                onClick={() => setOpenNavDropdown(openNavDropdown === 'solutions' ? null : 'solutions')}
              >
                <span>SOLUTIONS</span>
                <ChevronDown size={14} className={openNavDropdown === 'solutions' ? 'sq-caret-up' : ''} />
              </button>

              {openNavDropdown === 'solutions' && (
                <div className="sq-dropdown-menu">
                  <div className="sq-dropdown-item" onClick={() => scrollTo('features')}>
                    <ShieldCheck size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Zero Ghost Attendance</strong>
                      <p>Prevent proxy clock-ins with dynamic encryption</p>
                    </div>
                  </div>
                  <div className="sq-dropdown-item" onClick={() => scrollTo('features')}>
                    <MapPin size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Multi-Branch Deployment</strong>
                      <p>Central muster roll across 100+ branches</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div 
              className="sq-dropdown-wrapper"
              onMouseEnter={() => setOpenNavDropdown('resources')}
              onMouseLeave={() => setOpenNavDropdown(null)}
            >
              <button 
                type="button" 
                className="sq-menu-item"
                onClick={() => setOpenNavDropdown(openNavDropdown === 'resources' ? null : 'resources')}
              >
                <span>RESOURCES</span>
                <ChevronDown size={14} className={openNavDropdown === 'resources' ? 'sq-caret-up' : ''} />
              </button>

              {openNavDropdown === 'resources' && (
                <div className="sq-dropdown-menu">
                  <a href="/jmk-hrms.apk" download className="sq-dropdown-item">
                    <Download size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Download Android APK</strong>
                      <p>Direct download for employees and managers</p>
                    </div>
                  </a>
                  <div className="sq-dropdown-item" onClick={() => scrollTo('roi')}>
                    <Sliders size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Workforce ROI Calculator</strong>
                      <p>Calculate your team's operational time saved</p>
                    </div>
                  </div>
                  <div className="sq-dropdown-item" onClick={() => scrollTo('faq')}>
                    <HelpCircle size={18} className="sq-dropdown-icon" />
                    <div>
                      <strong>Help & FAQ</strong>
                      <p>Guidance on standees, camera permissions & tax</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </nav>

          {/* Right Action CTAs - Single Clean Sign In button */}
          <div className="sq-right-actions">
            {user ? (
              <button 
                type="button" 
                className="sq-btn-get-started"
                onClick={() => navigate(getDashboardPath())}
              >
                DASHBOARD
              </button>
            ) : (
              <button 
                type="button" 
                className="sq-btn-get-started"
                onClick={() => navigate('/login')}
              >
                SIGN IN
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          STICKY FLOATING SUB-NAV PILL BAR (Matches Screenshot 2, 3, 4, 5)
          Appears pinned when scrolling past the hero
          ───────────────────────────────────────────────────────────── */}
      <div className={`sq-sticky-subnav ${isScrolled ? 'is-visible' : ''}`}>
        <div className="sq-subnav-container">
          
          {/* Left Pill: Brand Name */}
          <div className="sq-subnav-left-pill" onClick={() => scrollTo('hero')}>
            <Building2 size={16} />
            <span>JMK WORKFORCE</span>
          </div>

          {/* Center Pill: Navigation Tabs */}
          <div className="sq-subnav-center-pill">
            <button 
              type="button" 
              className={`sq-subnav-tab ${activeSubNav === 'templates' ? 'is-active' : ''}`}
              onClick={() => scrollTo('templates')}
            >
              Templates
            </button>
            <button 
              type="button" 
              className={`sq-subnav-tab ${activeSubNav === 'features' ? 'is-active' : ''}`}
              onClick={() => scrollTo('features')}
            >
              Features
            </button>
            <button 
              type="button" 
              className={`sq-subnav-tab ${activeSubNav === 'marketing' ? 'is-active' : ''}`}
              onClick={() => scrollTo('marketing')}
            >
              Payroll
            </button>
            <button 
              type="button" 
              className={`sq-subnav-tab ${activeSubNav === 'roi' ? 'is-active' : ''}`}
              onClick={() => scrollTo('roi')}
            >
              Savings
            </button>
            <button 
              type="button" 
              className={`sq-subnav-tab ${activeSubNav === 'faq' ? 'is-active' : ''}`}
              onClick={() => scrollTo('faq')}
            >
              FAQ
            </button>
          </div>

          {/* Right Pill: Sign In */}
          <button 
            type="button" 
            className="sq-subnav-right-pill"
            onClick={() => navigate('/login')}
          >
            SIGN IN
          </button>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Matches Screenshot 1)
          Full-Bleed Person on Suede Couch Background
          Centered Editorial Headline + GET STARTED Button + Sub-nav Pill
          ───────────────────────────────────────────────────────────── */}
      <section id="hero" className="sq-hero-screen" style={{ backgroundImage: `url(${squarespaceHeroBg})` }}>
        <div className="sq-hero-dark-overlay"></div>

        <div className="sq-hero-center-content">
          
          {/* Serif Eyebrow */}
          <p className="sq-hero-eyebrow-serif">Intelligent Workforce OS</p>

          {/* Giant Clean Headline */}
          <h1 className="sq-hero-giant-title">
            Run workforce operations that impress
          </h1>

          {/* White Rectangular Pill Button */}
          <button 
            type="button" 
            className="sq-hero-cta-btn"
            onClick={() => navigate('/login')}
          >
            GET STARTED
          </button>

          {/* Floating Dark Pill Sub-nav directly below CTA */}
          <div className="sq-hero-floating-pill">
            <button type="button" onClick={() => scrollTo('templates')}>Templates</button>
            <button type="button" onClick={() => scrollTo('features')}>Features</button>
            <button type="button" onClick={() => scrollTo('marketing')}>Payroll</button>
            <button type="button" onClick={() => scrollTo('roi')}>Savings</button>
            <button type="button" onClick={() => scrollTo('selling')}>Mobile App</button>
          </div>

          {/* Subtle Live Clock & Telemetry Bar below Pill */}
          <div className="sq-hero-telemetry-badge">
            <span className="sq-live-pulse-dot"></span>
            <span>{currentDate} • {currentTime || '09:30:00 AM IST'}</span>
            <span className="sq-telemetry-sep">•</span>
            <button 
              type="button" 
              className="sq-sim-mini-btn"
              onClick={handleSimulatePunch}
            >
              {punchState.clockedIn ? `✓ Clocked In (${punchState.timestamp})` : 'Simulate Office Punch'}
            </button>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. SECTION 1: TEMPLATES / AUTOMATED SLIDER (Matches Screenshot 2)
          Background: Pure White (#ffffff)
          Horizontal Carousel with Play/Pause, (< >) Arrows & Indicators
          ───────────────────────────────────────────────────────────── */}
      <section id="templates" className="sq-templates-section">
        <div className="sq-section-container">
          
          {/* Top Bar of Section */}
          <div className="sq-templates-header">
            <h2 className="sq-templates-title">
              Start with an enterprise-ready HRMS template
            </h2>

            <button 
              type="button" 
              className="sq-btn-ai-builder"
              onClick={() => navigate('/login')}
            >
              <Sparkles size={16} />
              <span>DEPLOY WORKSPACE WITH 1-CLICK</span>
            </button>
          </div>

          {/* Horizontal Sliding Carousel */}
          <div className="sq-carousel-viewport">
            <div 
              className="sq-carousel-track"
              style={{ transform: `translateX(-${currentSlide * 380}px)` }}
            >
              {carouselSlides.map((slide, idx) => (
                <div 
                  key={slide.id} 
                  className={`sq-carousel-card ${currentSlide === idx ? 'is-selected' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                >
                  <div className="sq-slide-visual" style={{ background: slide.bg }}>
                    {/* Visual UI inside card */}
                    <div className="sq-slide-card-header">
                      <span className="sq-slide-badge" style={{ color: slide.accentColor }}>
                        {slide.badgeText}
                      </span>
                      <span className="sq-slide-icon">
                        {slide.icon}
                      </span>
                    </div>

                    <div className="sq-slide-center-display">
                      <h4 className="sq-slide-display-title">{slide.title}</h4>
                      <p className="sq-slide-display-stats">{slide.stats}</p>
                    </div>

                    <div className="sq-slide-pill-tag">
                      <span>{slide.tag}</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>

                  <div className="sq-slide-meta">
                    <span className="sq-slide-tag-label">{slide.tag}</span>
                    <h3 className="sq-slide-title">{slide.title}</h3>
                    <p className="sq-slide-desc">{slide.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Controls (Play/Pause, Prev/Next Arrows & Indicators) */}
          <div className="sq-carousel-controls">
            <div className="sq-carousel-left-controls">
              
              {/* Play/Pause Button */}
              <button 
                type="button" 
                className="sq-btn-ctrl-circle"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              {/* Prev Arrow */}
              <button 
                type="button" 
                className="sq-btn-ctrl-circle"
                onClick={() => setCurrentSlide(prev => (prev === 0 ? carouselSlides.length - 1 : prev - 1))}
                aria-label="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Next Arrow */}
              <button 
                type="button" 
                className="sq-btn-ctrl-circle"
                onClick={() => setCurrentSlide(prev => (prev + 1) % carouselSlides.length)}
                aria-label="Next slide"
              >
                <ChevronRight size={16} />
              </button>

              {/* Progress Pagination Indicators */}
              <div className="sq-carousel-dots">
                {carouselSlides.map((_, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    className={`sq-carousel-dot ${currentSlide === idx ? 'is-active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <button 
              type="button" 
              className="sq-btn-view-all"
              onClick={() => scrollTo('features')}
            >
              <span>VIEW ALL</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. SECTION 2: FEATURES GRID (Matches Screenshot 3)
          Background: Warm Dark Espresso (#271b12 / #34281D)
          2-Column Asymmetric Cards with Floating Directory UI
          ───────────────────────────────────────────────────────────── */}
      <section id="features" className="sq-espresso-section">
        <div className="sq-section-container">
          
          {/* Section Header Split */}
          <div className="sq-espresso-header">
            <h2 className="sq-espresso-title">
              Manage your workforce with a custom portal
            </h2>

            <div className="sq-espresso-header-right">
              <p className="sq-espresso-sub">
                Automate daily attendance, shift rosters, and employee records in a seamless, hardware-free cloud workspace.
              </p>
            </div>
          </div>

          {/* 2-Column Cards Grid */}
          <div className="sq-features-grid">
            
            {/* Left Tall Card: Directory & Roster (Copper Gradient with Floating White UI) */}
            <div className="sq-feature-card sq-copper-card">
              <div className="sq-feature-card-text">
                <h3 className="sq-card-headline">Customizable for every shift and team</h3>
                <p className="sq-card-paragraph">
                  Configure multi-branch perimeters, rotating rosters, and department policies. Once created, deploy instantly across all branches.
                </p>
              </div>

              {/* Floating White UI Directory Mockup (Interactive Checkboxes!) */}
              <div className="sq-floating-white-card">
                <div className="sq-fcard-header">
                  <span className="sq-fcard-title">Workforce Directory</span>
                  <div className="sq-fcard-icons">
                    <Settings size={18} />
                    <Plus size={18} />
                  </div>
                </div>

                <div className="sq-fcard-list">
                  <div 
                    className="sq-fcard-row"
                    onClick={() => setCheckedTeams(p => ({ ...p, ops: !p.ops }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`sq-fcard-checkbox ${checkedTeams.ops ? 'checked' : ''}`}>
                      {checkedTeams.ops && <Check size={12} color="#fff" />}
                    </div>
                    <div className="sq-fcard-thumb sq-thumb-ops"></div>
                    <div className="sq-fcard-info">
                      <strong>Operations & Fleet</strong>
                      <span>Active • 42 Staff (Shift: Morning A)</span>
                    </div>
                    <span className="sq-fcard-dots">• • •</span>
                  </div>

                  <div 
                    className="sq-fcard-row"
                    onClick={() => setCheckedTeams(p => ({ ...p, eng: !p.eng }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`sq-fcard-checkbox ${checkedTeams.eng ? 'checked' : ''}`}>
                      {checkedTeams.eng && <Check size={12} color="#fff" />}
                    </div>
                    <div className="sq-fcard-thumb sq-thumb-eng"></div>
                    <div className="sq-fcard-info">
                      <strong>Engineering & Product</strong>
                      <span>Active • 68 Staff (Shift: General 9-6)</span>
                    </div>
                    <span className="sq-fcard-dots">• • •</span>
                  </div>

                  <div 
                    className="sq-fcard-row"
                    onClick={() => setCheckedTeams(p => ({ ...p, hr: !p.hr }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`sq-fcard-checkbox ${checkedTeams.hr ? 'checked' : ''}`}>
                      {checkedTeams.hr && <Check size={12} color="#fff" />}
                    </div>
                    <div className="sq-fcard-thumb sq-thumb-hr"></div>
                    <div className="sq-fcard-info">
                      <strong>HR, Finance & Legal</strong>
                      <span>Active • 14 Staff (Shift: Flexible)</span>
                    </div>
                    <span className="sq-fcard-dots">• • •</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Stacked Column (Two Cards) */}
            <div className="sq-right-stacked-col">
              
              {/* Card 1: Contactless Standee QR */}
              <div className="sq-feature-card sq-dark-card">
                <div className="sq-feature-card-text">
                  <h3 className="sq-card-headline">Hardware-free contactless QR standee</h3>
                  <p className="sq-card-paragraph">
                    Print lobby standees and let employees check in using their phone camera with sub-10m GPS geofencing.
                  </p>
                </div>

                {/* Standee UI Box with Dynamic Pulsing Radar */}
                <div className="sq-standee-mini-box">
                  <div className="sq-standee-radar-circle">
                    <QrCode size={34} color="#ffffff" />
                  </div>
                  <div className="sq-standee-box-text">
                    <span className="sq-tag-green">✓ GPS Geofence: 50m Active (0 Buddy-Punches)</span>
                    <strong style={{ color: '#fff', fontSize: '13px' }}>Station BLR-HQ • Central Entrance Standee</strong>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'block' }}>
                      Rotating dynamic QR token (Refreshes every 15s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Automated Muster Roll & Overtime */}
              <div className="sq-feature-card sq-dark-card">
                <div className="sq-feature-card-text">
                  <h3 className="sq-card-headline">Automated muster rolls & overtime sync</h3>
                  <p className="sq-card-paragraph">
                    Punches automatically reconcile against active shift schedules to mark on-time, half-day, or overtime hours.
                  </p>
                </div>

                {/* Overtime & Roster UI Pill */}
                <div className="sq-roster-pill-preview">
                  <div className="sq-rpill-item">
                    <span className="sq-rpill-num">1,248</span>
                    <span className="sq-rpill-lbl">Present Today</span>
                  </div>
                  <div className="sq-rpill-divider"></div>
                  <div className="sq-rpill-item">
                    <span className="sq-rpill-num" style={{ color: '#10b981' }}>98.4%</span>
                    <span className="sq-rpill-lbl">On-Time Rate</span>
                  </div>
                  <div className="sq-rpill-divider"></div>
                  <div className="sq-rpill-item">
                    <span className="sq-rpill-num" style={{ color: '#f59e0b' }}>18</span>
                    <span className="sq-rpill-lbl">On Leave</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. SECTION 3: MARKETING / PAYROLL & COMPLIANCE (Matches Screenshot 4)
          Background: Warm Dark Espresso (#271b12)
          2-Column Cards with Floating Interactive Payslip
          ───────────────────────────────────────────────────────────── */}
      <section id="marketing" className="sq-espresso-section sq-payroll-section">
        <div className="sq-section-container">
          
          {/* Section Header Split */}
          <div className="sq-espresso-header">
            <h2 className="sq-espresso-title">
              Tools to streamline payroll and compliance
            </h2>

            <div className="sq-espresso-header-right">
              <p className="sq-espresso-sub">
                Automate statutory deductions, generate batch payslips, and disburse salaries accurately every single month.
              </p>
            </div>
          </div>

          {/* 2-Column Cards */}
          <div className="sq-marketing-grid">
            
            {/* Left Card: Statutory Tax Computation */}
            <div className="sq-feature-card sq-dark-card sq-card-with-payslip">
              <div className="sq-feature-card-text">
                <h3 className="sq-card-headline">Statutory Indian tax computation</h3>
                <p className="sq-card-paragraph">
                  Pre-configured EPF (12%), ESIC, State Professional Tax (PT), and TDS deductions linked directly to live attendance.
                </p>
              </div>

              {/* Payslip Voucher Preview (Matching Screenshot 4) */}
              <div className="sq-payslip-mock-card">
                <div className="sq-payslip-top-label">JMK HRMS • OFFICIAL PAYSLIP DISBURSEMENT</div>
                <div className="sq-payslip-giant-title">MONTHLY SALARY RUN</div>
                
                <div className="sq-payslip-rows">
                  <div className="sq-prow">
                    <span>Gross CTC Earnings (Basic + HRA + Special)</span>
                    <strong>₹82,000</strong>
                  </div>
                  <div className="sq-prow sq-deduct">
                    <span>Employee PF (EPF 12% statutory)</span>
                    <strong>−₹1,800</strong>
                  </div>
                  <div className="sq-prow sq-deduct">
                    <span>Professional Tax (State PT)</span>
                    <strong>−₹200</strong>
                  </div>
                  <div className="sq-prow sq-deduct">
                    <span>TDS Deductions (Form 16 Slabs)</span>
                    <strong>−₹4,120</strong>
                  </div>
                </div>

                <div className="sq-payslip-net-bar">
                  <span>Net Disbursable Salary</span>
                  <strong>₹75,880.00</strong>
                </div>
              </div>
            </div>

            {/* Right Card: Instant Payslip Dispatch & Tools */}
            <div className="sq-feature-card sq-copper-card">
              <div className="sq-feature-card-text">
                <h3 className="sq-card-headline">Instant payslip dispatch & reports</h3>
                <p className="sq-card-paragraph">
                  Employees download PDF payslips directly in the mobile app, with comprehensive Form 16 and bank transfer sheets for finance.
                </p>
              </div>

              {/* Interactive Statutory Toolbar (Screenshot 4 Right) */}
              <div className="sq-tools-floating-cluster">
                <div className="sq-floating-toolbar">
                  <button 
                    type="button" 
                    className={`sq-tool-icon ${selectedTaxPill === 'EPF' ? 'is-active' : ''}`}
                    onClick={() => setSelectedTaxPill('EPF')}
                  >
                    EPF 12%
                  </button>
                  <button 
                    type="button" 
                    className={`sq-tool-icon ${selectedTaxPill === 'ESI' ? 'is-active' : ''}`}
                    onClick={() => setSelectedTaxPill('ESI')}
                  >
                    ESIC 0.75%
                  </button>
                  <button 
                    type="button" 
                    className={`sq-tool-icon ${selectedTaxPill === 'TDS' ? 'is-active' : ''}`}
                    onClick={() => setSelectedTaxPill('TDS')}
                  >
                    TDS Auto
                  </button>
                  <button 
                    type="button" 
                    className={`sq-tool-icon ${selectedTaxPill === 'PT' ? 'is-active' : ''}`}
                    onClick={() => setSelectedTaxPill('PT')}
                  >
                    PT Slabs
                  </button>
                </div>

                <div className="sq-floating-schedule-card">
                  <div className="sq-sched-thumb"></div>
                  <div className="sq-sched-text">
                    <strong>Auto-Disbursed at 10:00 AM on 1st of Month</strong>
                    <span>NEFT / RTGS Bank Transfer Sheet Generated Automatically</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. SECTION 4: INTERACTIVE SAVINGS / ROI CALCULATOR
          Seamlessly integrated in Warm Dark Espresso theme
          ───────────────────────────────────────────────────────────── */}
      <section id="roi" className="sq-espresso-section sq-roi-section">
        <div className="sq-section-container">
          
          <div className="sq-espresso-header">
            <h2 className="sq-espresso-title">
              Calculate your organization's operational savings
            </h2>

            <div className="sq-espresso-header-right">
              <p className="sq-espresso-sub">
                Slide your active employee headcount to see the monthly administrative hours saved and operational expenses eliminated.
              </p>
            </div>
          </div>

          <div className="sq-roi-calculator-box">
            
            {/* Slider */}
            <div className="sq-roi-slider-row">
              <div className="sq-roi-slider-meta">
                <span className="sq-roi-slider-label">Organization Team Size</span>
                <span className="sq-roi-slider-badge">{employeeCount} Employees</span>
              </div>

              <input 
                type="range"
                min="15"
                max="1000"
                step="5"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
                className="sq-espresso-range"
              />

              <div className="sq-roi-steps">
                <span>15 Staff</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span>1,000+ Enterprise</span>
              </div>
            </div>

            {/* Calculated Output Panels */}
            <div className="sq-roi-panels-grid">
              <div className="sq-roi-panel">
                <div className="sq-roi-num">{Math.round(employeeCount * 0.45)} hrs</div>
                <div className="sq-roi-lbl">Monthly HR Admin Hours Saved</div>
                <div className="sq-roi-hint">Zero manual muster roll data entry</div>
              </div>

              <div className="sq-roi-panel">
                <div className="sq-roi-num">&lt; 15 mins</div>
                <div className="sq-roi-lbl">Payroll Processing Turnaround</div>
                <div className="sq-roi-hint">Down from industry average of 4 days</div>
              </div>

              <div className="sq-roi-panel sq-roi-highlight">
                <div className="sq-roi-num" style={{ color: '#34d399' }}>
                  ₹{(employeeCount * 320 * 12).toLocaleString('en-IN')}
                </div>
                <div className="sq-roi-lbl">Estimated Annual Savings</div>
                <div className="sq-roi-hint">Zero hardware AMC + error prevention</div>
              </div>

              <div className="sq-roi-panel">
                <div className="sq-roi-num">99.8%</div>
                <div className="sq-roi-lbl">Dispute Resolution Rate</div>
                <div className="sq-roi-hint">Cryptographic GPS & timestamp proof</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. SECTION 5: DARK PITCH BLACK SHOWCASE (Matches Screenshot 5)
          Background: Pitch Black (#000000)
          Floating Pill Badges around Giant Headline + Download Button
          ───────────────────────────────────────────────────────────── */}
      <section id="selling" className="sq-black-showcase-section">
        <div className="sq-section-container sq-center-align">
          
          {/* Spinning / Pulsing Dot Icon */}
          <div className="sq-black-sparkle-dot">
            <span className="sq-dot-core"></span>
            <span className="sq-dot-halo"></span>
          </div>

          {/* Giant Title */}
          <h2 className="sq-black-title">
            Empower your entire workforce with the JMK HRMS Mobile App
          </h2>

          {/* Download APK and Phone Scan Action Row */}
          <div className="sq-black-cta-row">
            <a 
              href="/jmk-hrms.apk" 
              download="jmk-hrms.apk"
              className="sq-btn-outline-white-large"
            >
              <Download size={18} />
              <span>DOWNLOAD ANDROID APK</span>
            </a>

            <button 
              type="button" 
              className="sq-btn-scan-phone"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode size={18} />
              <span>SCAN ON PHONE</span>
            </button>
          </div>

          {/* Floating Pill Badges with Gentle Ambient Physics (Matches Screenshot 5) */}
          <div className="sq-floating-badge sq-pos-top-left sq-animate-float-1">
            <span>365-Day Persistent Login</span>
          </div>

          <div className="sq-floating-badge sq-pos-top-right sq-animate-float-2">
            <span>Offline Punch Caching</span>
          </div>

          <div className="sq-floating-badge sq-pos-mid-left sq-animate-float-3">
            <span>Sub-10m GPS Geofence</span>
          </div>

          <div className="sq-floating-badge sq-pos-mid-right sq-animate-float-1">
            <span>Camera QR Permission</span>
          </div>

          <div className="sq-floating-badge sq-pos-bottom-center sq-animate-float-2">
            <span>1-Tap Leave Approvals</span>
          </div>

          {/* Play/Pause control in bottom right */}
          <button 
            type="button" 
            className="sq-corner-pause-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label="Pause background animation"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FREQUENTLY ASKED QUESTIONS (Squarespace Clean Accordion)
          ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="sq-faq-section">
        <div className="sq-section-container sq-faq-inner">
          
          <div className="sq-faq-header">
            <span className="sq-faq-eyebrow">COMMON INQUIRIES</span>
            <h2 className="sq-faq-title">Frequently Asked Questions</h2>
            <p className="sq-faq-sub">
              Everything you need to know about setting up QR attendance, running payroll, and downloading the mobile app.
            </p>
          </div>

          <div className="sq-accordion">
            {faqList.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`sq-accordion-item ${isOpen ? 'is-open' : ''}`}>
                  <button 
                    type="button" 
                    className="sq-accordion-trigger"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="sq-accordion-question">{item.q}</span>
                    <span className="sq-accordion-icon">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="sq-accordion-content">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. CLEAN EDITORIAL FOOTER
          Background: Warm Dark Espresso (#160f0b)
          ───────────────────────────────────────────────────────────── */}
      <footer className="sq-editorial-footer">
        <div className="sq-section-container">
          
          <div className="sq-footer-columns">
            
            <div className="sq-fcol-brand">
              <div className="sq-brand-link">
                <Building2 size={20} />
                <span className="sq-brand-name">JMK HRMS</span>
              </div>
              <p className="sq-fcol-bio">
                The all-in-one operating system for contactless QR attendance, GPS geofencing, and automated Indian statutory payroll.
              </p>
              <div className="sq-fcol-status">
                <span className="sq-status-green-dot"></span>
                <span>All Systems Operational • 99.98% SLA</span>
              </div>
            </div>

            <div className="sq-fcol">
              <h4>MODULES</h4>
              <ul>
                <li><a onClick={() => scrollTo('templates')}>QR Standee Attendance</a></li>
                <li><a onClick={() => scrollTo('features')}>GPS Geofence Perimeter</a></li>
                <li><a onClick={() => scrollTo('marketing')}>Automated Indian Payroll</a></li>
                <li><a onClick={() => scrollTo('selling')}>Mobile Employee Self-Service</a></li>
              </ul>
            </div>

            <div className="sq-fcol">
              <h4>PLATFORM</h4>
              <ul>
                <li><a href="/jmk-hrms.apk" download>Download Android APK</a></li>
                <li><Link to="/download">iOS Safari Web App</Link></li>
                <li><Link to="/activate">Account Activation</Link></li>
                <li><a onClick={() => scrollTo('faq')}>Security & Architecture</a></li>
              </ul>
            </div>

            <div className="sq-fcol">
              <h4>ENTERPRISE SUPPORT</h4>
              <ul>
                <li><a href="mailto:hr.jattamkommerce@gmail.com">hr.jattamkommerce@gmail.com</a></li>
                <li><a onClick={() => scrollTo('roi')}>Workforce ROI Calculator</a></li>
                <li><a onClick={() => scrollTo('faq')}>FAQ & Help Center</a></li>
              </ul>
            </div>

          </div>

          <div className="sq-footer-bottom-line">
            <div>&copy; {new Date().getFullYear()} JMK HRMS. All rights reserved. • ISO 27001 & SOC-2 Aligned Architecture.</div>
            <div className="sq-fbottom-links">
              <span>Security</span>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          PHONE SCAN QR MODAL (Instant Mobile Download on Phone)
          ───────────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div className="sq-modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="sq-modal-card" onClick={e => e.stopPropagation()}>
            <div className="sq-modal-header">
              <h3>Scan with Phone Camera</h3>
              <button type="button" className="sq-modal-close" onClick={() => setShowQrModal(false)}>✕</button>
            </div>
            <p className="sq-modal-sub">
              Scan this QR code with your phone camera to download the <strong>JMK HRMS Android APK</strong> directly to your mobile device.
            </p>
            <div className="sq-modal-qr-frame">
              <QrCode size={180} color="#000000" />
            </div>
            <div className="sq-modal-footer">
              <a href="/jmk-hrms.apk" download="jmk-hrms.apk" className="sq-btn-modal-dl">
                <Download size={15} /> Direct Download APK (19.4 MB)
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
