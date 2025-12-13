/**
 * Email Validation Utilities
 * Prevents fake emails and ensures valid email format
 */

// List of disposable/temporary email domains
const disposableEmailDomains = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
];

// Common typo domains
const commonTypoDomains = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

/**
 * Basic email format validation
 */
export const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if email domain is disposable/temporary
 */
export const isDisposableEmail = (email) => {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableEmailDomains.includes(domain);
};

/**
 * Check if email domain is too simple (like a@a.com)
 */
export const isSimpleOrFakeEmail = (email) => {
  if (!email) return false;
  
  const [localPart, domain] = email.split('@');
  
  // Check if local part is too short or single character
  if (localPart.length < 2) return true;
  
  // Check if domain is too simple (single letter domains like a.com)
  const domainParts = domain.split('.');
  if (domainParts.some(part => part.length < 2)) return true;
  
  // Check if domain has no TLD or invalid TLD
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return true;
  
  return false;
};

/**
 * Suggest correction for common typo domains
 */
export const suggestEmailCorrection = (email) => {
  if (!email) return null;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (commonTypoDomains[domain]) {
    const localPart = email.split('@')[0];
    return `${localPart}@${commonTypoDomains[domain]}`;
  }
  
  return null;
};

/**
 * Comprehensive email validation
 * Returns object with validation result and message
 */
export const validateEmail = (email, language = 'en') => {
  // Check if email is provided
  if (!email) {
    return {
      isValid: false,
      message: language === 'en' ? 'Email is required' : 'ইমেইল প্রয়োজন',
    };
  }

  // Check basic format
  if (!isValidEmailFormat(email)) {
    return {
      isValid: false,
      message: language === 'en' 
        ? 'Please enter a valid email address' 
        : 'একটি বৈধ ইমেইল ঠিকানা লিখুন',
    };
  }

  // Check for simple/fake emails
  if (isSimpleOrFakeEmail(email)) {
    return {
      isValid: false,
      message: language === 'en' 
        ? 'Please enter a real email address (e.g., yourname@gmail.com)' 
        : 'একটি প্রকৃত ইমেইল ঠিকানা লিখুন (যেমন: yourname@gmail.com)',
    };
  }

  // Check for disposable emails
  if (isDisposableEmail(email)) {
    return {
      isValid: false,
      message: language === 'en' 
        ? 'Temporary email addresses are not allowed' 
        : 'অস্থায়ী ইমেইল ঠিকানা অনুমোদিত নয়',
    };
  }

  // Suggest correction for typos
  const suggestion = suggestEmailCorrection(email);
  if (suggestion) {
    return {
      isValid: true,
      warning: true,
      suggestion,
      message: language === 'en' 
        ? `Did you mean ${suggestion}?` 
        : `আপনি কি ${suggestion} বোঝাতে চেয়েছেন?`,
    };
  }

  // Email is valid
  return {
    isValid: true,
    message: language === 'en' ? 'Email is valid' : 'ইমেইল বৈধ',
  };
};

/**
 * Real-time email validation (debounced)
 * Use this in onChange handlers
 */
export const validateEmailRealtime = (email) => {
  if (!email) return { isValid: false, showError: false };
  
  // Only show errors after user has typed enough
  if (email.length < 3) return { isValid: false, showError: false };
  
  const result = validateEmail(email);
  return {
    ...result,
    showError: !result.isValid,
  };
};
