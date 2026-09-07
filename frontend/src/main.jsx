import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App.jsx';
import './index.css';

const PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  '';

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#F86015',
    colorBackground: '#0d1524',
    colorText: '#ffffff',
    colorTextSecondary: '#94a3b8',
    colorInputBackground: '#070b13',
    colorInputText: '#ffffff',
    colorInputBorder: 'rgba(248, 96, 21, 0.28)',
    borderRadius: '12px',
  },
  elements: {
    card: 'pizza-clerk-card',
    formButtonPrimary: 'pizza-clerk-btn-primary',
    socialButtonsBlockButton: 'pizza-clerk-social-btn',
    footerActionLink: 'pizza-clerk-footer-link',
    headerTitle: 'pizza-clerk-header-title',
    headerSubtitle: 'pizza-clerk-header-subtitle',
  },
};

class ClerkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#06111e',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            background: 'rgba(16, 23, 38, 0.95)',
            border: '1px solid rgba(248, 96, 21, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(248, 96, 21, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🍕</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#F86015' }}>
              Clerk Configuration Required
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              Please paste your Clerk Publishable Key into <code style={{ color: '#F86015', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env</code> under <code style={{ color: '#F86015', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>VITE_CLERK_PUBLISHABLE_KEY</code>.
            </p>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #F86015 0%, #D84D08 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                padding: '10px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(248, 96, 21, 0.4)'
              }}
            >
              Get Key from Clerk Dashboard →
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkErrorBoundary>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </ClerkErrorBoundary>
  </React.StrictMode>
);

