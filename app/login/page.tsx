'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useCustomer } from '@/context/CustomerContext';
import { useEmployee } from '@/context/EmployeeContext';
import { useRider } from '@/context/RiderContext';
import { useAdmin } from '@/context/AdminContext';
import { createGuestCustomerSession } from '@/lib/customer';
import { auth } from '@/lib/firebase/firebaseConfig';
import {
  fetchCustomerSession,
  findCustomerEmailByPhone,
  createCustomerProfile,
} from '@/lib/firebase/customerProfile';
import {
  fetchStaffSession,
  findStaffEmailByPhone,
} from '@/lib/firebase/staffProfile';
import '@/styles/login.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCustomer } = useCustomer();
  const { setEmployee } = useEmployee();
  const { setRider } = useRider();
  const { setAdmin } = useAdmin();

  const redirect = searchParams.get('redirect') || '/menu';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [phoneLogin, setPhoneLogin] = useState('');
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [address, setAddress] = useState('');
  const [createMembership, setCreateMembership] = useState(false);
  const [membershipTier, setMembershipTier] = useState<'Silver' | 'Gold'>('Silver');

  const routeStaffSession = async (uid: string) => {
    const staff = await fetchStaffSession(uid);
    if (!staff) {
      return false;
    }

    if (staff.role === 'general_admin') {
      setAdmin(staff);
      router.push('/general-admin');
      return true;
    }

    if (staff.role === 'branch_admin') {
      setAdmin(staff);
      router.push('/admin');
      return true;
    }

    if (staff.role === 'employee') {
      setEmployee(staff);
      router.push('/employee');
      return true;
    }

    if (staff.role === 'rider') {
      setRider(staff);
      router.push('/rider');
      return true;
    }

    return false;
  };

  const tryRouteFirebaseStaffByEmail = async (loginEmail: string, loginPassword: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const handled = await routeStaffSession(credential.user.uid);
      if (handled) {
        return true;
      }
      await signOut(auth);
      return false;
    } catch {
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!password.trim()) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    if (!email.trim() && !phoneLogin.trim()) {
      setError('Please enter your email or phone number.');
      setLoading(false);
      return;
    }

    if (phoneLogin && !/^09\d{9}$/.test(phoneLogin)) {
      setError('Phone number must be valid.');
      setLoading(false);
      return;
    }

    try {
      if (phoneLogin.trim()) {
        const riderEmail = `${phoneLogin.trim()}@rider.shakeys.local`;

        try {
          const riderCredential = await signInWithEmailAndPassword(auth, riderEmail, password);
          const riderHandled = await routeStaffSession(riderCredential.user.uid);
          if (riderHandled) {
            return;
          }
          await signOut(auth);
        } catch (firebaseError) {
          const message = firebaseError instanceof Error ? firebaseError.message : '';
          if (
            !message.includes('auth/invalid-credential') &&
            !message.includes('auth/user-not-found')
          ) {
            throw firebaseError;
          }
        }

        try {
          const staffEmail = await findStaffEmailByPhone(phoneLogin.trim());
          if (staffEmail) {
            const credential = await signInWithEmailAndPassword(auth, staffEmail, password);
            const staffHandled = await routeStaffSession(credential.user.uid);
            if (staffHandled) {
              return;
            }
            await signOut(auth);
          }
        } catch (firebaseError) {
          const message = firebaseError instanceof Error ? firebaseError.message : '';
          if (!message.includes('Missing or insufficient permissions')) {
            throw firebaseError;
          }
        }

        const customerEmail = await findCustomerEmailByPhone(phoneLogin.trim());
        if (customerEmail) {
          const credential = await signInWithEmailAndPassword(auth, customerEmail, password);
          const customer = await fetchCustomerSession(credential.user.uid);
          if (!customer) {
            await signOut(auth);
            throw new Error('Customer profile not found.');
          }
          setCustomer(customer);
          router.push(redirect);
          return;
        }

        const riderRes = await fetch(`/api/rider/login?phone=${encodeURIComponent(phoneLogin.trim())}&password=${encodeURIComponent(password)}`);
        if (riderRes.ok) {
          const riderData = await riderRes.json();
          setRider(riderData);
          router.push('/rider');
          return;
        }

        const empPhoneRes = await fetch(`/api/employee/login?phone=${encodeURIComponent(phoneLogin.trim())}&password=${encodeURIComponent(password)}`);
        if (empPhoneRes.ok) {
          const emp = await empPhoneRes.json();
          if (emp.Emp_Position === 'General Admin') {
            setAdmin(emp);
            router.push('/general-admin');
          } else if (emp.Emp_Position === 'Admin') {
            setAdmin(emp);
            router.push('/admin');
          } else {
            setEmployee(emp);
            router.push('/employee');
          }
          return;
        }
      }

      if (email.trim()) {
        try {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const staffHandled = await routeStaffSession(credential.user.uid);
          if (staffHandled) {
            return;
          }

          const customer = await fetchCustomerSession(credential.user.uid);
          if (customer?.role === 'customer') {
            setCustomer(customer);
            router.push(redirect);
            return;
          }

          await signOut(auth);
        } catch (firebaseError) {
          const message = firebaseError instanceof Error ? firebaseError.message : '';
          if (!message.includes('auth/invalid-credential') && !message.includes('auth/user-not-found')) {
            throw firebaseError;
          }
        }

        const empRes = await fetch(`/api/employee/login?email=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}`);
        if (empRes.ok) {
          const emp = await empRes.json();
          if (emp.Emp_Position === 'General Admin') {
            setAdmin(emp);
            router.push('/general-admin');
          } else if (emp.Emp_Position === 'Admin') {
            setAdmin(emp);
            router.push('/admin');
          } else {
            setEmployee(emp);
            router.push('/employee');
          }
          return;
        }
      }

      setError('Invalid credentials. Please check your email/phone and password.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('auth/invalid-credential')) {
        setError('Invalid credentials. Please check your email/phone and password.');
      } else {
        setError(message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (
      regPassword.length < 8 ||
      !/[A-Z]/.test(regPassword) ||
      !/[a-z]/.test(regPassword) ||
      !/[0-9]/.test(regPassword)
    ) {
      setError(
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
      );
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(regEmail)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!/^09\d{9}$/.test(phone)) {
      setError('Phone number must be 11 digits and start with 09.');
      setLoading(false);
      return;
    }

    if (!address.trim()) {
      setError('Address is required.');
      setLoading(false);
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      await createCustomerProfile({
        uid: credential.user.uid,
        firstName,
        lastName,
        email: regEmail,
        phone,
        address: address.trim(),
        createMembership,
        membershipTier: createMembership ? membershipTier : null,
      });

      await signOut(auth);
      setSuccess('Registration successful! You can now sign in.');
      setActiveTab('login');
      setEmail(regEmail);
      setPassword('');
      setFirstName('');
      setLastName('');
      setRegEmail('');
      setPhone('');
      setRegPassword('');
      setAddress('');
      setCreateMembership(false);
      setMembershipTier('Silver');
    } catch (err) {
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch {
          // Ignore cleanup failure and surface the original registration error.
        }
      }
      const message = err instanceof Error ? err.message : '';
      setError(message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    setCustomer(createGuestCustomerSession());
    router.push(redirect);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="login-logo-text">{"Shakey's"}</div>
          <div className="login-logo-tagline">Delivery System</div>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button
              className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            >
              Register
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          {activeTab === 'login' ? (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-form-group">
                <label className="login-label">Email Address</label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-text">Or</span>
                <span className="login-divider-line" />
              </div>

              <div className="login-form-group">
                <label className="login-label">Mobile Number</label>
                <input
                  type="tel"
                  className="login-input"
                  placeholder="Enter your phone number"
                  value={phoneLogin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhoneLogin(value);
                  }}
                  maxLength={11}
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span
                    style={{ fontSize: '13px', color: '#c8102e', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => alert('Please contact your branch for password reset.')}
                  >
                    Forgot password?
                  </span>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <span className="login-divider-line" />
              </div>

              <button type="button" className="login-guest-btn" onClick={handleGuestContinue}>
                Continue as Guest
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <Link href="/setup/general-admin" style={{ fontSize: '13px', color: '#c8102e', fontWeight: 600, textDecoration: 'none' }}>
                  Set up General Admin
                </Link>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleRegister}>
              <div className="login-form-group">
                <label className="login-label">First Name</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setFirstName(value);
                  }}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Last Name</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setLastName(value);
                  }}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Mobile Number</label>
                <input
                  type="tel"
                  className="login-input"
                  placeholder="09XXXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhone(value);
                  }}
                  required
                  maxLength={11}
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Create a password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Email Address</label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="Enter your email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Address</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Enter your address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="login-checkbox-group">
                <input
                  type="checkbox"
                  className="login-checkbox"
                  id="membership"
                  checked={createMembership}
                  onChange={(e) => setCreateMembership(e.target.checked)}
                />
                <label htmlFor="membership" className="login-checkbox-label">
                  {"Join Shakey's SuperCard membership (earn points!)"}
                </label>
              </div>

              {createMembership && (
                <div style={{
                  background: '#fafafa',
                  border: '1px solid #e5e5e5',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginTop: '4px',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '10px' }}>
                    Choose your SuperCard tier:
                  </p>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                    <input
                      type="radio"
                      name="tier"
                      value="Silver"
                      checked={membershipTier === 'Silver'}
                      onChange={() => setMembershipTier('Silver')}
                      style={{ marginTop: '3px', accentColor: '#c8102e' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>Silver card</div>
                      <div style={{ fontSize: '12px', color: '#777' }}>
                        150 starting points � 1 pt = PHP 1 discount � Earn 1 pt per PHP 10 spent
                      </div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tier"
                      value="Gold"
                      checked={membershipTier === 'Gold'}
                      onChange={() => setMembershipTier('Gold')}
                      style={{ marginTop: '3px', accentColor: '#c8102e' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>Gold card</div>
                      <div style={{ fontSize: '12px', color: '#777' }}>
                        250 starting points � 1 pt = PHP 2 discount � Earn 1 pt per PHP 10 spent
                      </div>
                    </div>
                  </label>
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <Link href="/menu" className="login-back-link">
          Back to Menu
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="menu-loading-spinner" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
