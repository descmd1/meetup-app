import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const Subscription = ({ currentUser, addNotification, onSubscriptionUpdate }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({
    monthly: false,
    yearly: false
  });

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [statusRes, plansRes] = await Promise.all([
        API.get('/subscription/status', config),
        API.get('/subscription/plans', config)
      ]);

      setSubscriptionStatus(statusRes.data);
      setPlans(plansRes.data.plans);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      addNotification('Failed to load subscription data', 'error');
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType) => {
    if (processing[planType]) return;

    try {
      setProcessing(prev => ({ ...prev, [planType]: true }));
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await API.post('/subscription/initialize-payment', 
        { planType }, 
        config
      );

      if (response.data.success) {
        // Redirect to Paystack payment page
        window.location.href = response.data.authorizationUrl;
      } else {
        addNotification(response.data.message || 'Failed to initialize payment', 'error');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      const errorMessage = error.response?.data?.message || 'Payment initialization failed';
      addNotification(errorMessage, 'error');
    } finally {
      setProcessing(prev => ({ ...prev, [planType]: false }));
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="subscription-container loading">
        <div className="spinner"></div>
        <p>Loading subscription data...</p>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h2>💎 Premium Subscription</h2>
        <p>Unlock all features and start meaningful connections</p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionStatus && (
        <div className={`current-subscription ${subscriptionStatus.subscriptionStatus}`}>
          <div className="status-info">
            <h3>Current Status</h3>
            <div className="status-badge">
              {subscriptionStatus.subscriptionStatus === 'active' ? (
                <>
                  <span className="status-icon">✅</span>
                  <span>Active Premium</span>
                </>
              ) : (
                <>
                  <span className="status-icon">🔒</span>
                  <span>Free Account</span>
                </>
              )}
            </div>
            {subscriptionStatus.subscriptionEndDate && (
              <p className="subscription-details">
                {subscriptionStatus.hasActiveSubscription ? (
                  <>
                    <strong>{subscriptionStatus.subscriptionType}</strong> subscription
                    <br />
                    Expires: {formatDate(subscriptionStatus.subscriptionEndDate)}
                    <br />
                    {subscriptionStatus.daysRemaining} days remaining
                  </>
                ) : (
                  'Subscription expired'
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Free Account Limitations */}
      {!subscriptionStatus?.hasActiveSubscription && (
        <div className="limitations-notice">
          <h3>🔒 Free Account Limitations</h3>
          <ul>
            <li>❌ Cannot send or receive messages</li>
            <li>❌ Cannot make video or audio calls</li>
            <li>✅ Can browse and view profiles</li>
            <li>✅ Can update your own profile</li>
          </ul>
          <p><strong>Upgrade to Premium to unlock all features!</strong></p>
        </div>
      )}

      {/* Subscription Plans */}
      {plans && !subscriptionStatus?.hasActiveSubscription && (
        <div className="subscription-plans">
          <h3>Choose Your Plan</h3>
          <div className="plans-grid">
            {/* Monthly Plan */}
            <div className="plan-card monthly">
              <div className="plan-header">
                <h4>Monthly Plan</h4>
                <div className="plan-price">
                  {formatAmount(plans.monthly.amount)}
                  <span className="period">/month</span>
                </div>
              </div>
              <div className="plan-features">
                {plans.monthly.features.map((feature, index) => (
                  <div key={index} className="feature">
                    <span className="feature-icon">✅</span>
                    {feature}
                  </div>
                ))}
              </div>
              <button 
                className="subscribe-btn monthly-btn"
                onClick={() => handleSubscribe('monthly')}
                disabled={processing.monthly || processing.yearly}
              >
                {processing.monthly ? 'Processing...' : 'Subscribe Monthly'}
              </button>
            </div>

            {/* Yearly Plan */}
            <div className="plan-card yearly popular">
              <div className="popular-badge">Most Popular</div>
              <div className="plan-header">
                <h4>Yearly Plan</h4>
                <div className="plan-price">
                  {formatAmount(plans.yearly.amount)}
                  <span className="period">/year</span>
                </div>
                <div className="savings">Save 2 months!</div>
              </div>
              <div className="plan-features">
                {plans.yearly.features.map((feature, index) => (
                  <div key={index} className="feature">
                    <span className="feature-icon">✅</span>
                    {feature}
                  </div>
                ))}
              </div>
              <button 
                className="subscribe-btn yearly-btn"
                onClick={() => handleSubscribe('yearly')}
                disabled={processing.monthly || processing.yearly}
              >
                {processing.yearly ? 'Processing...' : 'Subscribe Yearly'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .subscription-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .subscription-header h2 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .current-subscription {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
        }

        .current-subscription.active {
          border-color: #48bb78;
          background: linear-gradient(135deg, #f0fff4 0%, #e6ffed 100%);
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.2rem;
          font-weight: 600;
          margin: 10px 0;
        }

        .limitations-notice {
          background: #fed7d7;
          border: 2px solid #fc8181;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .limitations-notice h3 {
          color: #c53030;
          margin-bottom: 15px;
        }

        .limitations-notice ul {
          list-style: none;
          padding: 0;
        }

        .limitations-notice li {
          margin: 8px 0;
          font-size: 1.1rem;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-top: 20px;
        }

        .plan-card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
          position: relative;
          transition: transform 0.3s ease;
        }

        .plan-card:hover {
          transform: translateY(-5px);
        }

        .plan-card.popular {
          border-color: #667eea;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        }

        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 5px 20px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .plan-price {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2d3748;
          margin: 15px 0;
        }

        .period {
          font-size: 1rem;
          color: #718096;
          font-weight: 400;
        }

        .savings {
          background: #48bb78;
          color: white;
          padding: 5px 15px;
          border-radius: 15px;
          font-size: 0.9rem;
          font-weight: 600;
          display: inline-block;
          margin: 10px 0;
        }

        .plan-features {
          margin: 20px 0;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 12px 0;
          font-size: 1.1rem;
        }

        .subscribe-btn {
          width: 100%;
          padding: 15px 20px;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 20px;
        }

        .monthly-btn {
          background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
          color: white;
        }

        .yearly-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .subscribe-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .subscribe-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading {
          text-align: center;
          padding: 50px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .subscription-header h2 {
            font-size: 2rem;
          }
          
          .plans-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .plan-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Subscription;