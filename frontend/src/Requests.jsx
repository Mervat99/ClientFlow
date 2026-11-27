
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  ClipboardList,
  Clock3,
  CheckCircle2,
  CircleDot,
  Users,
  X,
  CalendarDays,
  BriefcaseBusiness,
  AlertCircle,
} from 'lucide-react';

import {
  getRequests,
  createRequest,
  updateRequestStatus,
  assignRequest,
  getClients,
  getEmployees,
  getServices,
} from './requestsApi';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New', className: 'status-new' },
  { value: 'IN_PROGRESS', label: 'In Progress', className: 'status-progress' },
  { value: 'WAITING_FOR_CLIENT', label: 'Waiting for Client', className: 'status-waiting' },
  { value: 'COMPLETED', label: 'Completed', className: 'status-completed' },
  { value: 'CANCELLED', label: 'Cancelled', className: 'status-cancelled' },
];

function getStatus(status) {
  return STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0];
}

function getEmployeeName(request) {
  const employee = request.assignments?.[0]?.employee;
  return employee?.user?.name || 'Unassigned';
}

function getEmployeeId(request) {
  return request.assignments?.[0]?.employee?.id || '';
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  );
}

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function Requests({ user }) {
  const currentUser = user || getStoredUser();
  const role = currentUser?.role?.toUpperCase();

  const isAdmin = role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';
  const isClient = role === 'CLIENT';

  const canManageRequests = isAdmin || isEmployee;

  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    clientId: '',
    serviceId: '',
  });

  const loadData = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      if (isAdmin) {
        const [
          requestsData,
          clientsData,
          employeesData,
          servicesData,
        ] = await Promise.all([
          getRequests(),
          getClients(),
          getEmployees(),
          getServices(),
        ]);

        setRequests(Array.isArray(requestsData) ? requestsData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } else if (isEmployee || isClient) {
        const [requestsData, servicesData] = await Promise.all([
          getRequests(),
          getServices(),
        ]);

        setRequests(Array.isArray(requestsData) ? requestsData : []);
        setServices(Array.isArray(servicesData) ? servicesData : []);

        setClients([]);
        setEmployees([]);
      } else {
        setRequests([]);
        setError('You do not have permission to view requests.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => ({
    total: requests.length,
    new: requests.filter((request) => request.status === 'NEW').length,
    inProgress: requests.filter((request) => request.status === 'IN_PROGRESS').length,
    completed: requests.filter((request) => request.status === 'COMPLETED').length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return requests;

    return requests.filter((request) => {
      const searchableText = [
        request.title,
        request.description,
        request.client?.user?.name,
        request.service?.name,
        getEmployeeName(request),
        getStatus(request.status).label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(value);
    });
  }, [requests, search]);

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!isAdmin && !isClient) return;

    if (
      !form.title.trim() ||
      !form.serviceId ||
      (isAdmin && !form.clientId)
    ) {
      setError(
        isAdmin
          ? 'Please complete the title, client and service fields.'
          : 'Please complete the title and service fields.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const requestData = {
        title: form.title.trim(),
        description: form.description.trim(),
        serviceId: form.serviceId,
      };

      // Only the administrator selects the client.
      // The backend identifies the logged-in client automatically.
      if (isAdmin) {
        requestData.clientId = form.clientId;
      }

      await createRequest(requestData);

      setShowModal(false);
      setForm({
        title: '',
        description: '',
        clientId: '',
        serviceId: '',
      });

      setSuccess('Request created successfully.');
      await loadData(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    if (!canManageRequests) return;

    setUpdatingId(requestId);
    setError('');
    setSuccess('');

    try {
      await updateRequestStatus(requestId, newStatus);
      setSuccess('Request status updated successfully.');
      await loadData(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId('');
    }
  };

  const handleAssignEmployee = async (requestId, employeeId) => {
    if (!isAdmin || !employeeId) return;

    const targetRequest = requests.find((request) => request.id === requestId);

    if (['COMPLETED', 'CANCELLED'].includes(targetRequest?.status)) {
      setError('Cannot assign an employee to a completed or cancelled request.');
      return;
    }

    setUpdatingId(requestId);
    setError('');
    setSuccess('');

    try {
      await assignRequest(requestId, employeeId);
      setSuccess('Employee assigned successfully.');
      await loadData(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <section className="requests-page">
      <div className="requests-heading">
        <div>
          <div className="requests-eyebrow">WORKSPACE / OPERATIONS</div>

          <h1>
            {isAdmin
              ? 'Requests Management'
              : isClient
                ? 'My Requests'
                : 'My Assigned Requests'}
          </h1>

          <p>
            {isAdmin
              ? 'Manage client requests, track progress and assign your team.'
              : isClient
                ? 'Submit new requests and follow the progress of your services.'
                : 'View your assigned requests and update their progress.'}
          </p>
        </div>

        <div className="requests-heading-actions">
          <button
            className="requests-refresh-button"
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'requests-spin' : ''} />
            Refresh
          </button>

          {(isAdmin || isClient) && (
            <button
              className="requests-create-button"
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setShowModal(true);
              }}
            >
              <Plus size={17} />
              New Request
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="requests-alert requests-alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Close error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="requests-alert requests-alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Close message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="requests-stats-grid">
        <div className="requests-stat-card">
          <div className="requests-stat-top">
            <span>Total Requests</span>
            <div className="requests-stat-icon icon-purple">
              <ClipboardList size={19} />
            </div>
          </div>
          <strong>{stats.total}</strong>
          <small>{isAdmin ? 'All client requests' : isClient ? 'Your requests' : 'Your assigned requests'}</small>
        </div>

        <div className="requests-stat-card">
          <div className="requests-stat-top">
            <span>New</span>
            <div className="requests-stat-icon icon-blue">
              <CircleDot size={19} />
            </div>
          </div>
          <strong>{stats.new}</strong>
          <small>Waiting to be started</small>
        </div>

        <div className="requests-stat-card">
          <div className="requests-stat-top">
            <span>In Progress</span>
            <div className="requests-stat-icon icon-orange">
              <Clock3 size={19} />
            </div>
          </div>
          <strong>{stats.inProgress}</strong>
          <small>Currently being handled</small>
        </div>

        <div className="requests-stat-card">
          <div className="requests-stat-top">
            <span>Completed</span>
            <div className="requests-stat-icon icon-green">
              <CheckCircle2 size={19} />
            </div>
          </div>
          <strong>{stats.completed}</strong>
          <small>Successfully completed</small>
        </div>
      </div>

      <div className="requests-content-panel">
        <div className="requests-panel-heading">
          <div>
            <h2>
              {isAdmin
                ? 'All Requests'
                : isClient
                  ? 'My Requests'
                  : 'Assigned Requests'}
            </h2>

            <p>
              {isAdmin
                ? 'View and manage every request submitted by your clients.'
                : isClient
                  ? 'View the requests you have submitted.'
                  : 'View the requests assigned to you.'}
            </p>
          </div>

          <span className="requests-count">
            {filteredRequests.length}{' '}
            {filteredRequests.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        <div className="requests-table-toolbar">
          <div className="requests-search-box">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search requests, clients, services..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="requests-state">
            <RefreshCw size={25} className="requests-spin" />
            <p>Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="requests-state">
            <div className="requests-empty-icon">
              <ClipboardList size={28} />
            </div>

            <h3>{search ? 'No matching requests' : 'No requests found'}</h3>

            <p>
              {search
                ? 'Try another search term.'
                : isClient
                  ? 'You have not submitted any requests yet.'
                  : isAdmin
                    ? 'Create your first client request to get started.'
                    : 'You do not have any assigned requests yet.'}
            </p>

            {!search && (isAdmin || isClient) && (
              <button
                className="requests-create-button"
                type="button"
                onClick={() => setShowModal(true)}
              >
                <Plus size={16} />
                Create Request
              </button>
            )}
          </div>
        ) : (
          <div className="requests-table-scroll">
            <table className="requests-data-table">
              <thead>
                <tr>
                  <th>REQUEST</th>
                  {isAdmin && <th>CLIENT</th>}
                  <th>SERVICE</th>
                  <th>STATUS</th>
                  {!isClient && <th>ASSIGNED TO</th>}
                  <th>CREATED</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => {
                  const status = getStatus(request.status);
                  const assignedId = getEmployeeId(request);
                  const isUpdating = updatingId === request.id;

                  return (
                    <tr key={request.id}>
                      <td>
                        <div className="requests-title-cell">
                          <div className="requests-row-icon">
                            <BriefcaseBusiness size={17} />
                          </div>

                          <div>
                            <strong>{request.title}</strong>
                            <span>
                              {request.description || 'No description provided'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {isAdmin && (
                        <td>
                          <div className="requests-person-cell">
                            <div className="requests-avatar">
                              {(request.client?.user?.name || 'C')
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              {request.client?.user?.name || 'Unknown client'}
                            </span>
                          </div>
                        </td>
                      )}

                      <td>
                        <span className="requests-service-name">
                          {request.service?.name || '—'}
                        </span>
                      </td>

                      <td>
                        <div className="requests-status-control">
                          <span className={`requests-status-badge ${status.className}`}>
                            <span className="requests-status-dot" />
                            {status.label}
                          </span>

                          {canManageRequests && (
                            <select
                              aria-label={`Change status for ${request.title}`}
                              value={request.status}
                              disabled={isUpdating}
                              onChange={(event) =>
                                handleStatusChange(request.id, event.target.value)
                              }
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {!isClient && (
                        <td>
                          {assignedId ? (
                            <div className="requests-person-cell">
                              <div className="requests-avatar employee-avatar">
                                {getEmployeeName(request)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <span>{getEmployeeName(request)}</span>
                            </div>
                          ) : isAdmin ? (
                            <div className="requests-assign-control">
                              <Users size={15} />

                              <select
                                aria-label={`Assign employee to ${request.title}`}
                                defaultValue=""
                                disabled={
                                  isUpdating ||
                                  ['COMPLETED', 'CANCELLED'].includes(request.status)
                                }
                                title={
                                  ['COMPLETED', 'CANCELLED'].includes(request.status)
                                    ? 'Cannot assign employees to completed or cancelled requests'
                                    : 'Assign an employee'
                                }
                                onChange={(event) =>
                                  handleAssignEmployee(request.id, event.target.value)
                                }
                              >
                                <option value="">Assign employee</option>

                                {employees.map((employee) => (
                                  <option key={employee.id} value={employee.id}>
                                    {employee.user?.name || employee.name || 'Employee'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </td>
                      )}

                      <td>
                        <div className="requests-date-cell">
                          <CalendarDays size={15} />
                          {formatDate(request.createdAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (isAdmin || isClient) && (
        <div
          className="requests-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowModal(false);
            }
          }}
        >
          <div className="requests-modal">
            <div className="requests-modal-header">
              <div>
                <div className="requests-modal-icon">
                  <Plus size={20} />
                </div>

                <h2>Create New Request</h2>
                <p>
                  {isAdmin
                    ? 'Add a new service request for a client.'
                    : 'Submit a new service request.'}
                </p>
              </div>

              <button
                type="button"
                className="requests-modal-close"
                onClick={() => setShowModal(false)}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <label className="requests-form-field">
                <span>
                  Request Title <b>*</b>
                </span>

                <input
                  type="text"
                  placeholder="e.g. Website Development"
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  required
                />
              </label>

              <label className="requests-form-field">
                <span>Description</span>

                <textarea
                  placeholder="Describe what you need..."
                  maxLength={1000}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>

              {isAdmin && (
                <label className="requests-form-field">
                  <span>
                    Client <b>*</b>
                  </span>

                  <select
                    value={form.clientId}
                    onChange={(event) =>
                      setForm({ ...form, clientId: event.target.value })
                    }
                    required
                  >
                    <option value="">Select a client</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.user?.name || client.name || client.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="requests-form-field">
                <span>
                  Service <b>*</b>
                </span>

                <select
                  value={form.serviceId}
                  onChange={(event) =>
                    setForm({ ...form, serviceId: event.target.value })
                  }
                  required
                >
                  <option value="">Select a service</option>

                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="requests-modal-actions">
                <button
                  type="button"
                  className="requests-modal-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="requests-create-button"
                  disabled={saving}
                >
                  <Plus size={16} />
                  {saving ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
