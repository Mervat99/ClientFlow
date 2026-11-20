
import { useEffect, useState } from 'react';
import {
  getEmployees,
  getDepartments,
  createEmployee,
} from './managementApi';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: '',
  });

  async function loadData() {
    try {
      setLoading(true);
      const [employeeData, departmentData] = await Promise.all([
        getEmployees(),
        getDepartments(),
      ]);

      setEmployees(employeeData);
      setDepartments(departmentData);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load employees');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters');
      return;
    }

    try {
      setSaving(true);

      await createEmployee({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(form.departmentId
          ? { departmentId: form.departmentId }
          : {}),
      });

      setForm({
        name: '',
        email: '',
        password: '',
        departmentId: '',
      });

      setSuccess('Employee created successfully');
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Could not create employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h2>Employees</h2>
          <p>Manage your company employees and departments.</p>
        </div>
      </div>

      <div className="management-form">
        <h3>Add Employee</h3>
        <p>Create a new employee account and profile.</p>

        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Employee full name"
            required
          />

          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="employee@example.com"
            required
          />

          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />

          <label>Department</label>
          <select
            name="departmentId"
            value={form.departmentId}
            onChange={handleChange}
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Employee'}
          </button>
        </form>
      </div>

      <div className="management-list">
        <h3>All Employees ({employees.length})</h3>

        {loading ? (
          <p>Loading employees...</p>
        ) : employees.length === 0 ? (
          <p>No employees found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.user?.name}</td>
                    <td>{employee.user?.email}</td>
                    <td>{employee.department?.name || 'No department'}</td>
                    <td>{employee.user?.isActive ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
