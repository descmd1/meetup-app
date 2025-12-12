import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionPaywall = ({ feature, onClose }) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
    onClose && onClose();
  };

  const getFeatureDetails = () => {
    switch (feature) {
      case 'messaging':
        return {
          icon: '💬',
          title: 'Messaging Requires Premium',
          description: 'Start meaningful conversations with unlimited messaging'
        };
      case 'video-call':
        return {
          icon: '📹',
          title: 'Video Calls Require Premium',
          description: 'Connect face-to-face with high-quality video calls'
        };
      case 'audio-call':
        return {
          icon: '📞',
          title: 'Voice Calls Require Premium',
          description: 'Have intimate voice conversations with crystal clear audio'
        };
      default:
        return {
          icon: '💎',
          title: 'Premium Feature',
          description: 'This feature requires an active subscription'
        };
    }
  };

  const featureDetails = getFeatureDetails();

  return (
    <div className="paywall-overlay">
      <div className="paywall-modal">
        <button className="paywall-close" onClick={onClose}>
          ×
        </button>
        
        <div className="paywall-content">
          <div className="paywall-icon">
            {featureDetails.icon}
          </div>
          
          <h2 className="paywall-title">
            {featureDetails.title}
          </h2>
          
          <p className="paywall-description">
            {featureDetails.description}
          </p>
          
          <div className="premium-features">
            <h3>Premium Features Include:</h3>
            <ul>
              <li>💬 Unlimited messaging</li>
              <li>📹 HD video calls</li>
              <li>📞 Crystal clear voice calls</li>
              <li>🎯 Advanced matching</li>
              <li>⭐ Priority support</li>
            </ul>
          </div>
          
          <div className="pricing-info">
            <div className="price-option">
              <span className="price">₦2,000</span>
              <span className="period">/month</span>
            </div>
            <div className="price-divider">or</div>
            <div className="price-option yearly">
              <span className="price">₦20,000</span>
              <span className="period">/year</span>
              <span className="savings">Save ₦4,000!</span>
            </div>
          </div>
          
          <button 
            className="upgrade-btn"
            onClick={handleUpgrade}
          >
            Upgrade to Premium
          </button>
          
          <p className="payment-info">
            Secure payment with Paystack • Cancel anytime
          </p>
        </div>
      </div>

      <style jsx>{`
        .paywall-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }

        .paywall-modal {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .paywall-close {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          font-size: 30px;
          color: #718096;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .paywall-close:hover {
          color: #2d3748;
        }

        .paywall-content {
          text-align: center;
        }

        .paywall-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
        }

        .paywall-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 15px;
        }

        .paywall-description {
          font-size: 1.1rem;
          color: #4a5568;
          margin-bottom: 30px;
          line-height: 1.5;
        }

        .premium-features {
          text-align: left;
          background: #f7fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .premium-features h3 {
          color: #2d3748;
          margin-bottom: 15px;
          text-align: center;
        }

        .premium-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .premium-features li {
          display: flex;
          align-items: center;
          margin: 10px 0;
          font-size: 1rem;
        }

        .pricing-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .price-option {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
        }

        .period {
          color: #718096;
          font-size: 0.9rem;
        }

        .price-divider {
          color: #a0aec0;
          font-weight: 500;
        }

        .yearly {
          position: relative;
        }

        .savings {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: #48bb78;
          color: white;
          font-size: 0.8rem;
          padding: 3px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }

        .upgrade-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 15px 40px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-bottom: 15px;
        }

        .upgrade-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .payment-info {
          font-size: 0.9rem;
          color: #718096;
          margin: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        @media (max-width: 768px) {
          .paywall-modal {
            padding: 20px;
            margin: 20px;
          }

          .paywall-title {
            font-size: 1.5rem;
          }

          .pricing-info {
            flex-direction: column;
            gap: 10px;
          }

          .upgrade-btn {
            padding: 12px 30px;
          }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionPaywall;