import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, Mail, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/portal/dashboard';

  const [role, setRole] = useState('admin'); // 'admin' | 'customer'
  const [email, setEmail] = useState('admin@shrishail.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleRoleTabChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setEmail('admin@shrishail.com');
    } else {
      setEmail('customer@shrishail.com');
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await login(email, password, role);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid login credentials. Please try again.');
    }
  };

  const handleQuickDemoLogin = async (selectedRole) => {
    const demoEmail = selectedRole === 'customer' ? 'customer@shrishail.com' : 'admin@shrishail.com';
    setRole(selectedRole);
    setEmail(demoEmail);
    await login(demoEmail, 'password123', selectedRole);
    navigate(from, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Portal Login | Shrishail Multi Services</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        {/* Top return link */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Public Website
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo & Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary text-white font-bold text-xl shadow-md mb-3">
              S
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Shrishail Multi Services
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Business Management Portal Login
            </p>
          </div>

          {/* Card */}
          <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-8">
            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleRoleTabChange('admin')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  role === 'admin'
                    ? 'bg-white text-brand-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin / Owner
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange('customer')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  role === 'customer'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                Customer Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none"
                    placeholder="name@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded text-brand-primary focus:ring-brand-primary" />
                  Remember me
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact business administrator for password resets.'); }} className="text-brand-primary font-medium hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Customer'}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Box */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
                Quick Demo Access (Phase 1 Testing)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickDemoLogin('admin')}
                  className="py-2 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Demo Admin
                </button>
                <button
                  onClick={() => handleQuickDemoLogin('customer')}
                  className="py-2 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Demo Customer
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Shrishail Multi Services. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
