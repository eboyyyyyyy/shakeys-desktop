'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useBranch } from '@/context/BranchContext';
import Header from '@/components/Header';
import {
  fetchActiveBranches,
  fetchMenuItems,
  type CompatBranch,
  type CompatMenuItem,
} from '@/lib/firebase/catalogService';
import '@/styles/menu.css';

const categoryIcons: Record<string, string> = {
  Pizza: 'Pizza',
  Chicken: 'Chicken',
  Pasta: 'Pasta',
  Sides: 'Sides',
  Drinks: 'Drinks',
  Desserts: 'Desserts',
};

const menuImages: Record<string, string> = {
  '10001': '/menu/classic-thin-crust.png',
  '10002': '/menu/hawaiian-delight.png',
  '10003': '/menu/pepperoni-lovers.png',
  '10004': '/menu/manager-choice.png',
  '10005': '/menu/garden-special.png',
  '10006': '/menu/four-seasons.png',
  '10007': '/menu/chicken-n-mojos.png',
  '10008': '/menu/garlic-butter-chicken.png',
  '10009': '/menu/buffalo-wings.png',
  '10010': '/menu/honey-glazed-chicken.png',
  '10011': '/menu/carbonara-supreme.png',
  '10012': '/menu/classic-spaghetti.png',
  '10013': '/menu/baked-ziti.png',
  '10014': '/menu/garlic-shrimp-pasta.png',
  '10015': '/menu/mojos-regular.png',
  '10016': '/menu/mojos-large.png',
  '10017': '/menu/garlic-bread.png',
  '10018': '/menu/coleslaw.png',
  '10019': '/menu/pepsi-regular.jpg',
  '10020': '/menu/pepsi-large.png',
  '10021': '/menu/mountain-dew-regular.jpg',
  '10022': '/menu/iced-tea.png',
  '10023': '/menu/bottled-water.png',
  '10024': '/menu/halo-halo.png',
  '10025': '/menu/mango-graham.jpg',
  '10026': '/menu/ice-cream-sundae.png',
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<CompatMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<CompatBranch[]>([]);

  const { addItem } = useCart();
  const { selectedBranch, setSelectedBranch } = useBranch();

  useEffect(() => {
    async function fetchData() {
      try {
        let [menuData, branchData] = await Promise.all([
          fetchMenuItems(),
          fetchActiveBranches(),
        ]);

        if (menuData.length === 0) {
          const menuRes = await fetch('/api/menu');
          const fallbackMenu = await menuRes.json();
          menuData = Array.isArray(fallbackMenu) ? fallbackMenu : [];
        }

        if (branchData.length === 0) {
          const branchRes = await fetch('/api/branches?active=true');
          const fallbackBranches = await branchRes.json();
          branchData = Array.isArray(fallbackBranches) ? fallbackBranches : [];
        }

        const nextCategories = Array.from(
          new Set(menuData.map((item) => item.Menu_Category).filter(Boolean))
        ).sort();

        setMenuItems(menuData);
        setCategories(['All', ...nextCategories]);
        setBranches(branchData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setMenuItems([]);
        setCategories(['All']);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  const filteredItems =
    selectedCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.Menu_Category === selectedCategory);

  const handleAddToCart = (item: CompatMenuItem) => {
    addItem({
      Menu_ID: Number(item.Menu_ID),
      Menu_Name: item.Menu_Name,
      Menu_Description: item.Menu_Description,
      Menu_Category: item.Menu_Category,
      Menu_Price: item.discountedPrice || item.Menu_Price,
      Menu_Availability: item.Menu_Availability,
    });
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) {
      setSelectedBranch(null);
      return;
    }
    const branch = branches.find((entry) => String(entry.Brnch_ID) === id) || null;
    setSelectedBranch(branch);
  };

  return (
    <div className="menu-page">
      <Header />

      <section className="menu-hero">
        <h1 className="menu-hero-title">Our Menu</h1>
        <p className="menu-hero-subtitle">
          Fresh ingredients, classic recipes, and your favorite flavors delivered to your door
        </p>
      </section>

      <div className="menu-container">
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              background: 'white',
              border: '1.5px solid #e5e5e5',
              borderRadius: '999px',
              padding: '8px 16px 8px 12px',
              gap: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              minWidth: '220px',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#c8102e" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              value={selectedBranch ? String(selectedBranch.Brnch_ID) : ''}
              onChange={handleBranchChange}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 500,
                color: selectedBranch ? '#1a1a1a' : '#888',
                cursor: 'pointer',
                width: '100%',
                appearance: 'none',
              }}
            >
              <option value="">Select a Branch...</option>
              {branches.map((branch) => (
                <option key={String(branch.Brnch_ID)} value={String(branch.Brnch_ID)}>
                  {branch.Brnch_Name} - {branch.Brnch_City}
                </option>
              ))}
            </select>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#888"
              strokeWidth={2}
              style={{ flexShrink: 0, pointerEvents: 'none' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {!selectedBranch && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#fffef0',
              border: '1px solid #e8d95a',
              borderLeft: '4px solid #d4a017',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#7a5c00',
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#d4a017" strokeWidth={2} style={{ flexShrink: 0 }}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Please select a branch to ensure these items are available for delivery to your location.
          </div>
        )}

        <div className="menu-categories">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`menu-category-btn ${selectedCategory === category ? 'active' : ''}`}
            >
              {category !== 'All' && categoryIcons[category]} {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="menu-loading">
            <div className="menu-loading-spinner" />
            <p className="menu-loading-text">Loading menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="menu-empty">
            <div className="menu-empty-icon">Menu</div>
            <p className="menu-empty-text">No items found in this category</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredItems.map((item) => (
              <div
                key={String(item.Menu_ID)}
                className={`menu-card ${item.Menu_Availability === 'N' ? 'menu-card-unavailable' : ''}`}
              >
                <div className="menu-card-image">
                  {(item.Menu_Image || menuImages[String(item.Menu_ID)]) ? (
                    <Image
                      src={(item.Menu_Image || menuImages[String(item.Menu_ID)]) as string}
                      alt={item.Menu_Name}
                      fill
                      className="menu-card-img"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="menu-card-image-placeholder">
                      {categoryIcons[item.Menu_Category] || 'Menu'}
                    </span>
                  )}
                </div>
                <div className="menu-card-content">
                  <span className="menu-card-category">{item.Menu_Category}</span>
                  <h3 className="menu-card-name">{item.Menu_Name}</h3>
                  <p className="menu-card-description">
                    {item.Menu_Description || 'A delicious menu item from our kitchen'}
                  </p>
                  <div className="menu-card-footer">
                    <div className="menu-card-price">
                      {item.discountRate && item.discountedPrice && (
                        <span className="menu-card-price-original">₱{item.Menu_Price.toFixed(2)}</span>
                      )}
                      <span className="menu-card-price-current">
                        ₱{(item.discountedPrice ?? item.Menu_Price).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="menu-card-add-btn"
                      disabled={item.Menu_Availability === 'N'}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
