import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/auth/authService';
import { useToast } from '../../../context/ToastContext';
import { isValidEmail, isValidPhone } from '../../../utils/validation';
import { User, Phone, Mail, Lock, MapPin, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Button from '../../../components/common/Button';

export default function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Step 4: Password Complexity Validation (Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char)
  const validatePassword = (pass) => {
    if (!pass || pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
      return 'Password must contain at least one special character (!@#$%^&*).';
    }
    return null;
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is mandatory for SMS notifications.';
    } else if (!isValidPhone(formData.phone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!isValidEmail(formData.email)) {
      errs.email = 'Enter a valid email address format.';
    }

    const passErr = validatePassword(formData.password);
    if (passErr) errs.password = passErr;

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.signUp(formData);
      setRegisteredSuccess(true);
      toast.success('Registration submitted! Account pending admin approval.');
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
      setErrors((prev) => ({ ...prev, general: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Customer Signup | Shrishail Multi Services</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg mb-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal Login
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary text-white font-bold text-xl shadow-md mb-3">
              S
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Customer Registration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your customer account with Shrishail Multi Services
            </p>
          </div>

          <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-8">
            {registeredSuccess ? (
              /* Success Confirmation Box */
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Registration Successful!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your customer profile and initial ledger account have been registered. Your account status is currently{' '}
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Pending Approval</span>.
                  An administrator will review and activate your portal login shortly.
                </p>
                <div className="pt-4">
                  <Button onClick={() => navigate('/login')} icon={ArrowRight}>
                    Go to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
                {errors.general && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                    {errors.general}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                        errors.name ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] text-rose-600 mt-0.5">{errors.name}</p>}
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="10-digit Mobile No"
                        className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none font-mono ${
                          errors.phone ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-rose-600 mt-0.5">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="name@domain.com"
                        className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                          errors.email ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-[11px] text-rose-600 mt-0.5">{errors.email}</p>}
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 special"
                        className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                          errors.password ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                        }`}
                      />
                    </div>
                    {errors.password && <p className="text-[11px] text-rose-600 mt-0.5 leading-tight">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                        className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                          errors.confirmPassword ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                        }`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-[11px] text-rose-600 mt-0.5">{errors.confirmPassword}</p>}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing / Location Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Solapur Road, MIDC"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Optional Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Business domain or service requirements..."
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <Button type="submit" isLoading={loading} className="w-full mt-3" icon={ArrowRight}>
                  Register Customer Account
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
              <span className="text-slate-500">Already have an account? </span>
              <Link to="/login" className="text-brand-primary font-bold hover:underline">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
