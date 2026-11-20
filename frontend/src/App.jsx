import { useState } from 'react';
import './App.css';
import Login from './Login';
import Dashboard from './Dashboard';

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('access_token'))
  );

  const handleLogin = () => setAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}