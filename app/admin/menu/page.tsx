'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import '@/styles/header.css';

interface MenuItem {
  Menu_ID: number;
  Menu_Name: string;
  Menu_Description: string;
  Menu_Image?: string | null;
  Menu_Category: string;
  Menu_Price: number;
  Menu_Availability: 'Y' | 'N';
}

interface MenuFormState {
  Menu_Name: string;
  Menu_Description: string;
  Menu_Category: string;
  Menu_Price: string;
  Menu_Availability: 'Y' | 'N';
  Menu_Image: string;
}

interface MenuImageOption {
  label: string;
  value: string;
}

const categoryColors: Record<string, string> = {
  Pizza: 'bg-red-100 text-red-700',
  Chicken: 'bg-orange-100 text-orange-700',
  Pasta: 'bg-yellow-100 text-yellow-700',
  Sides: 'bg-green-100 text-green-700',
  Drinks: 'bg-blue-100 text-blue-700',
  Desserts: 'bg-purple-100 text-purple-700',
};

const emptyForm: MenuFormState = {
  Menu_Name: '',
  Menu_Description: '',
  Menu_Category: 'Pizza',
  Menu_Price: '',
  Menu_Availability: 'Y',
  Menu_Image: '',
};

const defaultMenuImageOptions: MenuImageOption[] = [{ label: 'No image', value: '' }];

export default function AdminMenuAvailabilityPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuImageOptions, setMenuImageOptions] = useState<MenuImageOption[]>(defaultMenuImageOptions);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formModal, setFormModal] = useState<{ mode: 'add' | 'edit'; item: MenuItem | null } | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(emptyForm);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { admin, logout, loading: authLoading } = useAdmin();
  const router = useRouter();

  const resolveMenuImage = (item: Pick<MenuItem, 'Menu_Name' | 'Menu_Image'>) => {
    if (item.Menu_Image?.trim()) {
      return item.Menu_Image.trim();
    }

    return (
      menuImageOptions.find(
        (option) => option.value && option.label.toLowerCase() === item.Menu_Name.trim().toLowerCase()
      )?.value ?? ''
    );
  };

  useEffect(() => {
    if (!authLoading && admin === null) router.push('/login');
    if (!authLoading && admin && admin.Emp_Position !== 'Admin') router.push('/login');
  }, [admin, authLoading, router]);

  useEffect(() => {
    if (admin) {
      fetchMenu();
      fetchMenuImages();
    }
  }, [admin]);

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

  const fetchMenuImages = async () => {
    try {
      const res = await fetch('/api/menu/images');
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const dynamicOptions = Array.isArray(data) ? data : [];
      setMenuImageOptions([...defaultMenuImageOptions, ...dynamicOptions]);
    } catch (error) {
      console.error('Error fetching menu images:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setFormState(emptyForm);
    setFormModal({ mode: 'add', item: null });
  };

  const openEditModal = (item: MenuItem) => {
    setFormState({
      Menu_Name: item.Menu_Name,
      Menu_Description: item.Menu_Description || '',
      Menu_Category: item.Menu_Category,
      Menu_Price: String(item.Menu_Price),
      Menu_Availability: item.Menu_Availability,
      Menu_Image: resolveMenuImage(item),
    });
    setFormModal({ mode: 'edit', item });
  };

  const closeFormModal = () => {
    setFormModal(null);
    setFormState(emptyForm);
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
        setMenuItems((prev) =>
          prev.map((menuItem) =>
            menuItem.Menu_ID === item.Menu_ID
              ? { ...menuItem, Menu_Availability: newAvailability }
              : menuItem
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

  const handleSaveItem = async () => {
    if (!formState.Menu_Name || !formState.Menu_Category || !formState.Menu_Price) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        Menu_Name: formState.Menu_Name,
        Menu_Description: formState.Menu_Description,
        Menu_Category: formState.Menu_Category,
        Menu_Price: parseFloat(formState.Menu_Price),
        Menu_Availability: formState.Menu_Availability,
        Menu_Image: formState.Menu_Image || null,
      };

      const editingItem = formModal?.mode === 'edit' ? formModal.item : null;
      const url = editingItem ? `/api/menu/${editingItem.Menu_ID}` : '/api/menu';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || `Failed to ${editingItem ? 'update' : 'add'} menu item`, 'error');
        return;
      }

      showToast(`Menu item ${editingItem ? 'updated' : 'added'} successfully`, 'success');
      closeFormModal();
      fetchMenu();
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) {
      return;
    }

    setDeletingItemId(deleteItem.Menu_ID);
    try {
      const res = await fetch(`/api/menu/${deleteItem.Menu_ID}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to delete menu item', 'error');
        return;
      }

      if (data.deactivated) {
        showToast(data.message || 'Menu item was marked unavailable instead of deleted.', 'success');
      } else {
        showToast('Menu item deleted successfully', 'success');
      }

      setDeleteItem(null);
      fetchMenu();
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map((item) => item.Menu_Category)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.Menu_Category === categoryFilter;
    const matchesSearch =
      item.Menu_Name.toLowerCase().includes(search.toLowerCase()) ||
      String(item.Menu_ID).includes(search);
    return matchesCategory && matchesSearch;
  });

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {formModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {formModal.mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
              </h3>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600">
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
                  value={formState.Menu_Name}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="e.g., Pepperoni Pizza"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
                <input
                  type="text"
                  value={formState.Menu_Description}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="Item description"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Category *</label>
                <select
                  value={formState.Menu_Category}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Category: e.target.value }))}
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Price (PHP) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.Menu_Price}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Price: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Availability</label>
                <select
                  value={formState.Menu_Availability}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Availability: e.target.value as 'Y' | 'N' }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  <option value="Y">Available</option>
                  <option value="N">Unavailable</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Image</label>
                <select
                  value={formState.Menu_Image}
                  onChange={(e) => setFormState((item) => ({ ...item, Menu_Image: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                >
                  {menuImageOptions.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formState.Menu_Image && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <img src={formState.Menu_Image} alt="Menu item preview" className="h-36 w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeFormModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={savingItem || !formState.Menu_Name || !formState.Menu_Category || !formState.Menu_Price}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {savingItem ? 'Saving...' : formModal.mode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Delete Menu Item</h3>
              <p className="text-sm text-gray-500 mt-1">{deleteItem.Menu_Name}</p>
            </div>
            <div className="px-6 py-5 text-sm text-gray-600">
              If this item already has order history, it will be marked unavailable instead of being permanently deleted.
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleteItem(null)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={deletingItemId === deleteItem.Menu_ID}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {deletingItemId === deleteItem.Menu_ID ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-container" style={{ justifyContent: 'space-evenly' }}>
          <div className="header-logo" style={{ pointerEvents: 'none' }}>
            <span className="header-logo-text">{"Shakey\'s"}</span>
            <span className="header-logo-tagline">Branch Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
              Admin Dashboard
            </Link>
            <span className="text-sm font-semibold text-white border-b-2 border-yellow-400 pb-0.5 tracking-wide">
              Menu Management
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchMenu();
                fetchMenuImages();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="header-user-info">
              <div className="header-user-name">{admin?.Emp_FName} {admin?.Emp_LName}</div>
              <button onClick={handleLogout} className="header-logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add, edit, hide, or remove menu items for branch operations. Images come from your saved public menu assets.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm shadow-sm">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm text-gray-700 outline-none bg-transparent w-full placeholder-gray-400"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 shadow-sm outline-none cursor-pointer"
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm ml-auto"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading menu...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[80px_88px_1fr_130px_100px_120px_120px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>ID</span>
              <span>Image</span>
              <span>Menu Item</span>
              <span>Category</span>
              <span>Price</span>
              <span className="text-right">Availability</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">No menu items found.</div>
            ) : (
              filteredItems.map((item, idx) => (
                <div
                  key={item.Menu_ID}
                  className={`grid grid-cols-[80px_88px_1fr_130px_100px_120px_120px] gap-4 px-6 py-4 items-center ${idx !== filteredItems.length - 1 ? 'border-b border-gray-100' : ''} ${item.Menu_Availability === 'N' ? 'opacity-60' : ''} hover:bg-gray-50 transition-colors`}
                >
                  <span className="text-sm text-gray-400 font-mono">{item.Menu_ID}</span>

                  <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                    {resolveMenuImage(item) ? (
                      <img src={resolveMenuImage(item)} alt={item.Menu_Name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-medium text-gray-400">No image</span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.Menu_Name}</div>
                    {item.Menu_Description && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.Menu_Description}</div>
                    )}
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${categoryColors[item.Menu_Category] || 'bg-gray-100 text-gray-600'}`}>
                    {item.Menu_Category}
                  </span>

                  <span className="text-sm font-semibold text-gray-800">PHP {Number(item.Menu_Price).toFixed(2)}</span>

                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-xs font-bold ${item.Menu_Availability === 'Y' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.Menu_Availability === 'Y' ? 'YES' : 'NO'}
                    </span>
                    <button
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.Menu_ID}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${item.Menu_Availability === 'Y' ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${item.Menu_Availability === 'Y' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(item)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setDeleteItem(item)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
