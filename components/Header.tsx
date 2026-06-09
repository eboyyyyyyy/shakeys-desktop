'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useCustomer } from '@/context/CustomerContext';
import '@/styles/header.css';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { getItemCount } = useCart();
  const { customer, isLoggedIn, logout } = useCustomer();
  const itemCount = getItemCount();

  return (
    <header className="header">
      <div className="header-container">
        <Link href="/" className="header-logo">
          <span className="header-logo-text">{"Shakey's"}</span>
          <span className="header-logo-tagline">Delivery</span>
        </Link>

        <nav className="header-nav">
          <div className="header-nav-links">
            <Link 
              href="/menu" 
              className={`header-nav-link ${pathname === '/menu' ? 'active' : ''}`}
            >
              Menu
            </Link>
            <Link 
              href="/track" 
              className={`header-nav-link ${pathname === '/track' ? 'active' : ''}`}
            >
              Track Order
            </Link>
          </div>

          <div className="header-actions">
            <Link href="/cart" className="header-cart-btn">
              <svg className="header-cart-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="header-cart-badge">{itemCount}</span>
              )}
            </Link>

            {isLoggedIn && customer ? (
              <div className="header-user-info">  
                <div>
                  <button
                    onClick={() => router.push('/customer/profile')}
                    className="header-user-name"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
                  >
                    {customer.Cust_FirstName}
                  </button>
                  {customer.Mem_Points !== undefined && (
                    <div className="header-user-points">{customer.Mem_Points} pts</div>
                  )}
                </div>
                <button onClick={logout} className="header-logout-btn">
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="header-user-btn">
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
