
import { useState } from 'react';
import { login } from './api';
import { LockKeyhole, Mail, ArrowRight, LoaderCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      onLogin(data.user);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">CF</div>
        <h1>Welcome back</h1>
        <p>Sign in to your ClientFlow workspace</p>

        <label>Email address</label>
        <div className="login-input">
          <Mail size={18} />
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label>Password</label>
        <div className="login-input">
          <LockKeyhole size={18} />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="login-button" disabled={loading}>
          {loading ? (
            <LoaderCircle className="spin" />
          ) : (
            <>Sign in <ArrowRight size={18} /></>
          )}
        </button>

        <span className="login-footer">
          ClientFlow CRM · Secure workspace
        </span>
      </form>
    </main>
  );
}
