'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';
import '@/styles/header.css';
import { createLegacyLinkedStaffAccount, deactivateLegacyLinkedStaffProfile, linkExistingLegacyStaffAccount, syncLegacyBranch, updateLegacyLinkedStaffProfile } from '@/lib/firebase/staffProfile';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Branch {
  Brnch_ID: number;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
  Brnch_PhoneNo: string;
  Brnch_Status: string;
  Manager_Name: string | null;
}

interface Admin {
  Emp_ID: number;
  Emp_BranchID: number;
  Emp_FName: string;
  Emp_LName: string;
  Emp_Position: string;
  Emp_PhoneNo: string;
  Emp_Email: string;
  Emp_HireDate: string;
  Emp_Status: string;
  Brnch_Name: string;
}

type Tab = 'admins' | 'branches';

// ─── Empty form defaults ───────────────────────────────────────────────────────

const emptyAdmin = {
  Emp_BranchID: 0,
  Emp_FName: '',
  Emp_LName: '',
  Emp_PhoneNo: '',
  Emp_Email: '',
  Emp_Password: '',
  Emp_HireDate: new Date().toISOString().split('T')[0],
  Emp_Status: 'Active',
};

const emptyBranch = {
  Brnch_Name: '',
  Brnch_Address: '',
  Brnch_City: '',
  Brnch_PhoneNo: '',
  Brnch_Status: 'Active',
};

// ─── Validation helpers ────────────────────────────────────────────────────────

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNumbersOnly(val: string) {
  return /^\d+$/.test(val);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeneralAdminPage() {
  const [tab, setTab] = useState<Tab>('admins');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: 'add-admin' | 'edit-admin' | 'delete-admin' |
          'add-branch' | 'edit-branch' | 'delete-branch' | null;
    data?: any;
  }>({ type: null });

  // Form state
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { admin, logout, loading: authLoading } = useAdmin();
  const router = useRouter();

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && admin === null) router.push('/login');
    if (!authLoading && admin && admin.Emp_Position !== 'General Admin') router.push('/login');
  }, [admin, authLoading, router]);

  useEffect(() => {
    if (admin) fetchAll();
  }, [admin]);

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const adminHeaders = { 'x-admin-id': String(admin?.Emp_ID ?? '') };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [adminRes, branchRes] = await Promise.all([
        fetch('/api/admin/admins', { headers: adminHeaders }),
        fetch('/api/admin/branches', { headers: adminHeaders }),
      ]);
      const [adminData, branchData] = await Promise.all([
        adminRes.json(),
        branchRes.json(),
      ]);
      setAdmins(Array.isArray(adminData) ? adminData : []);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  const closeModal = () => {
    setModal({ type: null });
    setFormErrors({});
  };

  const openAddAdmin = () => {
    setAdminForm({ ...emptyAdmin, Emp_BranchID: branches[0]?.Brnch_ID || 0 });
    setFormErrors({});
    setModal({ type: 'add-admin' });
  };

  const openEditAdmin = (a: Admin) => {
    setAdminForm({
      Emp_BranchID: a.Emp_BranchID,
      Emp_FName: a.Emp_FName,
      Emp_LName: a.Emp_LName,
      Emp_PhoneNo: a.Emp_PhoneNo,
      Emp_Email: a.Emp_Email,
      Emp_Password: '',
      Emp_HireDate: a.Emp_HireDate,
      Emp_Status: a.Emp_Status,
    });
    setFormErrors({});
    setModal({ type: 'edit-admin', data: a });
  };

  const openAddBranch = () => {
    setBranchForm(emptyBranch);
    setFormErrors({});
    setModal({ type: 'add-branch' });
  };

  const openEditBranch = (b: Branch) => {
    setBranchForm({
      Brnch_Name: b.Brnch_Name,
      Brnch_Address: b.Brnch_Address,
      Brnch_City: b.Brnch_City,
      Brnch_PhoneNo: b.Brnch_PhoneNo,
      Brnch_Status: b.Brnch_Status,
    });
    setFormErrors({});
    setModal({ type: 'edit-branch', data: b });
  };

  // ─── Frontend validation ─────────────────────────────────────────────────────

  const validateAdminForm = (isEdit: boolean): boolean => {
    const errors: Record<string, string> = {};
    if (!adminForm.Emp_FName.trim()) errors.Emp_FName = 'First name is required';
    if (!adminForm.Emp_LName.trim()) errors.Emp_LName = 'Last name is required';
    if (!adminForm.Emp_PhoneNo.trim()) errors.Emp_PhoneNo = 'Phone number is required';
    else if (!isNumbersOnly(adminForm.Emp_PhoneNo.trim())) errors.Emp_PhoneNo = 'Numbers only';
    else if (adminForm.Emp_PhoneNo.trim().length !== 11) errors.Emp_PhoneNo = 'Must be 11 digits';
    if (!adminForm.Emp_Email.trim()) errors.Emp_Email = 'Email is required';
    else if (!isValidEmail(adminForm.Emp_Email.trim())) errors.Emp_Email = 'Invalid email format';
    if (!isEdit && !adminForm.Emp_Password) errors.Emp_Password = 'Password is required';
    if (adminForm.Emp_Password && adminForm.Emp_Password.length < 8) errors.Emp_Password = 'Min 8 characters';
    if (!adminForm.Emp_BranchID) errors.Emp_BranchID = 'Branch is required';
    if (!adminForm.Emp_HireDate) errors.Emp_HireDate = 'Hire date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBranchForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!branchForm.Brnch_Name.trim()) errors.Brnch_Name = 'Branch name is required';
    if (!branchForm.Brnch_Address.trim()) errors.Brnch_Address = 'Address is required';
    if (!branchForm.Brnch_City.trim()) errors.Brnch_City = 'City is required';
    if (!branchForm.Brnch_PhoneNo.trim()) errors.Brnch_PhoneNo = 'Phone is required';
    else if (!isNumbersOnly(branchForm.Brnch_PhoneNo.trim())) errors.Brnch_PhoneNo = 'Numbers only';
    else if (branchForm.Brnch_PhoneNo.trim().length < 7 || branchForm.Brnch_PhoneNo.trim().length > 12) {
      errors.Brnch_PhoneNo = 'Must be 7–12 digits';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Admin CRUD ───────────────────────────────────────────────────────────────

  const handleSaveAdmin = async () => {
    const isEdit = modal.type === 'edit-admin';
    if (!validateAdminForm(isEdit)) return;

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/admins/${modal.data.Emp_ID}` : '/api/admin/admins';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(adminForm),
      });

      const data = await res.json();

      if (res.ok) {
        if (isEdit) {
          await updateLegacyLinkedStaffProfile(Number(modal.data.Emp_ID), {
            firstName: adminForm.Emp_FName,
            lastName: adminForm.Emp_LName,
            email: adminForm.Emp_Email,
            phoneNo: adminForm.Emp_PhoneNo,
            branchId: adminForm.Emp_BranchID,
            position: 'Admin',
            status: adminForm.Emp_Status,
          });
        } else if (typeof data?.Emp_ID === 'number') {
          await createLegacyLinkedStaffAccount({
            role: 'branch_admin',
            email: adminForm.Emp_Email,
            password: adminForm.Emp_Password,
            firstName: adminForm.Emp_FName,
            lastName: adminForm.Emp_LName,
            phoneNo: adminForm.Emp_PhoneNo,
            branchId: adminForm.Emp_BranchID,
            position: 'Admin',
            legacyId: data.Emp_ID,
          });
        }
        showToast(isEdit ? 'Admin updated successfully' : 'Admin added successfully', 'success');
        fetchAll();
        closeModal();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/admins/${modal.data.Emp_ID}`, { method: 'DELETE', headers: adminHeaders });
      const data = await res.json();

      if (res.ok) {
        await deactivateLegacyLinkedStaffProfile(Number(modal.data.Emp_ID));
        setAdmins(prev => prev.filter(a => a.Emp_ID !== modal.data.Emp_ID));
        showToast('Admin deleted successfully', 'success');
        closeModal();
      } else {
        showToast(data.error || 'Failed to delete admin', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Branch CRUD ──────────────────────────────────────────────────────────────

  const handleSaveBranch = async () => {
    if (!validateBranchForm()) return;

    setSaving(true);
    try {
      const isEdit = modal.type === 'edit-branch';
      const url = isEdit ? `/api/admin/branches/${modal.data.Brnch_ID}` : '/api/admin/branches';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(branchForm),
      });

      const data = await res.json();

      if (res.ok) {
        await syncLegacyBranch({
          branchId: isEdit ? modal.data.Brnch_ID : data.Brnch_ID,
          name: branchForm.Brnch_Name,
          address: branchForm.Brnch_Address,
          city: branchForm.Brnch_City,
          phoneNo: branchForm.Brnch_PhoneNo,
          status: branchForm.Brnch_Status,
        });
        showToast(isEdit ? 'Branch updated successfully' : 'Branch added successfully', 'success');
        fetchAll();
        closeModal();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/branches/${modal.data.Brnch_ID}`, { method: 'DELETE', headers: adminHeaders });
      const data = await res.json();

      if (res.ok) {
        setBranches(prev => prev.filter(b => b.Brnch_ID !== modal.data.Brnch_ID));
        showToast('Branch deleted successfully', 'success');
        closeModal();
      } else {
        showToast(data.error || 'Failed to delete branch', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const activeAdmins = admins.filter(a => a.Emp_Status === 'Active').length;
  const inactiveAdmins = admins.filter(a => a.Emp_Status === 'Inactive').length;
  const activeBranches = branches.filter(b => b.Brnch_Status === 'Active').length;
  const inactiveBranches = branches.filter(b => b.Brnch_Status === 'Inactive').length;

  if (authLoading) return null;

  // ─── Field component helper ───────────────────────────────────────────────────

  const Field = ({
    label, error, children,
  }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  const inputCls = (err?: string) =>
    `w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
      err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-red-400'
    }`;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Delete Admin Modal ─────────────────────────────────────────────── */}
      {modal.type === 'delete-admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Admin</h3>
                <p className="text-sm text-gray-500">{modal.data.Emp_FName} {modal.data.Emp_LName}</p>
              </div>
              <button onClick={closeModal} className="ml-auto text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="px-6 pb-5 text-sm text-gray-600">
              Are you sure you want to permanently delete this admin account? This cannot be undone.
            </p>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleDeleteAdmin} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Branch Modal ────────────────────────────────────────────── */}
      {modal.type === 'delete-branch' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-2xl">🏪</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Branch</h3>
                <p className="text-sm text-gray-500">{modal.data.Brnch_Name}</p>
              </div>
              <button onClick={closeModal} className="ml-auto text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="px-6 pb-5 text-sm text-gray-600">
              Are you sure you want to delete this branch? This will fail if the branch has active orders.
            </p>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleDeleteBranch} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Form Modal ───────────────────────────────────────────────── */}
      {(modal.type === 'add-admin' || modal.type === 'edit-admin') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modal.type === 'add-admin' ? 'Add Admin' : 'Edit Admin'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" error={formErrors.Emp_FName}>
                  <input type="text" value={adminForm.Emp_FName}
                    onChange={e => setAdminForm(f => ({ ...f, Emp_FName: e.target.value }))}
                    className={inputCls(formErrors.Emp_FName)} placeholder="First name" />
                </Field>
                <Field label="Last Name" error={formErrors.Emp_LName}>
                  <input type="text" value={adminForm.Emp_LName}
                    onChange={e => setAdminForm(f => ({ ...f, Emp_LName: e.target.value }))}
                    className={inputCls(formErrors.Emp_LName)} placeholder="Last name" />
                </Field>
              </div>
              <Field label="Branch" error={formErrors.Emp_BranchID}>
                <select value={adminForm.Emp_BranchID}
                  onChange={e => setAdminForm(f => ({ ...f, Emp_BranchID: Number(e.target.value) }))}
                  className={inputCls(formErrors.Emp_BranchID)}>
                  <option value={0}>Select a branch...</option>
                  {branches.map(b => (
                    <option key={b.Brnch_ID} value={b.Brnch_ID}>{b.Brnch_ID} — {b.Brnch_Name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phone Number" error={formErrors.Emp_PhoneNo}>
                <input type="text" value={adminForm.Emp_PhoneNo}
                  onChange={e => setAdminForm(f => ({ ...f, Emp_PhoneNo: e.target.value.replace(/\D/g, '') }))}
                  className={inputCls(formErrors.Emp_PhoneNo)} placeholder="09XXXXXXXXX" maxLength={11} />
              </Field>
              <Field label="Email" error={formErrors.Emp_Email}>
                <input type="email" value={adminForm.Emp_Email}
                  onChange={e => setAdminForm(f => ({ ...f, Emp_Email: e.target.value }))}
                  className={inputCls(formErrors.Emp_Email)} placeholder="email@shakeys.com" />
              </Field>
              <Field label={modal.type === 'edit-admin' ? 'New Password (leave blank to keep current)' : 'Password'}
                error={formErrors.Emp_Password}>
                <input type="password" value={adminForm.Emp_Password}
                  onChange={e => setAdminForm(f => ({ ...f, Emp_Password: e.target.value }))}
                  className={inputCls(formErrors.Emp_Password)}
                  placeholder={modal.type === 'edit-admin' ? 'Leave blank to keep current' : 'Min 8 characters'} />
              </Field>
              <Field label="Hire Date" error={formErrors.Emp_HireDate}>
                <input type="date" value={adminForm.Emp_HireDate}
                  onChange={e => setAdminForm(f => ({ ...f, Emp_HireDate: e.target.value }))}
                  className={inputCls(formErrors.Emp_HireDate)} />
              </Field>
              {modal.type === 'edit-admin' && (
                <Field label="Status">
                  <select value={adminForm.Emp_Status}
                    onChange={e => setAdminForm(f => ({ ...f, Emp_Status: e.target.value }))}
                    className={inputCls()}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSaveAdmin} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? 'Saving...' : modal.type === 'add-admin' ? 'Add Admin' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Branch Form Modal ──────────────────────────────────────────────── */}
      {(modal.type === 'add-branch' || modal.type === 'edit-branch') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modal.type === 'add-branch' ? 'Add Branch' : 'Edit Branch'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <Field label="Branch Name" error={formErrors.Brnch_Name}>
                <input type="text" value={branchForm.Brnch_Name}
                  onChange={e => setBranchForm(f => ({ ...f, Brnch_Name: e.target.value }))}
                  className={inputCls(formErrors.Brnch_Name)} placeholder="e.g. Shakeys SM City Cebu" />
              </Field>
              <Field label="Address" error={formErrors.Brnch_Address}>
                <input type="text" value={branchForm.Brnch_Address}
                  onChange={e => setBranchForm(f => ({ ...f, Brnch_Address: e.target.value }))}
                  className={inputCls(formErrors.Brnch_Address)} placeholder="Street address" />
              </Field>
              <Field label="City" error={formErrors.Brnch_City}>
                <input type="text" value={branchForm.Brnch_City}
                  onChange={e => setBranchForm(f => ({ ...f, Brnch_City: e.target.value }))}
                  className={inputCls(formErrors.Brnch_City)} placeholder="City" />
              </Field>
              <Field label="Phone Number" error={formErrors.Brnch_PhoneNo}>
                <input type="text" value={branchForm.Brnch_PhoneNo}
                  onChange={e => setBranchForm(f => ({ ...f, Brnch_PhoneNo: e.target.value.replace(/\D/g, '') }))}
                  className={inputCls(formErrors.Brnch_PhoneNo)} placeholder="Numbers only" maxLength={12} />
              </Field>
              {modal.type === 'edit-branch' && (
                <Field label="Status">
                  <select value={branchForm.Brnch_Status}
                    onChange={e => setBranchForm(f => ({ ...f, Brnch_Status: e.target.value }))}
                    className={inputCls()}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSaveBranch} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? 'Saving...' : modal.type === 'add-branch' ? 'Add Branch' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-container" style={{ justifyContent: 'space-evenly' }}>
          <div className="header-logo" style={{ pointerEvents: 'none' }}>
            <span className="header-logo-text">{"Shakey's"}</span>
            <span className="header-logo-tagline">General Admin</span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('admins')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${tab === 'admins'
                  ? 'bg-white text-red-600 border-2 border-white'
                  : 'text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40'}`}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Accounts
            </button>
            <button onClick={() => setTab('branches')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${tab === 'branches'
                  ? 'bg-white text-red-600 border-2 border-white'
                  : 'text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40'}`}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Branches
            </button>
          </div>

          {/* Stats + user */}
          <div className="flex items-center gap-3">
            {tab === 'admins' ? (
              <>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-green-300" />{activeAdmins} Active
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />{inactiveAdmins} Inactive
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-green-300" />{activeBranches} Active
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />{inactiveBranches} Inactive
                </div>
              </>
            )}
            <div className="h-4 w-px bg-white/30" />
            <div className="header-user-info">
              <button onClick={() => router.push('/admin/profile')} className="header-user-name" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}>{admin?.Emp_FName} {admin?.Emp_LName}</button>
              <button onClick={() => { logout(); router.push('/login'); }} className="header-logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Page title + add button */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tab === 'admins' ? 'Admin Account Management' : 'Branch Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {tab === 'admins'
                ? 'A list of all system administrators including their status and assigned branch.'
                : 'A list of all branches including their status and manager.'}
            </p>
          </div>
          <button
            onClick={tab === 'admins' ? openAddAdmin : openAddBranch}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {tab === 'admins' ? 'Add Admin' : 'Add Branch'}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* ── Admins Table ───────────────────────────────────────────────── */}
            {tab === 'admins' && (
              <>
                <div className="grid grid-cols-[70px_140px_110px_170px_105px_150px_90px_120px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>ID</span>
                  <span>Name</span>
                  <span>Position</span>
                  <span>Contact Info</span>
                  <span>Hire Date</span>
                  <span>Branch</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {admins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <span className="text-4xl">👤</span>
                    <p className="text-gray-400 text-sm">No admin accounts found.</p>
                    <button onClick={openAddAdmin} className="text-red-600 text-sm font-semibold hover:underline mt-1">
                      Add your first admin
                    </button>
                  </div>
                ) : admins.map((a, idx) => (
                  <div key={a.Emp_ID}
                    className={`grid grid-cols-[70px_140px_110px_170px_105px_150px_90px_120px] gap-3 px-6 py-4 items-center
                      ${idx !== admins.length - 1 ? 'border-b border-gray-100' : ''}
                      hover:bg-gray-50 transition-colors`}>
                    <span className="text-sm text-gray-400 font-mono">{a.Emp_ID}</span>
                    <div className="text-sm font-bold text-gray-900">{a.Emp_FName} {a.Emp_LName}</div>
                    <span className="text-sm text-gray-500">{a.Emp_Position}</span>
                    <div>
                      <div className="text-sm text-gray-700">{a.Emp_PhoneNo}</div>
                      <div className="text-xs text-gray-400 truncate">{a.Emp_Email}</div>
                    </div>
                    <span className="text-sm text-gray-500">{a.Emp_HireDate}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">{a.Emp_BranchID}</div>
                      <div className="text-xs text-gray-400 truncate">{a.Brnch_Name}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit
                      ${a.Emp_Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.Emp_Status}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEditAdmin(a)} className="text-blue-400 hover:text-blue-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setModal({ type: 'delete-admin', data: a })} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── Branches Table ─────────────────────────────────────────────── */}
            {tab === 'branches' && (
              <>
                <div className="grid grid-cols-[80px_180px_240px_120px_160px_100px_80px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Branch ID</span>
                  <span>Name</span>
                  <span>Address</span>
                  <span>Phone</span>
                  <span>Manager</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {branches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <span className="text-4xl">🏪</span>
                    <p className="text-gray-400 text-sm">No branches found.</p>
                    <button onClick={openAddBranch} className="text-red-600 text-sm font-semibold hover:underline mt-1">
                      Add your first branch
                    </button>
                  </div>
                ) : branches.map((b, idx) => (
                  <div key={b.Brnch_ID}
                    className={`grid grid-cols-[80px_180px_240px_120px_160px_100px_80px] gap-3 px-6 py-4 items-center
                      ${idx !== branches.length - 1 ? 'border-b border-gray-100' : ''}
                      hover:bg-gray-50 transition-colors`}>
                    <span className="text-sm text-gray-400 font-mono">{b.Brnch_ID}</span>
                    <div className="text-sm font-bold text-gray-900">{b.Brnch_Name}</div>
                    <div>
                      <div className="text-sm text-gray-700 truncate">{b.Brnch_Address}</div>
                      <div className="text-xs text-gray-400">{b.Brnch_City}</div>
                    </div>
                    <span className="text-sm text-gray-700">{b.Brnch_PhoneNo}</span>
                    <span className="text-sm text-gray-500">{b.Manager_Name || '—'}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit
                      ${b.Brnch_Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.Brnch_Status}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEditBranch(b)} className="text-blue-400 hover:text-blue-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setModal({ type: 'delete-branch', data: b })} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl
          ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}




