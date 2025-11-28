
export default function PaymentFail() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    if (seconds === 0) {
      navigate('/dashboard');
      return;
    }
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light via-white to-muted dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center border border-red-200 dark:border-red-700">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-red-700 dark:text-red-400 mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sorry, your payment could not be processed.<br />
            Please try again or contact support if the issue persists.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Redirecting to your dashboard in <span className="font-semibold text-red-700 dark:text-red-400">{seconds} second{seconds !== 1 ? 's' : ''}</span>...
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
