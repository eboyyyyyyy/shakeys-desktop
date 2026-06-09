'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { fetchStaffSession, updateOwnStaffProfile } from '@/lib/firebase/staffProfile';
import '@/styles/header.css';

export default function AdminProfilePage() {
  const router = useRouter();
  const { admin, setAdmin } = useAdmin();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [empFName, setEmpFName] = useState('');
  const [empLName, setEmpLName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!admin) {
      router.push('/login');
    }
  }, [admin, router]);

  useEffect(() => {
    if (admin) {
      setEmpFName(admin.Emp_FName || '');
      setEmpLName(admin.Emp_LName || '');
      setEmpPhone(admin.Emp_PhoneNo || admin.phoneNo || '');
    }
  }, [admin]);

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
    const pwErr = validatePassword();
    if (pwErr) { showToast(pwErr, 'error'); return; }
    if (!empFName.trim()) { showToast('First name is required', 'error'); return; }
    if (!empLName.trim()) { showToast('Last name is required', 'error'); return; }
    const phoneErr = validatePhone(empPhone);
    if (phoneErr) { showToast(phoneErr, 'error'); return; }

    const payload = {
      Emp_FName: empFName,
      Emp_LName: empLName,
      Emp_PhoneNo: empPhone,
      id: admin!.Emp_ID,
      ...(showPasswordSection && { password: currentPassword, newPassword }),
    };

    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update profile', 'error');
        return;
      }

      await updateOwnStaffProfile(admin!.uid, {
        firstName: empFName,
        lastName: empLName,
        phoneNo: empPhone,
        email: admin!.email,
        branchId: admin!.branchId,
        position: admin!.position,
        status: admin!.status,
      });

      const refreshedSession = await fetchStaffSession(admin!.uid);
      setAdmin(refreshedSession ?? {
        ...admin!,
        ...data,
        firstName: empFName.trim(),
        lastName: empLName.trim(),
        phoneNo: empPhone.trim(),
        Emp_FName: empFName.trim(),
        Emp_LName: empLName.trim(),
        Emp_PhoneNo: empPhone.trim(),
        displayName: [empFName.trim(), empLName.trim()].filter(Boolean).join(' '),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      showToast('Profile updated successfully!', 'success');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(admin?.role === 'general_admin' ? '/general-admin' : '/admin');
  };

  if (!admin) return null;
  const displayName = `${admin.Emp_FName} ${admin.Emp_LName}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="header">
        <div className="header-container">
          <div className="header-logo" style={{ pointerEvents: 'none' }}>
            <span className="header-logo-text">{"Shakey's"}</span>
            <span className="header-logo-tagline">General Admin</span>
          </div>
          <div className="header-user-info">
            <button
              onClick={() => router.push('/admin/profile')}
              className="header-user-name"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
            >
              {displayName}
            </button>
            <button onClick={handleBack} className="header-logout-btn">Back</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
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
              <p className="text-red-100 text-sm">{admin.Emp_Position}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">First Name</label>
                <input type="text" value={empFName} onChange={e => setEmpFName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors" placeholder="First name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Last Name</label>
                <input type="text" value={empLName} onChange={e => setEmpLName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors" placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone Number</label>
              <input type="tel" value={empPhone} onChange={e => setEmpPhone(e.target.value)} maxLength={11} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors" placeholder="09XXXXXXXXX" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email</div>
                <div className="text-sm text-gray-600 truncate">{admin.Emp_Email}</div>
                <div className="text-xs text-gray-400 mt-0.5">Contact admin to change</div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Branch</div>
                <div className="text-sm text-gray-600">{admin.Brnch_Name || `Branch ${admin.Emp_BranchID ?? '-'}`}</div>
                <div className="text-xs text-gray-400 mt-0.5">Contact admin to change</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <button type="button" onClick={() => { setShowPasswordSection(v => !v); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {showPasswordSection ? 'Cancel password change' : 'Change password'}
              </button>

              {showPasswordSection && (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors" placeholder="Enter current password" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition-colors" placeholder="Min. 8 characters" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${confirmPassword && newPassword !== confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-red-400'}`} placeholder="Repeat new password" />
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl transition-all ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}



