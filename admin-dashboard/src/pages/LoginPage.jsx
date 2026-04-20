import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const [form, setForm] = useState({ email: 'admin@solartrack.com', password: 'admin@123' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🌞</div>
          <div className="login-brand">SolarTrack Pro</div>
          <div className="login-tagline">Fleet Command Center</div>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-title">Admin Sign In</div>
          <div className="login-subtitle">Secure access to the tracking dashboard</div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="admin@solartrack.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>

          <button id="login-submit" type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? (
              <><span className="spinner" style={{ borderTopColor: '#000' }} /> Signing in…</>
            ) : (
              '🚀 Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="login-demo">
          <div className="demo-label">Demo Credentials</div>
          <code>admin@solartrack.com</code> / <code>admin@123</code>
        </div>

        {/* Footer */}
        <div className="login-footer">
          SolarTrack Pro v1.0.0 · Real-time GPS Fleet Management
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
