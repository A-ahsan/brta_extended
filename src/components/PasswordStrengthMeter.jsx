import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ShieldCheck } from 'phosphor-react';

const PasswordStrengthMeter = ({ password, language = 'en' }) => {
  const [strength, setStrength] = useState({
    score: 0,
    label: '',
    color: '',
    percentage: 0,
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    }
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        label: '',
        color: '',
        percentage: 0,
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        }
      });
      return;
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;']/.test(password),
    };

    // Calculate score based on checks
    const passedChecks = Object.values(checks).filter(Boolean).length;
    let score = 0;
    let label = '';
    let color = '';
    let percentage = 0;

    if (passedChecks === 5) {
      score = 3;
      label = language === 'en' ? 'Strong' : 'শক্তিশালী';
      color = 'bg-green-500';
      percentage = 100;
    } else if (passedChecks >= 3) {
      score = 2;
      label = language === 'en' ? 'Medium' : 'মধ্যম';
      color = 'bg-yellow-500';
      percentage = 60;
    } else {
      score = 1;
      label = language === 'en' ? 'Weak' : 'দুর্বল';
      color = 'bg-red-500';
      percentage = 30;
    }

    setStrength({ score, label, color, percentage, checks });
  }, [password, language]);

  const requirements = [
    {
      key: 'length',
      label: language === 'en' ? 'At least 8 characters' : 'কমপক্ষে ৮ অক্ষর',
    },
    {
      key: 'uppercase',
      label: language === 'en' ? 'One uppercase letter (A-Z)' : 'একটি বড় হাতের অক্ষর (A-Z)',
    },
    {
      key: 'lowercase',
      label: language === 'en' ? 'One lowercase letter (a-z)' : 'একটি ছোট হাতের অক্ষর (a-z)',
    },
    {
      key: 'number',
      label: language === 'en' ? 'One number (0-9)' : 'একটি সংখ্যা (0-9)',
    },
    {
      key: 'special',
      label: language === 'en' ? 'One special character (!@#$...)' : 'একটি বিশেষ অক্ষর (!@#$...)',
    },
  ];

  const isPasswordValid = () => {
    return Object.values(strength.checks).every(check => check === true);
  };

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === 'en' ? 'Password Strength:' : 'পাসওয়ার্ডের শক্তি:'}
          </span>
          {strength.label && (
            <span className={`text-sm font-bold ${
              strength.score === 3 ? 'text-green-600' : 
              strength.score === 2 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {strength.label}
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${strength.color} transition-all duration-300 ease-out`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} weight="bold" className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {language === 'en' ? 'Password Requirements:' : 'পাসওয়ার্ড প্রয়োজনীয়তা:'}
          </span>
        </div>
        {requirements.map((req) => (
          <div key={req.key} className="flex items-center gap-2">
            {strength.checks[req.key] ? (
              <CheckCircle size={16} weight="fill" className="text-green-500 flex-shrink-0" />
            ) : (
              <XCircle size={16} weight="fill" className="text-gray-400 flex-shrink-0" />
            )}
            <span className={`text-xs ${
              strength.checks[req.key] 
                ? 'text-green-600 dark:text-green-400 font-medium' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Validation Status */}
      {!isPasswordValid() && password.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle size={18} weight="fill" className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400">
            {language === 'en' 
              ? 'Please meet all requirements to create a secure password' 
              : 'একটি সুরক্ষিত পাসওয়ার্ড তৈরি করতে সকল প্রয়োজনীয়তা পূরণ করুন'
            }
          </p>
        </div>
      )}

      {isPasswordValid() && (
        <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle size={18} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            {language === 'en' 
              ? 'Great! Your password meets all requirements' 
              : 'চমৎকার! আপনার পাসওয়ার্ড সব প্রয়োজনীয়তা পূরণ করেছে'
            }
          </p>
        </div>
      )}
    </div>
  );
};

// Export validation function for use in forms
export const validatePassword = (password) => {
  if (!password) return false;
  
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;']/.test(password),
  };

  return Object.values(checks).every(check => check === true);
};

export default PasswordStrengthMeter;
