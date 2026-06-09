'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { useCustomer } from '@/context/CustomerContext';
import Header from '@/components/Header';
import { auth } from '@/lib/firebase/firebaseConfig';
import { updateCustomerProfile } from '@/lib/firebase/customerProfile';
import '@/styles/header.css';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { customer, setCustomer } = useCustomer();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [custFName, setCustFName] = useState('');
  const [custLName, setCustLName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!customer) {
      router.push('/login');
    }
  }, [customer, router]);

  useEffect(() => {
    if (customer) {
      setCustFName(customer.Cust_FirstName || '');
      setCustLName(customer.Cust_LastName || '');
      setCustEmail(customer.Cust_Email || '');
      setCustPhone(customer.Cust_PhoneNo || customer.Cust_PhoneNumber || customer.phoneNo || '');
      setCustAddress(customer.Cust_Address || '');
    }
  }, [customer]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return 'Phone number is required';
    if (!/^\d+$/.test(phone.trim())) return 'Phone number must contain numbers only';
    if (phone.trim().length !== 11) return 'Phone number must be 11 digits';
    return null;
  };

  const validatePassword = () => {
    if (!showPasswordSection) return null;
    if (!currentPassword) return 'Current password is required';
    if (!newPassword) return 'New password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      return;
    }

    const pwErr = validatePassword();
    if (pwErr) {
      showToast(pwErr, 'error');
      return;
    }

    if (!custFName.trim()) {
      showToast('First name is required', 'error');
      return;
    }
    if (!custLName.trim()) {
      showToast('Last name is required', 'error');
      return;
    }
    if (!custEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail.trim())) {
      showToast('Valid email is required', 'error');
      return;
    }
    const phoneErr = validatePhone(custPhone);
    if (phoneErr) {
      showToast(phoneErr, 'error');
      return;
    }

    setSaving(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Please sign in again before updating your profile.');
      }

      if (showPasswordSection || custEmail.trim() !== customer.email) {
        const credential = EmailAuthProvider.credential(customer.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      if (custEmail.trim() !== customer.email) {
        await updateEmail(auth.currentUser, custEmail.trim());
      }

      if (showPasswordSection && newPassword) {
        await updatePassword(auth.currentUser, newPassword);
      }

      const updatedCustomer = await updateCustomerProfile(customer, {
        firstName: custFName,
        lastName: custLName,
        email: custEmail,
        phoneNo: custPhone,
        address: custAddress,
      });

      setCustomer(updatedCustomer);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  const displayName = `${customer.Cust_FirstName} ${customer.Cust_LastName}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={() => router.push('/menu')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-red-600 px-6 py-8 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <p className="text-red-100 text-sm">Customer</p>
              {customer.Mem_Type && (
                <span className="mt-1 inline-block text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {customer.Mem_Type} Â· {customer.Mem_Points ?? 0} pts
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">First Name</label>
                <input
                  type="text"
                  value={custFName}
                  onChange={(e) => setCustFName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Last Name</label>
                <input
                  type="text"
                  value={custLName}
                  onChange={(e) => setCustLName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email Address</label>
              <input
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone Number</label>
              <input
                type="tel"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                maxLength={11}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                placeholder="09XXXXXXXXX"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Address <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                placeholder="Your delivery address"
              />
            </div>

            {customer.Mem_Type && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Membership</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{customer.Mem_Type} Card</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Points</div>
                  <div className="text-sm font-bold text-red-600 mt-0.5">{customer.Mem_Points ?? 0} pts</div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection((value) => !value);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                {showPasswordSection ? 'Cancel password change' : 'Change password'}
              </button>

              {showPasswordSection && (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                        confirmPassword && newPassword !== confirmPassword
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-gray-200 focus:border-red-400'
                      }`}
                      placeholder="Repeat new password"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl transition-all ${
            toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

