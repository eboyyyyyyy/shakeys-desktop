'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmployee } from '@/context/EmployeeContext';
import '@/styles/header.css';

interface MenuItem {
  Menu_ID: number;
  Menu_Name: string;
  Menu_Description: string;
  Menu_Category: string;
  Menu_Price: number;
  Menu_Availability: 'Y' | 'N';
}

const categoryColors: Record<string, string> = {
  Pizza:    'bg-red-100 text-red-700',
  Chicken:  'bg-orange-100 text-orange-700',
  Pasta:    'bg-yellow-100 text-yellow-700',
  Sides:    'bg-green-100 text-green-700',
  Drinks:   'bg-blue-100 text-blue-700',
  Desserts: 'bg-purple-100 text-purple-700',
};

export default function MenuAvailabilityPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ Menu_Name: '', Menu_Description: '', Menu_Category: 'Pizza', Menu_Price: '', Menu_Availability: 'Y' });
  const [savingItem, setSavingItem] = useState(false);

  const { employee, logout, loading: authLoading } = useEmployee();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && employee === null) router.push('/login');
  }, [employee, authLoading, router]);

  useEffect(() => {
    if (employee) fetchMenu();
  }, [employee]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        setMenuItems(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (item: MenuItem) => {
    setTogglingId(item.Menu_ID);
    const newAvailability = item.Menu_Availability === 'Y' ? 'N' : 'Y';
    try {
      const res = await fetch(`/api/menu/${item.Menu_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Menu_Availability: newAvailability }),
      });
      if (res.ok) {
        setMenuItems(prev =>
          prev.map(m => m.Menu_ID === item.Menu_ID
            ? { ...m, Menu_Availability: newAvailability }
            : m
          )
        );
        showToast(
          `${item.Menu_Name} marked as ${newAvailability === 'Y' ? 'Available' : 'Unavailable'}`,
          'success'
        );
      } else {
        showToast('Failed to update availability', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  const handleAddItem = async () => {
    if (!newItem.Menu_Name || !newItem.Menu_Category || !newItem.Menu_Price) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Menu_Name: newItem.Menu_Name,
          Menu_Description: newItem.Menu_Description,
          Menu_Category: newItem.Menu_Category,
          Menu_Price: parseFloat(newItem.Menu_Price),
          Menu_Availability: newItem.Menu_Availability,
        }),
      });
      if (res.ok) {
        showToast('Menu item added successfully', 'success');
        setNewItem({ Menu_Name: '', Menu_Description: '', Menu_Category: 'Pizza', Menu_Price: '', Menu_Availability: 'Y' });
        setShowAddModal(false);
        fetchMenu();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add menu item', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.Menu_Category)))];

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = categoryFilter === 'All' || item.Menu_Category === categoryFilter;
    const matchesSearch =
      item.Menu_Name.toLowerCase().includes(search.toLowerCase()) ||
      String(item.Menu_ID).includes(search);
    return matchesCategory && matchesSearch;
  });

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add Menu Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Item Name *</label>
                <input
                  type="text"
                  value={newItem.Menu_Name}
                  onChange={e => setNewItem(i => ({ ...i, Menu_Name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="e.g., Pepperoni Pizza"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
                <input
                  type="text"
                  value={newItem.Menu_Description}
                  onChange={e => setNewItem(i => ({ ...i, Menu_Description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="Item description"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Category *</label>
                <select
                  value={newItem.Menu_Category}
                  onChange={e => setNewItem(i => ({ ...i, Menu_Category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  <option value="Pizza">Pizza</option>
                  <option value="Chicken">Chicken</option>
                  <option value="Pasta">Pasta</option>
                  <option value="Sides">Sides</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Price (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.Menu_Price}
                  onChange={e => setNewItem(i => ({ ...i, Menu_Price: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Availability</label>
                <select
                  value={newItem.Menu_Availability}
                  onChange={e => setNewItem(i => ({ ...i, Menu_Availability: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  <option value="Y">Available</option>
                  <option value="N">Unavailable</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={savingItem || !newItem.Menu_Name || !newItem.Menu_Category || !newItem.Menu_Price}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {savingItem ? 'Adding...' : 'Add Item'}
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
            <span className="header-logo-tagline">Delivery</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/employee"
              className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              Employee Portal
            </Link>
            <span className="text-sm font-semibold text-white border-b-2 border-yellow-400 pb-0.5 tracking-wide">
              Menu Availability
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchMenu}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="header-user-info">
              <div className="header-user-name">
                {employee?.Emp_FName} {employee?.Emp_LName}
              </div>
              <button onClick={handleLogout} className="header-logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Menu Availability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toggle menu items to make them available or unavailable for delivery.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm shadow-sm">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm text-gray-700 outline-none bg-transparent w-full placeholder-gray-400"
            />
          </div>

          {/* Category dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 shadow-sm outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Add Item Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm ml-auto"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading menu...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[80px_1fr_140px_100px_120px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>ID</span>
              <span>Menu Item</span>
              <span>Category</span>
              <span>Price</span>
              <span className="text-right">Availability</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                No menu items found.
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <div
                  key={item.Menu_ID}
                  className={`grid grid-cols-[80px_1fr_140px_100px_120px] gap-4 px-6 py-4 items-center
                    ${idx !== filteredItems.length - 1 ? 'border-b border-gray-100' : ''}
                    ${item.Menu_Availability === 'N' ? 'opacity-50' : ''}
                    hover:bg-gray-50 transition-colors`}
                >
                  {/* ID */}
                  <span className="text-sm text-gray-400 font-mono">{item.Menu_ID}</span>

                  {/* Name + Description */}
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.Menu_Name}</div>
                    {item.Menu_Description && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.Menu_Description}</div>
                    )}
                  </div>

                  {/* Category */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit
                    ${categoryColors[item.Menu_Category] || 'bg-gray-100 text-gray-600'}`}>
                    {item.Menu_Category}
                  </span>

                  {/* Price */}
                  <span className="text-sm font-semibold text-gray-800">
                    ₱{Number(item.Menu_Price).toFixed(2)}
                  </span>

                  {/* Toggle */}
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-xs font-bold ${item.Menu_Availability === 'Y' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.Menu_Availability === 'Y' ? 'YES' : 'NO'}
                    </span>
                    <button
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.Menu_ID}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60
                        ${item.Menu_Availability === 'Y' ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                          ${item.Menu_Availability === 'Y' ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl
          ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}