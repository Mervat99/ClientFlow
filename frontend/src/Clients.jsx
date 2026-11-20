
import { useEffect, useState } from 'react';
import { getClients, createClient } from './managementApi';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
  });

  async function loadClients() {
    try {
      setLoading(true);
      const data = await getClients();
      setClients(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
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

      await createClient({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
      });

      setForm({
        name: '',
        email: '',
        password: '',
        companyName: '',
        phone: '',
      });

      setSuccess('Client created successfully');
      await loadClients();
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Could not create client'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h2>Clients</h2>
          <p>Manage your company clients and their accounts.</p>
        </div>
      </div>

      <div className="management-form">
        <h3>Add Client</h3>
        <p>Create a new client account and profile.</p>

        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Client full name"
            required
          />

          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="client@example.com"
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

          <label>Company Name</label>
          <input
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Company name"
          />

          <label>Phone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone number"
          />

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      </div>

      <div className="management-list">
        <h3>All Clients ({clients.length})</h3>

        {loading ? (
          <p>Loading clients...</p>
        ) : clients.length === 0 ? (
          <p>No clients found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Requests</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.user?.name}</td>
                    <td>{client.user?.email}</td>
                    <td>{client.companyName || '—'}</td>
                    <td>{client.phone || '—'}</td>
                    <td>{client.requests?.length ?? 0}</td>
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
