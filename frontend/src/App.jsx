
import { useState } from 'react';
import './App.css';
import Login from './Login';
import Dashboard from './Dashboard';
import { logout } from './api';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const authenticated = Boolean(
    localStorage.getItem('access_token') && user
  );

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
