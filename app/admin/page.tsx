'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAdmin } from '../../context/AdminContext';
import '@/styles/header.css';
import { createLegacyLinkedStaffAccount, deactivateLegacyLinkedStaffProfile, linkExistingLegacyStaffAccount, updateLegacyLinkedStaffProfile } from '@/lib/firebase/staffProfile';
import { db } from '@/lib/firebase/firebaseConfig';

interface Branch {
  Brnch_ID: number;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
}

interface Employee {
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
  Brnch_Address: string;
}

interface Rider {
  Rider_ID: number;
  Rider_FName: string;
  Rider_LName: string;
  Rider_PhoneNo: string;
  Rider_Status: string;
  Rider_BranchID: number;
  Brnch_Name: string;
  Brnch_Address: string;
}

type Tab = 'employees' | 'riders';

const POSITIONS = ['Branch Manager', 'Assistant Manager', 'Cashier', 'Kitchen Staff', 'Server'];

const emptyEmployee = {
  Emp_BranchID: 0,
  Emp_FName: '',
  Emp_LName: '',
  Emp_Position: 'Cashier',
  Emp_PhoneNo: '',
  Emp_Email: '',
  Emp_Password: '',
  Emp_HireDate: new Date().toISOString().split('T')[0],
  Emp_Status: 'Active',
};

const emptyRider = {
  Rider_FName: '',
  Rider_LName: '',
  Rider_PhoneNo: '',
  Rider_Password: '',
  Rider_BranchID: 0,
  Rider_Status: 'Active',
};

async function fetchLinkedLegacyIds(branchId: number | string) {
  const [employeeSnapshot, riderSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'users'),
      where('branchId', '==', String(branchId)),
      where('role', '==', 'employee')
    )),
    getDocs(query(
      collection(db, 'users'),
      where('branchId', '==', String(branchId)),
      where('role', '==', 'rider')
    )),
  ]);

  const employeeIds = new Set<number>();
  const riderIds = new Set<number>();

  employeeSnapshot.docs.forEach((userDoc) => {
    const data = userDoc.data() as Record<string, unknown>;
    const legacyId = typeof data.legacyId === 'number'
      ? data.legacyId
      : typeof data.legacyId === 'string'
        ? Number(data.legacyId)
        : NaN;

    if (Number.isFinite(legacyId)) {
      employeeIds.add(legacyId);
    }
  });

  riderSnapshot.docs.forEach((userDoc) => {
    const data = userDoc.data() as Record<string, unknown>;
    const legacyId = typeof data.legacyId === 'number'
      ? data.legacyId
      : typeof data.legacyId === 'string'
        ? Number(data.legacyId)
        : NaN;

    if (Number.isFinite(legacyId)) {
      riderIds.add(legacyId);
    }
  });

  return { employeeIds, riderIds };
}
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [modal, setModal] = useState<{
    type: 'add-emp' | 'edit-emp' | 'add-rider' | 'edit-rider' | 'delete-emp' | 'delete-rider' | null;
    data?: any;
  }>({ type: null });

  const [empForm, setEmpForm] = useState(emptyEmployee);
  const [riderForm, setRiderForm] = useState(emptyRider);
  const [saving, setSaving] = useState(false);

  const { admin, logout, loading: authLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && admin === null) router.push('/login');
  }, [admin, authLoading, router]);

  useEffect(() => {
    if (admin) fetchAll();
  }, [admin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, riderRes, branchRes] = await Promise.all([
        fetch('/api/admin/employees', { headers: { 'x-admin-id': String(admin?.Emp_ID ?? '') } }),
        fetch('/api/admin/riders', { headers: { 'x-admin-id': String(admin?.Emp_ID ?? '') } }),
        fetch('/api/branches?active=true'),
      ]);
      const [empData, riderData, branchData] = await Promise.all([
        empRes.json(), riderRes.json(), branchRes.json(),
      ]);
      const branchId = admin?.Emp_BranchID;
      const linkedIds = branchId ? await fetchLinkedLegacyIds(branchId) : null;

      const nextEmployees = Array.isArray(empData) ? empData : [];
      const nextRiders = Array.isArray(riderData) ? riderData : [];

      setEmployees(
        linkedIds
          ? nextEmployees.filter((employee: Employee) => linkedIds.employeeIds.has(employee.Emp_ID))
          : nextEmployees
      );
      setRiders(
        linkedIds
          ? nextRiders.filter((rider: Rider) => linkedIds.riderIds.has(rider.Rider_ID))
          : nextRiders
      );
      setBranches(Array.isArray(branchData) ? branchData.filter((b: Branch) => b.Brnch_ID === admin?.Emp_BranchID) : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  const openAddEmployee = () => {
    setEmpForm({ ...emptyEmployee, Emp_BranchID: admin?.Emp_BranchID ? Number(admin.Emp_BranchID) : branches[0]?.Brnch_ID || 0 });
    setModal({ type: 'add-emp' });
  };

  const openEditEmployee = (emp: Employee) => {
    setEmpForm({
      Emp_BranchID: emp.Emp_BranchID,
      Emp_FName: emp.Emp_FName,
      Emp_LName: emp.Emp_LName,
      Emp_Position: emp.Emp_Position,
      Emp_PhoneNo: emp.Emp_PhoneNo,
      Emp_Email: emp.Emp_Email,
      Emp_Password: '', // leave blank â€” only update if filled
      Emp_HireDate: emp.Emp_HireDate,
      Emp_Status: emp.Emp_Status,
    });
    setModal({ type: 'edit-emp', data: emp });
  };

  const openAddRider = () => {
    setRiderForm({ ...emptyRider, Rider_BranchID: admin?.Emp_BranchID ? Number(admin.Emp_BranchID) : branches[0]?.Brnch_ID || 0 });
    setModal({ type: 'add-rider' });
  };

  const openEditRider = (rider: Rider) => {
    setRiderForm({
      Rider_FName: rider.Rider_FName,
      Rider_LName: rider.Rider_LName,
      Rider_PhoneNo: rider.Rider_PhoneNo,
      Rider_Password: '', // leave blank â€” only update if filled
      Rider_BranchID: rider.Rider_BranchID,
      Rider_Status: rider.Rider_Status,
    });
    setModal({ type: 'edit-rider', data: rider });
  };

  const closeModal = () => setModal({ type: null });

  const handleSaveEmployee = async () => {
    setSaving(true);
    try {
      if (modal.type === 'add-emp') {
        const res = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': String(admin?.Emp_ID ?? '') },
          body: JSON.stringify({ ...empForm, Emp_BranchID: admin?.Emp_BranchID }),
        });
        if (res.ok) {
          const payload = await res.json();
          if (typeof payload?.Emp_ID === 'number') {
            await createLegacyLinkedStaffAccount({
              role: 'employee',
              email: empForm.Emp_Email,
              password: empForm.Emp_Password,
              firstName: empForm.Emp_FName,
              lastName: empForm.Emp_LName,
              phoneNo: empForm.Emp_PhoneNo,
              branchId: admin?.Emp_BranchID || empForm.Emp_BranchID,
              position: empForm.Emp_Position,
              legacyId: payload.Emp_ID,
            });
          }
          showToast('Employee added successfully', 'success');
          fetchAll();
          closeModal();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add employee', 'error');
        }
      } else if (modal.type === 'edit-emp') {
        const res = await fetch(`/api/admin/employees/${modal.data.Emp_ID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': String(admin?.Emp_ID ?? '') },
          body: JSON.stringify({ ...empForm, Emp_BranchID: admin?.Emp_BranchID }),
        });
        if (res.ok) {
          await updateLegacyLinkedStaffProfile(Number(modal.data.Emp_ID), {
            firstName: empForm.Emp_FName,
            lastName: empForm.Emp_LName,
            email: empForm.Emp_Email,
            phoneNo: empForm.Emp_PhoneNo,
            branchId: admin?.Emp_BranchID || empForm.Emp_BranchID,
            position: empForm.Emp_Position,
            status: empForm.Emp_Status,
          }, {
            branchId: admin?.Emp_BranchID || empForm.Emp_BranchID,
            role: 'employee',
          });
          if (empForm.Emp_Password) {
            await linkExistingLegacyStaffAccount({
              role: 'employee',
              email: empForm.Emp_Email,
              password: empForm.Emp_Password,
              firstName: empForm.Emp_FName,
              lastName: empForm.Emp_LName,
              phoneNo: empForm.Emp_PhoneNo,
              branchId: admin?.Emp_BranchID || empForm.Emp_BranchID,
              position: empForm.Emp_Position,
              legacyId: Number(modal.data.Emp_ID),
            });
          }
          setEmployees(prev => prev.map(e =>
            e.Emp_ID === modal.data.Emp_ID
              ? { ...e, ...empForm, Brnch_Name: branches.find(b => b.Brnch_ID === admin?.Emp_BranchID)?.Brnch_Name || admin?.Brnch_Name || e.Brnch_Name }
              : e
          ));
          showToast('Employee updated successfully', 'success');
          closeModal();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update employee', 'error');
        }
      }
    } catch (error) {
      console.error('Rider save failed:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong';
      showToast(message, 'error');
    }
    finally { setSaving(false); }
  };

  const handleDeleteEmployee = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employees/${modal.data.Emp_ID}`, { method: 'DELETE', headers: { 'x-admin-id': String(admin?.Emp_ID ?? '') } });
      if (res.ok) {
        await deactivateLegacyLinkedStaffProfile(Number(modal.data.Emp_ID), {
          branchId: admin?.Emp_BranchID,
          role: 'employee',
        });
        setEmployees(prev => prev.filter(e => e.Emp_ID !== modal.data.Emp_ID));
        showToast('Employee deleted', 'success');
        closeModal();
      } else showToast('Failed to delete employee', 'error');
    } catch (error) {
      console.error('Rider save failed:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong';
      showToast(message, 'error');
    }
    finally { setSaving(false); }
  };

  const handleSaveRider = async () => {
    setSaving(true);
    try {
      if (modal.type === 'add-rider') {
        const res = await fetch('/api/admin/riders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': String(admin?.Emp_ID ?? '') },
          body: JSON.stringify({ ...riderForm, Rider_BranchID: admin?.Emp_BranchID }),
        });
        if (res.ok) {
          const payload = await res.json();
          if (typeof payload?.Rider_ID === 'number') {
            await createLegacyLinkedStaffAccount({
              role: 'rider',
              email: `${riderForm.Rider_PhoneNo}@rider.shakeys.local`,
              password: riderForm.Rider_Password,
              firstName: riderForm.Rider_FName,
              lastName: riderForm.Rider_LName,
              phoneNo: riderForm.Rider_PhoneNo,
              branchId: admin?.Emp_BranchID || riderForm.Rider_BranchID,
              position: 'Rider',
              legacyId: payload.Rider_ID,
            });
          }
          showToast('Rider added successfully', 'success');
          fetchAll();
          closeModal();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add rider', 'error');
        }
      } else if (modal.type === 'edit-rider') {
        const res = await fetch(`/api/admin/riders/${modal.data.Rider_ID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': String(admin?.Emp_ID ?? '') },
          body: JSON.stringify({ ...riderForm, Rider_BranchID: admin?.Emp_BranchID }),
        });
        if (res.ok) {
          await updateLegacyLinkedStaffProfile(Number(modal.data.Rider_ID), {
            firstName: riderForm.Rider_FName,
            lastName: riderForm.Rider_LName,
            phoneNo: riderForm.Rider_PhoneNo,
            branchId: admin?.Emp_BranchID || riderForm.Rider_BranchID,
            position: 'Rider',
            status: riderForm.Rider_Status,
          }, {
            branchId: admin?.Emp_BranchID || riderForm.Rider_BranchID,
            role: 'rider',
          });
          if (riderForm.Rider_Password) {
            await linkExistingLegacyStaffAccount({
              role: 'rider',
              email: `${riderForm.Rider_PhoneNo}@rider.shakeys.local`,
              password: riderForm.Rider_Password,
              firstName: riderForm.Rider_FName,
              lastName: riderForm.Rider_LName,
              phoneNo: riderForm.Rider_PhoneNo,
              branchId: admin?.Emp_BranchID || riderForm.Rider_BranchID,
              position: 'Rider',
              legacyId: Number(modal.data.Rider_ID),
            });
          }
          setRiders(prev => prev.map(r =>
            r.Rider_ID === modal.data.Rider_ID
              ? { ...r, ...riderForm, Brnch_Name: branches.find(b => b.Brnch_ID === admin?.Emp_BranchID)?.Brnch_Name || admin?.Brnch_Name || r.Brnch_Name }
              : r
          ));
          showToast('Rider updated successfully', 'success');
          closeModal();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update rider', 'error');
        }
      }
    } catch (error) {
      console.error('Rider save failed:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong';
      showToast(message, 'error');
    }
    finally { setSaving(false); }
  };

  const handleDeleteRider = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/riders/${modal.data.Rider_ID}`, { method: 'DELETE', headers: { 'x-admin-id': String(admin?.Emp_ID ?? '') } });
      if (res.ok) {
        await deactivateLegacyLinkedStaffProfile(Number(modal.data.Rider_ID), {
          branchId: admin?.Emp_BranchID,
          role: 'rider',
        });
        setRiders(prev => prev.filter(r => r.Rider_ID !== modal.data.Rider_ID));
        showToast('Rider deleted', 'success');
        closeModal();
      } else showToast('Failed to delete rider', 'error');
    } catch (error) {
      console.error('Rider save failed:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong';
      showToast(message, 'error');
    }
    finally { setSaving(false); }
  };

  const activeEmployees = employees.filter(e => e.Emp_Status === 'Active').length;
  const inactiveEmployees = employees.filter(e => e.Emp_Status === 'Inactive').length;
  const activeRiders = riders.filter(r => r.Rider_Status === 'Active').length;
  const inactiveRiders = riders.filter(r => r.Rider_Status === 'Inactive').length;

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Delete Confirm Modal */}
      {(modal.type === 'delete-emp' || modal.type === 'delete-rider') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-2xl">ðŸ—‘ï¸</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-500">
                  {modal.type === 'delete-emp'
                    ? `${modal.data.Emp_FName} ${modal.data.Emp_LName}`
                    : `${modal.data.Rider_FName} ${modal.data.Rider_LName}`}
                </p>
              </div>
              <button onClick={closeModal} className="ml-auto text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="px-6 pb-5 text-sm text-gray-600">
              Are you sure you want to permanently delete this {modal.type === 'delete-emp' ? 'employee' : 'rider'}? This cannot be undone.
            </p>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={modal.type === 'delete-emp' ? handleDeleteEmployee : handleDeleteRider}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {(modal.type === 'add-emp' || modal.type === 'edit-emp') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modal.type === 'add-emp' ? 'Add Employee' : 'Edit Employee'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={empForm.Emp_FName}
                    onChange={e => setEmpForm(f => ({ ...f, Emp_FName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={empForm.Emp_LName}
                    onChange={e => setEmpForm(f => ({ ...f, Emp_LName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Position</label>
                <select
                  value={empForm.Emp_Position}
                  onChange={e => setEmpForm(f => ({ ...f, Emp_Position: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Branch</label>
                <select
                  value={admin?.Emp_BranchID || empForm.Emp_BranchID}
                  disabled
                  onChange={e => setEmpForm(f => ({ ...f, Emp_BranchID: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  {branches.map(b => (
                    <option key={b.Brnch_ID} value={b.Brnch_ID}>
                      {b.Brnch_ID} â€” {b.Brnch_Name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone Number</label>
                <input
                  type="text"
                  value={empForm.Emp_PhoneNo}
                  onChange={e => setEmpForm(f => ({ ...f, Emp_PhoneNo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                <input
                  type="email"
                  value={empForm.Emp_Email}
                  onChange={e => setEmpForm(f => ({ ...f, Emp_Email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="email@shakeys.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  {modal.type === 'edit-emp' ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={empForm.Emp_Password}
                  onChange={e => setEmpForm(f => ({ ...f, Emp_Password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder={modal.type === 'edit-emp' ? 'Leave blank to keep current' : 'Set a password'}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Hire Date</label>
                <input
                  type="date"
                  value={empForm.Emp_HireDate}
                  onChange={e => setEmpForm(f => ({ ...f, Emp_HireDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                />
              </div>
              {modal.type === 'edit-emp' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Status</label>
                  <select
                    value={empForm.Emp_Status}
                    onChange={e => setEmpForm(f => ({ ...f, Emp_Status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={
                  saving ||
                  !empForm.Emp_FName || !empForm.Emp_LName ||
                  !empForm.Emp_PhoneNo || !empForm.Emp_Email ||
                  !empForm.Emp_BranchID ||
                  (modal.type === 'add-emp' && !empForm.Emp_Password)
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? 'Saving...' : modal.type === 'add-emp' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Form Modal */}
      {(modal.type === 'add-rider' || modal.type === 'edit-rider') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modal.type === 'add-rider' ? 'Add Rider' : 'Edit Rider'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={riderForm.Rider_FName}
                    onChange={e => setRiderForm(f => ({ ...f, Rider_FName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={riderForm.Rider_LName}
                    onChange={e => setRiderForm(f => ({ ...f, Rider_LName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone Number</label>
                <input
                  type="text"
                  value={riderForm.Rider_PhoneNo}
                  onChange={e => setRiderForm(f => ({ ...f, Rider_PhoneNo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Branch</label>
                <select
                  value={admin?.Emp_BranchID || riderForm.Rider_BranchID}
                  disabled
                  onChange={e => setRiderForm(f => ({ ...f, Rider_BranchID: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  {branches.map(b => (
                    <option key={b.Brnch_ID} value={b.Brnch_ID}>
                      {b.Brnch_ID} â€” {b.Brnch_Name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  {modal.type === 'edit-rider' ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={riderForm.Rider_Password}
                  onChange={e => setRiderForm(f => ({ ...f, Rider_Password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder={modal.type === 'edit-rider' ? 'Leave blank to keep current' : 'Set a password'}
                />
              </div>
              {modal.type === 'edit-rider' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Status</label>
                  <select
                    value={riderForm.Rider_Status}
                    onChange={e => setRiderForm(f => ({ ...f, Rider_Status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveRider}
                disabled={
                  saving ||
                  !riderForm.Rider_FName || !riderForm.Rider_LName ||
                  !riderForm.Rider_PhoneNo || !riderForm.Rider_BranchID ||
                  (modal.type === 'add-rider' && !riderForm.Rider_Password)
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? 'Saving...' : modal.type === 'add-rider' ? 'Add Rider' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-container" style={{ justifyContent: 'space-evenly' }}>
          <div className="header-logo" style={{ pointerEvents: 'none' }}>
            <span className="header-logo-text">{"Shakey's"}</span>
            <span className="header-logo-tagline">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('employees')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${tab === 'employees'
                  ? 'bg-white text-red-600 border-2 border-white'
                  : 'text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40'}`}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Employees
            </button>
            <button
              onClick={() => setTab('riders')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${tab === 'riders'
                  ? 'bg-white text-red-600 border-2 border-white'
                  : 'text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40'}`}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Riders
            </button>
            <Link
              href="/admin/menu"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Menu Availability
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {tab === 'employees' ? (
              <>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-green-300" />{activeEmployees} Active
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />{inactiveEmployees} Inactive
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-green-300" />{activeRiders} Active
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />{inactiveRiders} Inactive
                </div>
              </>
            )}
            <div className="h-4 w-px bg-white/30" />
            <div className="header-user-info">
              <button onClick={() => router.push('/admin/profile')} className="header-user-name" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}>
                {admin?.Emp_FName} {admin?.Emp_LName}
                <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
                  {admin?.Brnch_Name || `Branch ${admin?.Emp_BranchID}`}
                </span>
              </button>
              <button onClick={handleLogout} className="header-logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tab === 'employees' ? 'Employee Management' : 'Rider Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {tab === 'employees'
                ? 'Only employees from your assigned branch are shown.'
                : 'Only riders from your assigned branch are shown.'}
            </p>
          </div>
          <button
            onClick={tab === 'employees' ? openAddEmployee : openAddRider}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {tab === 'employees' ? 'Add Employee' : 'Add Rider'}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {tab === 'employees' && (
              <>
                <div className="grid grid-cols-[72px_130px_120px_150px_90px_140px_80px_100px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>ID</span><span>Name</span><span>Position</span><span>Contact Info</span>
                  <span>Hire Date</span><span>Branch</span><span>Status</span><span></span>
                </div>
                {employees.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-400 text-sm">No employees found.</div>
                ) : employees.map((emp, idx) => (
                  <div key={emp.Emp_ID}
                    className={`grid grid-cols-[72px_130px_120px_150px_90px_140px_80px_100px] gap-3 px-6 py-4 items-center
                      ${idx !== employees.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}
                  >
                    <span className="text-sm text-gray-400 font-mono">{emp.Emp_ID}</span>
                    <div className="text-sm font-bold text-gray-900 truncate">{emp.Emp_FName} {emp.Emp_LName}</div>
                    <span className="text-sm text-gray-500 truncate">{emp.Emp_Position}</span>
                    <div>
                      <div className="text-sm text-gray-700 truncate">{emp.Emp_PhoneNo}</div>
                      <div className="text-xs text-gray-400 truncate">{emp.Emp_Email}</div>
                    </div>
                    <span className="text-sm text-gray-500">{emp.Emp_HireDate}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-700 truncate">{emp.Emp_BranchID}</div>
                      <div className="text-xs text-gray-400 truncate">{emp.Brnch_Name}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit
                      ${emp.Emp_Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.Emp_Status}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEditEmployee(emp)} className="text-blue-400 hover:text-blue-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setModal({ type: 'delete-emp', data: emp })} className="text-red-400 hover:text-red-600 transition-colors">
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

            {tab === 'riders' && (
              <>
                <div className="grid grid-cols-[180px_180px_180px_200px_180px_10px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>ID</span><span>Name</span><span>Contact Info</span><span>Branch</span><span>Status</span><span></span>
                </div>
                {riders.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-400 text-sm">No riders found.</div>
                ) : riders.map((rider, idx) => (
                  <div key={rider.Rider_ID}
                    className={`grid grid-cols-[180px_180px_180px_200px_180px_40px] gap-3 px-6 py-4 items-center
                      ${idx !== riders.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}
                  >
                    <span className="text-sm text-gray-400 font-mono">{rider.Rider_ID}</span>
                    <div className="text-sm font-bold text-gray-900 truncate">{rider.Rider_FName} {rider.Rider_LName}</div>
                    <span className="text-sm text-gray-700 truncate">{rider.Rider_PhoneNo}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-700 truncate">{rider.Rider_BranchID}</div>
                      <div className="text-xs text-gray-400 truncate">{rider.Brnch_Name}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit
                      ${rider.Rider_Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rider.Rider_Status}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEditRider(rider)} className="text-blue-400 hover:text-blue-600 transition-colors">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setModal({ type: 'delete-rider', data: rider })} className="text-red-400 hover:text-red-600 transition-colors">
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

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl
          ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}










