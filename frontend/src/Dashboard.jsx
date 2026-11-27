
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

import { getDashboard, getRequests } from './api';
import './App.css';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'Requests', icon: ClipboardList, roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
  { label: 'Clients', icon: Users, roles: ['ADMIN'] },
  { label: 'Employees', icon: UserRound, roles: ['ADMIN'] },
  { label: 'Services', icon: BriefcaseBusiness, roles: ['ADMIN'] },
  { label: 'Documents', icon: FileText, roles: ['ADMIN', 'EMPLOYEE', 'CLIENT'] },
];

const statusLabels = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_CLIENT: 'Waiting for Client',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const roleLabels = {
  ADMIN: 'Administrator',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
};

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activePage, setActivePage] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role?.toUpperCase() || '';

  const isAdmin = role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';
  const isClient = role === 'CLIENT';

  const canCreateRequest = role === 'ADMIN' || role === 'CLIENT';

  const userName = user?.name || user?.email || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const roleName = roleLabels[role] || 'User';

  const allowedNavigation = navigation.filter((item) =>
    item.roles.includes(role)
  );

  const allowedPages = allowedNavigation.map((item) => item.label);

  const handleNavigate = (page) => {
    if (allowedPages.includes(page)) {
      setActivePage(page);
      setMobileOpen(false);
    }
  };

  // Load dashboard data according to the logged-in user's role
  useEffect(() => {
    const loadDashboard = async () => {
      if (!isAdmin && !isEmployee && !isClient) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (isAdmin) {
          const result = await getDashboard();
          setData(result);
        }

        if (isEmployee) {
          const result = await getRequests();

          const requests = Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : [];

          setEmployeeRequests(requests);
        }

        if (isClient) {
          const result = await getRequests();

          const requests = Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : [];

          setClientRequests(requests);
        }
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
  }, [isAdmin, isEmployee, isClient]);

  const totals = data?.totals || {};
  const statuses = data?.requestsByStatus || {};

  // Employee statistics
  const employeeStats = {
    total: employeeRequests.length,

    new: employeeRequests.filter(
      (request) => request.status === 'NEW'
    ).length,

    inProgress: employeeRequests.filter(
      (request) => request.status === 'IN_PROGRESS'
    ).length,

    completed: employeeRequests.filter(
      (request) => request.status === 'COMPLETED'
    ).length,

    waiting: employeeRequests.filter(
      (request) => request.status === 'WAITING_FOR_CLIENT'
    ).length,

    cancelled: employeeRequests.filter(
      (request) => request.status === 'CANCELLED'
    ).length,
  };

  const recentEmployeeRequests = [...employeeRequests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // Client statistics
  const clientStats = {
    total: clientRequests.length,

    new: clientRequests.filter(
      (request) => request.status === 'NEW'
    ).length,

    inProgress: clientRequests.filter(
      (request) => request.status === 'IN_PROGRESS'
    ).length,

    completed: clientRequests.filter(
      (request) => request.status === 'COMPLETED'
    ).length,

    waiting: clientRequests.filter(
      (request) => request.status === 'WAITING_FOR_CLIENT'
    ).length,

    cancelled: clientRequests.filter(
      (request) => request.status === 'CANCELLED'
    ).length,
  };

  const recentClientRequests = [...clientRequests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

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

  const employeeCards = [
    {
      label: 'Assigned Requests',
      value: employeeStats.total,
      icon: ClipboardList,
      color: 'purple',
      note: 'Requests assigned to you',
    },
    {
      label: 'New Requests',
      value: employeeStats.new,
      icon: AlertCircle,
      color: 'blue',
      note: 'Waiting to be started',
    },
    {
      label: 'In Progress',
      value: employeeStats.inProgress,
      icon: Activity,
      color: 'orange',
      note: 'Currently working on',
    },
    {
      label: 'Completed',
      value: employeeStats.completed,
      icon: CheckCircle2,
      color: 'green',
      note: 'Successfully completed',
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
          {allowedNavigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                activePage === label ? 'active' : ''
              }`}
              onClick={() => handleNavigate(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">{userInitial}</div>

            <div className="profile-info">
              <strong>{userName}</strong>
              <span>{roleName}</span>
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

            <NotificationsBell onNavigate={handleNavigate} />

            <div className="top-avatar">{userInitial}</div>
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
                {activePage === 'Dashboard'
                  ? `Welcome back, ${userName}.`
                  : 'Manage your workspace and monitor business activity.'}
              </p>
            </div>

            {activePage === 'Dashboard' && canCreateRequest && (
              <button
                className="primary-button"
                onClick={() => handleNavigate('Requests')}
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

              {/* ADMIN DASHBOARD */}
              {!loading && !error && isAdmin && (
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

                        <ArrowUpRight size={18} color="#999cff" />
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

              {/* EMPLOYEE DASHBOARD */}
              {!loading && !error && isEmployee && (
                <>
                  <div className="stats-grid">
                    {employeeCards.map((stat) => {
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
                          <h3>My Tasks Overview</h3>
                          <p>Status of your assigned requests</p>
                        </div>

                        <Activity size={19} color="#999cff" />
                      </div>

                      <div className="summary-list">
                        {Object.entries(statusLabels).map(
                          ([key, label]) => {
                            const count = employeeRequests.filter(
                              (request) => request.status === key
                            ).length;

                            return (
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
                                  ) : (
                                    <Clock3 size={16} />
                                  )}
                                </span>

                                {label}
                                <strong>{count}</strong>
                              </div>
                            );
                          }
                        )}
                      </div>

                      <div className="summary-footer">
                        <span>My assigned requests</span>
                        <strong>{employeeStats.total}</strong>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Work Summary</h3>
                          <p>Your current workload</p>
                        </div>

                        <ArrowUpRight size={18} color="#999cff" />
                      </div>

                      <div className="summary-list">
                        <div>
                          <span className="summary-icon blue-bg">
                            <ClipboardList size={16} />
                          </span>
                          New tasks
                          <strong>{employeeStats.new}</strong>
                        </div>

                        <div>
                          <span className="summary-icon orange-bg">
                            <Clock3 size={16} />
                          </span>
                          Waiting for client
                          <strong>{employeeStats.waiting}</strong>
                        </div>

                        <div>
                          <span className="summary-icon green-bg">
                            <CheckCircle2 size={16} />
                          </span>
                          Completed
                          <strong>{employeeStats.completed}</strong>
                        </div>
                      </div>

                      <div className="summary-footer">
                        <span>Account role</span>
                        <strong>Employee</strong>
                      </div>
                    </div>
                  </div>

                  <div className="panel employee-tasks-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>My Recent Tasks</h3>
                        <p>Your latest assigned requests</p>
                      </div>

                      <button
                        className="primary-button"
                        onClick={() => handleNavigate('Requests')}
                      >
                        View All
                        <ArrowUpRight size={16} />
                      </button>
                    </div>

                    {recentEmployeeRequests.length === 0 ? (
                      <div className="empty-state">
                        <ClipboardList size={25} />
                        <h3>No assigned requests yet</h3>
                        <p>
                          Requests assigned to you will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="summary-list">
                        {recentEmployeeRequests.map((request) => (
                          <div
                            key={request.id}
                            className="employee-task-row"
                          >
                            <span className="summary-icon blue-bg">
                              <ClipboardList size={16} />
                            </span>

                            <div className="employee-task-info">
                              <strong>
                                {request.title || request.service?.name || 'Request'}
                              </strong>

                              <span>
                                {request.service?.name || 'Service'}
                                {' · '}
                                {request.createdAt
                                  ? new Date(request.createdAt).toLocaleDateString()
                                  : 'Date unavailable'}
                              </span>
                            </div>

                            <span className="employee-task-status">
                              {statusLabels[request.status] || request.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bottom-note">
                    <span className="live-dot" />
                    Showing requests assigned to your account only
                  </div>
                </>
              )}

              {/* CLIENT DASHBOARD */}
              {!loading && !error && isClient && (
                <>
                  <div className="panel employee-tasks-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Welcome to ClientFlow</h3>
                        <p>Track your service requests</p>
                      </div>

                      <ClipboardList size={22} color="#999cff" />
                    </div>

                    <h2>{clientStats.total} Requests</h2>

                    <p className="subtitle">Your recent requests</p>

                    {clientRequests.length === 0 ? (
                      <div className="empty-state">
                        <ClipboardList size={25} />
                        <h3>No requests yet</h3>
                        <p>
                          You haven't submitted any requests yet.
                        </p>
                      </div>
                    ) : (
                      <div className="summary-list">
                        {recentClientRequests.map((request) => (
                          <div
                            key={request.id}
                            className="employee-task-row"
                          >
                            <span className="summary-icon blue-bg">
                              <ClipboardList size={16} />
                            </span>

                            <div className="employee-task-info">
                              <strong>
                                {request.title || request.service?.name || 'Request'}
                              </strong>

                              <span>
                                {request.service?.name || 'Service'}
                                {' · '}
                                {request.createdAt
                                  ? new Date(request.createdAt).toLocaleDateString()
                                  : 'Date unavailable'}
                              </span>
                            </div>

                            <span className="employee-task-status">
                              {statusLabels[request.status] || request.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="summary-footer">
                      <span>Total requests</span>
                      <strong>{clientStats.total}</strong>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => handleNavigate('Requests')}
                    >
                      <Plus size={16} />
                      Create New Request
                    </button>
                  </div>
                </>
              )}

              {!loading && !error && !isAdmin && !isEmployee && !isClient && (
                <div className="panel empty-state">
                  <LayoutDashboard size={26} />
                  <h3>Welcome to ClientFlow</h3>
                  <p>
                    You are signed in as {roleName}. Use the workspace
                    menu to access the pages available to your account.
                  </p>
                </div>
              )}
            </>
          ) : activePage === 'Requests' ? (
            <Requests user={user} />
          ) : activePage === 'Clients' && isAdmin ? (
            <Clients />
          ) : activePage === 'Employees' && isAdmin ? (
            <Employees />
          ) : activePage === 'Services' && isAdmin ? (
            <Services />
          ) : activePage === 'Documents' ? (
            <Documents />
          ) : (
            <div className="panel placeholder-panel">
              <div className="placeholder-icon">
                <FileText size={25} />
              </div>

              <h3>Page unavailable</h3>

              <p>
                You do not have permission to access this page.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
