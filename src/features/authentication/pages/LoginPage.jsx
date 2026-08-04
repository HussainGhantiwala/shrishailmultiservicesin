import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Button from '../../../components/common/Button';
import { getAuthErrorMessage } from '../../../utils/formatters';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resetPassword } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Reset View
  const [isResetView, setIsResetView] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const from = location.state?.from?.pathname || '/portal/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.success) {
        toast.success(`Welcome back, ${response.user.name}!`);
        if (response.user.role === 'customer') {
          navigate('/portal/customers', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
      toast.success('Password reset instructions sent to your email.');
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Portal Sign In | Shrishail Multi Services</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Public Website
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary text-white font-bold text-xl shadow-md mb-3">
              S
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sign in to Portal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shrishail Multi Services Business Portal
            </p>
          </div>

          <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-8">
            {!isResetView ? (
              <>
                {Boolean(error) && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium leading-relaxed">
                    {String(error)}
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
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@domain.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetView(true);
                          setError('');
                        }}
                        className="text-[11px] font-semibold text-brand-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full mt-2"
                    icon={ArrowRight}
                  >
                    Sign In to Portal
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
                  <span className="text-slate-500">New customer? </span>
                  <Link to="/signup" className="text-brand-primary font-bold hover:underline">
                    Register Account Here
                  </Link>
                </div>
              </>
            ) : (
              /* Password Reset View */
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                <p className="text-slate-500">
                  Enter your registered email address to receive password reset instructions.
                </p>

                {resetEmailSent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                    Password reset link has been dispatched to <strong>{email}</strong>. Check your email inbox.
                  </div>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                    {Boolean(error) && <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-200">{String(error)}</div>}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@domain.com"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <Button type="submit" isLoading={loading} className="w-full">
                      Send Reset Instructions
                    </Button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsResetView(false);
                    setResetEmailSent(false);
                    setError('');
                  }}
                  className="text-slate-600 hover:text-brand-primary text-xs font-semibold block text-center w-full pt-2"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
