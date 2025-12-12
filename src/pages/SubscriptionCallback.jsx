import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';

const SubscriptionCallback = ({ addNotification }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const reference = urlParams.get('reference');
      const trxref = urlParams.get('trxref');

      // Use reference or trxref (they should be the same)
      const transactionRef = reference || trxref;

      if (transactionRef) {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };

          // Verify the payment with backend (backend will check with Paystack)
          const response = await API.post('/subscription/verify-payment', 
            { reference: transactionRef }, 
            config
          );

          if (response.data.success) {
            addNotification('Subscription activated successfully! 🎉', 'success');
            navigate('/chat?payment=success');
          } else {
            addNotification(response.data.message || 'Payment verification failed', 'error');
            navigate('/subscription');
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Payment verification failed';
          addNotification(errorMessage, 'error');
          navigate('/subscription');
        }
      } else {
        addNotification('Invalid payment callback', 'error');
        navigate('/subscription');
      }
    };

    handleCallback();
  }, [location.search, navigate, addNotification]);

  return (
    <div className="callback-container">
      <div className="callback-content">
        <div className="spinner"></div>
        <p>Processing your payment...</p>
      </div>

      <style jsx>{`
        .callback-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f0f2f5;
        }

        .callback-content {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 20px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1877f2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionCallback;