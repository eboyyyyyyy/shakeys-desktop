import Link from 'next/link';
import Header from '@/components/Header';
import '@/styles/home.css';
import Image from 'next/image';

const popularItems = [
  { name: 'Classic Thin Crust Pizza', price: 399, image: '/menu/classic-thin-crust.png' },
  { name: 'Chicken N Mojos', price: 299, image: '/menu/chicken-n-mojos.png' },
  { name: 'Carbonara Supreme', price: 249, image: '/menu/carbonara-supreme.png' },
  { name: 'Mojos Large', price: 149, image: '/menu/mojos-large.png' },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <Header />

      <section className="home-hero">
        <div className="home-hero-container">
          <h1 className="home-hero-title">
            {"Shakey's Delivers Happiness"}
          </h1>
          <p className="home-hero-subtitle">
            {"Your favorite pizza, chicken, and pasta delivered hot and fresh to your door. Order now and experience the Shakey's difference!"}
          </p>
          <div className="home-hero-actions">
            <Link href="/menu" className="home-hero-btn home-hero-btn-primary">
              Order Now
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link href="/track" className="home-hero-btn home-hero-btn-secondary">
              Track Order
            </Link>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-features-container">
          <h2 className="home-features-title">Why Choose Us</h2>
          <div className="home-features-grid">
            <div className="home-feature-card">
              <div className="home-feature-icon">
                <Image src="/dashboard/rocket.png" alt="Fast Delivery" width={48} height={48} />
              </div>
              <h3 className="home-feature-title">Fast Delivery</h3>
              <p className="home-feature-text">
                Get your order delivered in 30 minutes or less. We prioritize speed without compromising quality.
              </p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">
                <Image src="/dashboard/star.png" alt="Best Quality" width={48} height={48} />
              </div>
              <h3 className="home-feature-title">Best Quality</h3>
              <p className="home-feature-text">
                Fresh ingredients and authentic recipes that have been loved for over 45 years.
              </p>
            </div>
            <div className="home-feature-card">
              <div className="home-feature-icon">
                <Image src="/dashboard/card.png" alt="Easy Payment" width={48} height={48} />
              </div>
              <h3 className="home-feature-title">Easy Payment</h3>
              <p className="home-feature-text">
                Multiple payment options including Cash, GCash, Maya, and Credit Cards.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-popular">
        <div className="home-popular-container">
          <div className="home-popular-header">
            <h2 className="home-popular-title">Customer Favorites</h2>
            <Link href="/menu" className="home-popular-link">
              View All Menu
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="home-popular-grid">
            {popularItems.map((item) => (
              <Link href="/menu" key={item.name} className="home-popular-card">
                <div className="home-popular-image" style={{ position: 'relative', overflow: 'hidden' }}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="home-popular-content">
                  <h3 className="home-popular-name">{item.name}</h3>
                  <p className="home-popular-price">₱{item.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-container">
          <h2 className="home-cta-title">Ready to Order?</h2>
          <p className="home-cta-text">
            {"Join Shakey's SuperCard and earn points on every order. Get exclusive discounts and birthday treats!"}
          </p>
          <Link href="/login" className="home-cta-btn">
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  );
}