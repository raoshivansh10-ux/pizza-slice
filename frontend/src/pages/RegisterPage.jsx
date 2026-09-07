import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Pizza } from 'lucide-react';

const RegisterPage = () => {
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
          <h2>Create Your Account</h2>
          <p>Join Pizza Slice rewards, customize pizzas, and enjoy hot artisan deliveries</p>
        </div>

        {/* Official Clerk SignUp Component */}
        <div className="clerk-component-wrapper">
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            fallbackRedirectUrl={redirectUrl}
            signInFallbackRedirectUrl={redirectUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
