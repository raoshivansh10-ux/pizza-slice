import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pizza,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Truck,
  Sparkles,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Heart,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import FooterInfoModal from './FooterInfoModal';

const CUSTOMER_REVIEWS = [
  {
    id: 1,
    name: 'Aarav Sharma',
    role: 'Verified Foodie',
    rating: 5,
    date: '2 days ago',
    comment: 'The crust on the Fiery Farmhouse was perfectly charred and crispy! Delivery arrived in just 22 minutes steaming hot.',
    pizza: 'Fiery Farmhouse Special',
  },
  {
    id: 2,
    name: 'Priya Mukherjee',
    role: 'Pizza Enthusiast',
    rating: 5,
    date: 'Yesterday',
    comment: 'The Stuffed Cheesy Garlic Bread with the Creamy Garlic Aioli dip is pure heaven. Truly authentic Domino’s experience!',
    pizza: 'Stuffed Cheesy Garlic Bread',
  },
  {
    id: 3,
    name: 'Rohan Kapoor',
    role: 'Weekend Host',
    rating: 5,
    date: '3 days ago',
    comment: 'Ordered the Mega Family Feast for game night. 2 huge pizzas, dips, and molten lava cakes. Everyone loved it!',
    pizza: 'Mega Family Feast',
  },
];

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);
  const { setIsOrderingModalOpen } = useCart();

  return (
    <footer className="dominos-site-footer">
      {/* 1. Customer Reviews & Trust Highlights Banner */}
      <div className="footer-reviews-banner">
        <div className="footer-container">
          <div className="reviews-section-header">
            <div className="reviews-header-left">
              <span className="reviews-badge">
                <Star size={14} fill="#FFC220" color="#FFC220" /> 4.9/5 RATED BY 250,000+ CUSTOMERS
              </span>
              <h3 className="reviews-title">Loved by Pizza Lovers Across India</h3>
              <p className="reviews-sub">
                Hand-tossed daily dough, 100% real dairy mozzarella, and 30-minute hot delivery guarantee.
              </p>
            </div>
            <div className="reviews-stats-pill">
              <div className="stat-box">
                <span className="stat-number">30 Mins</span>
                <span className="stat-label">Superfast Delivery</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-box">
                <span className="stat-number">100% Real</span>
                <span className="stat-label">Gourmet Cheese</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-box">
                <span className="stat-number">500+ Stores</span>
                <span className="stat-label">Nationwide Kitchens</span>
              </div>
            </div>
          </div>

          <div className="reviews-cards-grid">
            {CUSTOMER_REVIEWS.map((rev) => (
              <div key={rev.id} className="customer-review-card">
                <div className="review-card-top">
                  <div className="review-stars-row">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="#FFC220" color="#FFC220" />
                    ))}
                  </div>
                  <span className="review-date">{rev.date}</span>
                </div>
                <p className="review-comment">"{rev.comment}"</p>
                <div className="review-author-meta">
                  <div className="author-avatar">
                    {rev.name.charAt(0)}
                  </div>
                  <div className="author-details">
                    <span className="author-name">{rev.name}</span>
                    <span className="author-ordered">Ordered: <strong>{rev.pizza}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Brand Description & Quality Promise Strip */}
      <div className="footer-brand-story-strip">
        <div className="footer-container">
          <div className="brand-story-grid">
            <div className="brand-story-col">
              <div className="story-header">
                <Pizza size={24} color="#007DC6" />
                <h4>About Pizza Slice Artisan Kitchen</h4>
              </div>
              <p>
                Pizza Slice brings you authentic artisanal pizzas baked with love. From our secret herb marinara and hand-stretched crusts to fresh farm toppings and molten Belgian chocolate lava cakes, every meal is crafted for maximum flavor and delivered fresh to your doorstep.
              </p>
            </div>

            <div className="brand-story-col">
              <div className="story-header">
                <Clock size={24} color="#FFC220" />
                <h4>Hot & Fresh Delivery Promise</h4>
              </div>
              <p>
                Our insulated thermal pizza bags and real-time live GPS order tracking ensure that your pizzas arrive piping hot, bubbly, and fresh out of the oven in 30 minutes or less.
              </p>
            </div>

            <div className="brand-story-col">
              <div className="story-header">
                <ShieldCheck size={24} color="#10b981" />
                <h4>100% Contactless & Hygienic</h4>
              </div>
              <p>
                Safety and hygiene are our highest priorities. All kitchen staff undergo daily thermal checks, surfaces are sanitized every 4 hours, and pizzas are untouched by bare hands after baking at 245°C.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Multi-Column Links Footer (Matching User Reference Image) */}
      <div className="footer-main-links-section">
        <div className="footer-container">
          <div className="footer-columns-grid">
            {/* Column 1: Menu */}
            <div className="footer-nav-col">
              <h4 className="footer-col-title">Menu</h4>
              <ul className="footer-links-list">
                <li><Link to="/menu?category=pizza">Veg Pizza</Link></li>
                <li><Link to="/menu?category=pizza">Non-Veg Pizza</Link></li>
                <li><Link to="/menu?category=pizza">Big Big Pizza</Link></li>
                <li><Link to="/builder">Cheese Burst Pizza</Link></li>
                <li><Link to="/menu?category=drinks">Beverages</Link></li>
                <li><Link to="/menu?category=pizza">Pizza Mania</Link></li>
                <li><Link to="/menu?category=garlic-bread">Garlic Breads & Dips</Link></li>
              </ul>
            </div>

            {/* Column 2: Company */}
            <div className="footer-nav-col">
              <h4 className="footer-col-title">Company</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setActiveModal('blog')} className="footer-link-btn">Blog</button></li>
                <li><button type="button" onClick={() => setActiveModal('investors')} className="footer-link-btn">Investor</button></li>
                <li><button type="button" onClick={() => setActiveModal('ads')} className="footer-link-btn">Ads</button></li>
                <li><button type="button" onClick={() => setActiveModal('careers')} className="footer-link-btn">Careers</button></li>
                <li><button type="button" onClick={() => setActiveModal('sustainability')} className="footer-link-btn">Sustainability</button></li>
              </ul>
            </div>

            {/* Column 3: Pizza Restaurants */}
            <div className="footer-nav-col">
              <h4 className="footer-col-title">Pizza Restaurants</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setActiveModal('restaurants')} className="footer-link-btn">Restaurants Near Me</button></li>
                <li><button type="button" onClick={() => setActiveModal('pizza-near-me')} className="footer-link-btn">Pizza Near Me</button></li>
                <li><button type="button" onClick={() => setActiveModal('food-near-me')} className="footer-link-btn">Food Near Me</button></li>
                <li><button type="button" onClick={() => setActiveModal('food-delivery')} className="footer-link-btn">Food Delivery</button></li>
                <li><button type="button" onClick={() => setActiveModal('italian-food')} className="footer-link-btn">Italian Food</button></li>
                <li><button type="button" onClick={() => setIsOrderingModalOpen(true)} className="footer-link-btn highlight-gold">Order Food Online</button></li>
              </ul>
            </div>

            {/* Column 4: About */}
            <div className="footer-nav-col">
              <h4 className="footer-col-title">About</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setActiveModal('gift-card')} className="footer-link-btn">Gift card</button></li>
                <li><button type="button" onClick={() => setActiveModal('balance-enquiry')} className="footer-link-btn">Gift Card Balance Enquiry</button></li>
                <li><button type="button" onClick={() => setActiveModal('pizza-party')} className="footer-link-btn">Virtual Pizza Party</button></li>
                <li><button type="button" onClick={() => setActiveModal('vouchers')} className="footer-link-btn">E-Gift Vouchers</button></li>
                <li><button type="button" onClick={() => setActiveModal('franchise')} className="footer-link-btn">Franchise Queries</button></li>
              </ul>
            </div>

            {/* Column 5: Legal */}
            <div className="footer-nav-col">
              <h4 className="footer-col-title">Legal</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setActiveModal('terms')} className="footer-link-btn">Terms & Conditions</button></li>
                <li><button type="button" onClick={() => setActiveModal('privacy')} className="footer-link-btn">Privacy Policy</button></li>
                <li><button type="button" onClick={() => setActiveModal('disclaimer')} className="footer-link-btn">Disclaimer</button></li>
                <li><button type="button" onClick={() => setActiveModal('cookies')} className="footer-link-btn">Cookie Settings</button></li>
                <li><button type="button" onClick={() => setActiveModal('security')} className="footer-link-btn">Security</button></li>
              </ul>
            </div>

            {/* Column 6: Social Media & Contact Hotline (Matching Screenshot) */}
            <div className="footer-nav-col social-contact-col">
              <h4 className="footer-col-title">SOCIAL MEDIA</h4>
              
              {/* Social Icons matching screenshot */}
              <div className="footer-social-icons-row">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Twitter">
                  <Twitter size={18} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube">
                  <Youtube size={18} />
                </a>
              </div>

              {/* Red/Blue Helpline Hotline Box matching user screenshot */}
              <div className="dominos-helpline-box">
                <div className="helpline-header-strip">
                  <span>HELLO PIZZA SLICE</span>
                </div>
                <a href="tel:18002081234" className="helpline-number-strip">
                  <Phone size={16} />
                  <span>1800 208 1234</span>
                </a>
              </div>

              {/* Direct Support Details */}
              <div className="footer-contact-details">
                <div className="contact-item">
                  <Mail size={14} color="#007DC6" />
                  <span>care@pizzaslice.com</span>
                </div>
                <div className="contact-item">
                  <Clock size={14} color="#FFC220" />
                  <span>Open 24/7 • Mon to Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Copyright Strip */}
      <div className="footer-bottom-copyright">
        <div className="footer-container">
          <p className="copyright-text">
            All Rights Reserved. Copyright © Pizza Slice Foods Ltd.
          </p>
        </div>
      </div>

      {/* 5. Rich Interactive Popup Modal for all Footer Links */}
      <FooterInfoModal
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </footer>
  );
};

export default Footer;
