/**
 * Text & Data Formatter Utilities
 */

export const truncateText = (text, maxLength = 30) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Normalizes all authentication errors into clean, human-readable strings.
 * Prevents rendering {}, [object Object], undefined, or null to the user.
 */
export const getAuthErrorMessage = (error) => {
  const status = error?.status || error?.statusCode;
  const name = error?.name || error?.constructor?.name;

  // Comprehensive console logging for development debugging
  console.error('Supabase Auth Detailed Error Log:', {
    errorObject: error,
    name,
    statusCode: status,
    errorCode: error?.code || error?.error_code,
    message: error?.message,
    description: error?.error_description,
    stack: error?.stack,
  });

  if (!error) {
    return 'Something went wrong while signing in. Please check your credentials and try again.';
  }

  // Handle case where error is passed as a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed === '{}' || trimmed === '[object Object]' || !trimmed) {
      return 'Authentication service returned an invalid error response. Please check your network and server configuration.';
    }
    return error;
  }

  // Detect Supabase AuthRetryableFetchError or HTTP 500 Network Fetch Failures
  if (name === 'AuthRetryableFetchError' || status === 500 || status === '500') {
    return 'Unable to reach authentication server (HTTP 500 Network Fetch Failure). Please verify your internet connection and backend server configuration.';
  }

  // Detect general fetch / network errors
  if (name === 'TypeError' && error.message?.includes('fetch')) {
    return 'Network request failed. Unable to connect to the authentication server.';
  }

  // Map known Supabase auth error codes
  const code = error.code || error.error_code || status;
  if (code) {
    switch (String(code).toLowerCase()) {
      case 'invalid_credentials':
      case 'invalid_grant':
        return 'Invalid email address or password. Please check your credentials and try again.';
      case 'user_not_found':
        return 'No registered account found with this email address.';
      case 'wrong_password':
        return 'Incorrect password. Please try again.';
      case 'email_not_confirmed':
        return 'Your email address has not been confirmed yet. Please check your inbox.';
      case 'over_request_rate_limit':
      case 'too_many_requests':
      case '429':
        return 'Too many login attempts. Please wait a few minutes and try again.';
      case 'signup_disabled':
        return 'New customer registration is currently disabled.';
      default:
        break;
    }
  }

  // Check error.message
  if (error.message && typeof error.message === 'string') {
    const trimmedMsg = error.message.trim();
    if (trimmedMsg !== '{}' && trimmedMsg !== '[object Object]' && trimmedMsg.length > 0) {
      return error.message;
    }
  }

  // Check error.error_description
  if (error.error_description && typeof error.error_description === 'string') {
    return error.error_description;
  }

  // Check nested error property
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }

  return 'Unable to sign in. Please verify your credentials and network connection.';
};
