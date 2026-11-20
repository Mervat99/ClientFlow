
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserRound,
  BriefcaseBusiness,
  FileText,
  LogOut,
  Search,
  Plus,
  ArrowUpRight,
  Menu,
  X,
  Activity,
  Clock3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import Clients from './Clients';
import Employees from './Employees';
import Services from './Services';
import Requests from './Requests';
import Documents from './Documents';
import NotificationsBell from './NotificationsBell';

import { getDashboard } from './api';
import './App.css';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Requests', icon: ClipboardList },
  { label: 'Clients', icon: Users },
  { label: 'Employees', icon: UserRound },
  { label: 'Services', icon: BriefcaseBusiness },
  { label: 'Documents', icon: FileText },
];

const statusLabels = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_CLIENT: 'Waiting for Client',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function Dashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await getDashboard();
        setData(result);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          'Could not load dashboard data.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const totals = data?.totals || {};
  const statuses = data?.requestsByStatus || {};

  const stats = [
    {
      label: 'Total Clients',
      value: totals.clients ?? 0,
      icon: Users,
      color: 'purple',
      note: 'Registered clients',
    },
    {
      label: 'Total Employees',
      value: totals.employees ?? 0,
      icon: UserRound,
      color: 'blue',
      note: 'Team members',
    },
    {
      label: 'Active Services',
      value: totals.activeServices ?? 0,
      icon: BriefcaseBusiness,
      color: 'orange',
      note: 'Available services',
    },
    {
      label: 'Total Requests',
      value: totals.requests ?? 0,
      icon: ClipboardList,
      color: 'green',
      note: 'All submitted requests',
    },
  ];

  return (
    <div className="app-shell">
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">C</div>

          <div>
            <h2>ClientFlow</h2>
            <span>CRM WORKSPACE</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-icon">CF</div>

          <div>
            <strong>My Workspace</strong>
            <span>Management Portal</span>
          </div>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                activePage === label ? 'active' : ''
              }`}
              onClick={() => {
                setActivePage(label);
                setMobileOpen(false);
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">A</div>

            <div className="profile-info">
              <strong>Administrator</strong>
              <span>Admin account</span>
            </div>

            <button
              className="logout-icon"
              title="Logout"
              onClick={onLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>

          <div className="top-actions">
            <div className="top-search">
              <Search size={15} />
              <input placeholder="Search..." />
            </div>

            <NotificationsBell onNavigate={setActivePage} />

            <div className="top-avatar">A</div>
          </div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">
                {activePage === 'Dashboard'
                  ? 'OVERVIEW'
                  : 'WORKSPACE'}
              </p>

              <h1>{activePage}</h1>

              <p className="subtitle">
                Manage your workspace and monitor business activity.
              </p>
            </div>

            {activePage === 'Dashboard' && (
              <button
                className="primary-button"
                onClick={() => setActivePage('Requests')}
              >
                <Plus size={16} />
                New Request
              </button>
            )}
          </div>

          {activePage === 'Dashboard' ? (
            <>
              {loading && (
                <div className="panel empty-state">
                  Loading dashboard data...
                </div>
              )}

              {error && (
                <div className="panel empty-state">
                  <AlertCircle size={22} />
                  <p>{error}</p>

                  <button
                    className="primary-button"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="stats-grid">
                    {stats.map((stat) => {
                      const Icon = stat.icon;

                      return (
                        <div className="stat-card" key={stat.label}>
                          <div className="stat-top">
                            <span>{stat.label}</span>

                            <div className={`stat-icon ${stat.color}`}>
                              <Icon size={18} />
                            </div>
                          </div>

                          <h2>{stat.value}</h2>
                          <p>{stat.note}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="content-grid">
                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Requests Overview</h3>
                          <p>Current request status distribution</p>
                        </div>

                        <Activity size={19} color="#999cff" />
                      </div>

                      <div className="summary-list">
                        {Object.entries(statusLabels).map(
                          ([key, label]) => (
                            <div key={key}>
                              <span
                                className={`summary-icon ${
                                  key === 'COMPLETED'
                                    ? 'green-bg'
                                    : key === 'IN_PROGRESS'
                                      ? 'blue-bg'
                                      : key === 'WAITING_FOR_CLIENT'
                                        ? 'orange-bg'
                                        : 'purple-bg'
                                }`}
                              >
                                {key === 'COMPLETED' ? (
                                  <CheckCircle2 size={16} />
                                ) : key === 'IN_PROGRESS' ? (
                                  <Activity size={16} />
                                ) : key === 'WAITING_FOR_CLIENT' ? (
                                  <Clock3 size={16} />
                                ) : (
                                  <ClipboardList size={16} />
                                )}
                              </span>

                              {label}
                              <strong>{statuses[key] ?? 0}</strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="summary-footer">
                        <span>Total requests</span>
                        <strong>{totals.requests ?? 0}</strong>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Workspace Summary</h3>
                          <p>System statistics</p>
                        </div>

                        <ArrowUpRight
                          size={18}
                          color="#999cff"
                        />
                      </div>

                      <div className="summary-list">
                        <div>
                          <span className="summary-icon blue-bg">
                            <Users size={16} />
                          </span>
                          Clients
                          <strong>{totals.clients ?? 0}</strong>
                        </div>

                        <div>
                          <span className="summary-icon purple-bg">
                            <UserRound size={16} />
                          </span>
                          Employees
                          <strong>{totals.employees ?? 0}</strong>
                        </div>

                        <div>
                          <span className="summary-icon orange-bg">
                            <BriefcaseBusiness size={16} />
                          </span>
                          Services
                          <strong>{totals.activeServices ?? 0}</strong>
                        </div>
                      </div>

                      <div className="summary-footer">
                        <span>System status</span>

                        <span>
                          <span className="live-dot" /> Connected
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bottom-note">
                    <span className="live-dot" />
                    Dashboard data loaded from ClientFlow API
                  </div>
                </>
              )}
            </>
          ) : activePage === 'Requests' ? (
            <Requests />
          ) : activePage === 'Clients' ? (
            <Clients />
          ) : activePage === 'Employees' ? (
            <Employees />
          ) : activePage === 'Services' ? (
            <Services />
          ) : activePage === 'Documents' ? (
            <Documents />
          ) : (
            <div className="panel placeholder-panel">
              <div className="placeholder-icon">
                <FileText size={25} />
              </div>

              <h3>{activePage}</h3>

              <p>
                This section will be connected to the backend next.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
