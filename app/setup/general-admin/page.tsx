'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bootstrapGeneralAdminFromLegacyAccount, hasFirebaseGeneralAdmin } from '@/lib/firebase/staffProfile';
import '@/styles/login.css';

export default function GeneralAdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasGeneralAdmin, setHasGeneralAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function loadState() {
      try {
        const exists = await hasFirebaseGeneralAdmin();
        setHasGeneralAdmin(exists);
      } catch (setupError) {
        console.error('Failed to check Firebase General Admin:', setupError);
        setError('Failed to load Firebase setup status.');
      } finally {
        setLoading(false);
      }
    }

    void loadState();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const legacyRes = await fetch(`/api/employee/login?email=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}`);
      const legacyData = await legacyRes.json();

      if (!legacyRes.ok) {
        setError(legacyData.error || 'Could not verify your existing General Admin account.');
        return;
      }

      if (legacyData.Emp_Position !== 'General Admin') {
        setError('This login is not a General Admin account in the current SQL system.');
        return;
      }

      await bootstrapGeneralAdminFromLegacyAccount({
        email: email.trim(),
        password,
        firstName: legacyData.Emp_FName,
        lastName: legacyData.Emp_LName,
        phoneNo: legacyData.Emp_PhoneNo || '',
        branchId: legacyData.Emp_BranchID ?? null,
        legacyId: Number(legacyData.Emp_ID),
      });

      setSuccess('Firebase General Admin linked successfully. You can now sign in normally.');
      setHasGeneralAdmin(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to link General Admin to Firebase.';
      console.error('Failed to bootstrap Firebase General Admin:', submitError);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="login-logo-text">Shakey's</div>
          <div className="login-logo-tagline">Firebase General Admin Setup</div>
        </div>

        <div className="login-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>Checking setup...</div>
          ) : hasGeneralAdmin ? (
            <>
              <div className="login-success" style={{ marginBottom: '20px' }}>
                A Firebase General Admin account already exists for this system.
              </div>
              <Link href="/login" className="login-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Go to Sign In
              </Link>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '20px', color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                This links your existing SQL General Admin account into Firebase so we can move staff and branch management to Firebase without losing your current admin access.
              </div>

              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-form-group">
                  <label className="login-label">Existing General Admin Email</label>
                  <input
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-form-group">
                  <label className="login-label">Existing General Admin Password</label>
                  <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="login-submit-btn" disabled={submitting}>
                  {submitting ? 'Linking Account...' : 'Link General Admin to Firebase'}
                </button>
              </form>
            </>
          )}
        </div>

        <Link href="/login" className="login-back-link">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
