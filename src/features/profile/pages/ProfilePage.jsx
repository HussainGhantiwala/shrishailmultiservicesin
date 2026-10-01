import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import {
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Open Edit Profile Mode
  const handleOpenEdit = () => {
    setProfileName(user?.name || '');
    setProfilePhone(user?.phone || '');
    setProfileError('');
    setIsEditingProfile(true);
  };

  // Cancel Edit Profile
  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileError('');
  };

  // Submit Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');

    if (!profileName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    if (profilePhone.trim()) {
      const cleanDigits = profilePhone.replace(/\D/g, '');
      if (cleanDigits.length !== 10 && !(cleanDigits.length === 12 && cleanDigits.startsWith('91'))) {
        setProfileError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
      });
      toast.success('Profile details updated successfully.');
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Change Password Modal
  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  // Close Change Password Modal
  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Account password updated successfully.');
      handleClosePasswordModal();
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-brand-primary border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
            Administrator
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Staff Member
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Customer Account
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <PageHeader
        title="My Profile & Account Settings"
        description="Manage your contact information and account security."
      />

      {/* 1. Account Overview */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-primary to-blue-600 text-white text-2xl font-bold flex items-center justify-center border-4 border-slate-50 shadow-sm shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              (user?.name?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{user?.name}</h1>
              {getRoleBadge(user?.role)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {user?.email}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-slate-400 block">Account Status</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-xs mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active & Verified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2. Personal Details Card */}
        <div className="lg:col-span-7">
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-slate-900">Personal Details</h3>
                </div>
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit3}
                    onClick={handleOpenEdit}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            }
            className="p-5 shadow-xs border border-slate-200 bg-white rounded-xl"
          >
            {profileError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {isEditingProfile ? (
              /* Inline Edit Form */
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Manteshwar Suntnure"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-3 py-2 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="9823011223"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-r-lg text-xs font-mono text-slate-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    10-digit Indian mobile number for administrative contact and alerts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={user?.email || ''}
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Email address is securely linked to your login credentials and cannot be edited directly.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelEdit}
                    isDisabled={savingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={savingProfile}
                    icon={CheckCircle2}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              /* Read-only Display */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Full Name</label>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 font-semibold text-slate-800 text-xs">
                      {user?.name || 'Not provided'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Phone Number</label>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono font-medium text-slate-800 text-xs flex items-center justify-between">
                      <span>{user?.phone ? `+91 ${user.phone}` : 'No phone number set'}</span>
                      {user?.phone && <Phone className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 text-[11px] font-medium">Email Address</label>
                    <span className="text-[10px] text-slate-400 font-medium">Authentication Email</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-slate-800 text-xs flex items-center justify-between">
                    <span>{user?.email}</span>
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 3. Security Card */}
        <div className="lg:col-span-5">
          <Card
            header={
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-slate-900">Security & Credentials</h3>
              </div>
            }
            className="p-5 shadow-xs border border-slate-200 bg-white rounded-xl space-y-4"
          >
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Account Password</span>
                <div className="font-mono text-base tracking-widest text-slate-700 font-bold select-none">
                  ••••••••••••
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your portal password is encrypted and managed through Supabase Authentication. Regular password updates ensure the safety of your business data.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={KeyRound}
                onClick={handleOpenPasswordModal}
                className="w-full bg-white hover:bg-slate-50"
              >
                Change Password
              </Button>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
              <span>
                Session protection is active. Re-authentication of your current password is required before any password modification.
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        title="Change Account Password"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClosePasswordModal}
              isDisabled={savingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="changePasswordForm"
              variant="primary"
              size="sm"
              isLoading={savingPassword}
              icon={CheckCircle2}
            >
              Update Password
            </Button>
          </div>
        }
      >
        <form id="changePasswordForm" onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
