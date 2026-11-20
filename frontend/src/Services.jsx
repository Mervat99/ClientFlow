
import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Plus, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import { getServices, createService } from './managementApi';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadServices() {
    try {
      setLoading(true);
      setError('');
      setServices(await getServices());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      await createService({
        name: form.name.trim(),
        description: form.description.trim() || undefined
      });
      setSuccess('Service created successfully.');
      setForm({ name: '', description: '' });
      setShowForm(false);
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create service.');
    }
  }

  const filtered = services.filter(service =>
    `${service.name} ${service.description || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="management-page">
      <div className="management-heading">
        <div>
          <span className="management-eyebrow">COMPANY OFFERINGS</span>
          <h1>Services</h1>
          <p>Manage the services available to your clients.</p>
        </div>
        <button className="management-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={17} /> Add Service
        </button>
      </div>

      <div className="management-stats">
        <div className="management-stat">
          <span>Total Services</span>
          <strong>{services.length}</strong>
          <BriefcaseBusiness size={21} />
        </div>
        <div className="management-stat">
          <span>Active Services</span>
          <strong>{services.filter(service => service.isActive).length}</strong>
          <CheckCircle2 size={21} />
        </div>
      </div>

      {error && <div className="management-alert error">{error}</div>}
      {success && <div className="management-alert success">{success}</div>}

      {showForm && (
        <form className="management-form" onSubmit={handleSubmit}>
          <h3>Create a service</h3>
          <label>Service name *</label>
          <input required maxLength="100" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Development" />
          <label>Description</label>
          <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe this service..." />
          <div className="management-form-actions">
            <button type="button" className="management-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="management-primary" type="submit">Create Service</button>
          </div>
        </form>
      )}

      <div className="management-toolbar">
        <div className="management-search">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." />
        </div>
        <button className="management-icon-button" onClick={loadServices} title="Refresh"><RefreshCw size={17} /></button>
      </div>

      <div className="management-card-grid">
        {loading ? <div className="management-empty">Loading services...</div> :
          filtered.length === 0 ? <div className="management-empty">No services found.</div> :
          filtered.map(service => (
            <article className="service-card" key={service.id}>
              <div className="service-card-icon"><BriefcaseBusiness size={22} /></div>
              <div className="service-card-status">
                <span className={`management-status ${service.isActive ? 'active' : 'inactive'}`}>
                  {service.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3>{service.name}</h3>
              <p>{service.description || 'No description provided.'}</p>
              <div className="service-card-footer">
                <span>{service.requests?.length || 0} requests</span>
              </div>
            </article>
          ))
        }
      </div>
    </section>
  );
}
