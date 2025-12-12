import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const SubscriptionBanner = ({ currentUser }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await API.get('/subscription/status', config);
        
        setSubscriptionStatus(res.data.status);
        
        // Show banner for free users or those with expiring subscriptions
        if (res.data.status === 'free' || res.data.status === 'expired') {
          setShowBanner(true);
        } else if (res.data.status === 'active' && res.data.subscription) {
          // Calculate days left
          const endDate = new Date(res.data.subscription.endDate);
          const today = new Date();
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setDaysLeft(diffDays);
          // Show banner if less than 7 days left
          if (diffDays <= 7) {
            setShowBanner(true);
          }
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    if (currentUser) {
      checkSubscription();
    }
  }, [currentUser]);

  if (!showBanner) return null;

  const getBannerContent = () => {
    if (subscriptionStatus === 'free') {
      return {
        message: '🎉 Unlock Premium Features! Chat, call, and connect with unlimited access.',
        buttonText: 'Upgrade Now - ₦2,000/month',
        className: 'free-banner'
      };
    } else if (subscriptionStatus === 'expired') {
      return {
        message: '⚠️ Your subscription has expired. Renew now to continue using premium features.',
        buttonText: 'Renew Subscription',
        className: 'expired-banner'
      };
    } else if (daysLeft <= 7) {
      return {
        message: `⏰ Your subscription expires in ${daysLeft} days. Renew to avoid interruption.`,
        buttonText: 'Renew Now',
        className: 'expiring-banner'
      };
    }
  };

  const bannerData = getBannerContent();
  if (!bannerData) return null;

  return (
    <div className={`subscription-banner ${bannerData.className}`}>
      <div className="banner-content">
        <span className="banner-message">{bannerData.message}</span>
        <div className="banner-actions">
          <button 
            className="upgrade-btn"
            onClick={() => window.location.href = '/subscription'}
          >
            {bannerData.buttonText}
          </button>
          <button 
            className="dismiss-btn"
            onClick={() => setShowBanner(false)}
            title="Dismiss for this session"
          >
            ✕
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .subscription-banner {
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 12px 20px;
          font-size: 14px;
          display: flex;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .free-banner {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .expired-banner {
          background: linear-gradient(90deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
        }
        
        .expiring-banner {
          background: linear-gradient(90deg, #ffa726 0%, #fb8c00 100%);
          color: white;
        }
        
        .banner-content {
          display: flex;
          align-items: center;
          gap: 20px;
          max-width: 1200px;
          width: 100%;
        }
        
        .banner-message {
          flex: 1;
          font-weight: 500;
        }
        
        .banner-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .upgrade-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }
        
        .upgrade-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        
        .dismiss-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        @media (max-width: 768px) {
          .subscription-banner {
            padding: 10px 15px;
            font-size: 12px;
            top: 60px;
          }
          
          .banner-content {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
          
          .banner-message {
            margin-bottom: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionBanner;