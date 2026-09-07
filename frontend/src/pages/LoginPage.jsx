import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Pizza } from 'lucide-react';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  return (
    <div className="auth-page">
      <div className="auth-clerk-container">
        {/* Top Pizza Slice Header */}
        <div className="auth-header">
          <Link to="/" className="auth-icon-badge" title="Back to Home">
            <Pizza size={28} color="#F86015" />
          </Link>
          <h2>Welcome to Pizza Slice</h2>
          <p>Sign in to customize artisan pizzas, order fresh, and track live deliveries</p>
        </div>

        {/* Official Clerk Authentication Component */}
        <div className="clerk-component-wrapper">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            fallbackRedirectUrl={redirectUrl}
            signUpFallbackRedirectUrl={redirectUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
