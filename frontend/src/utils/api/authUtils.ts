// src/utils/authUtils.ts
export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
};

/**
 * Refresh the access token using the stored refresh token.
 */
export const refreshToken = async () => {
  try {
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!storedRefreshToken) throw new Error('No refresh token available');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
    return data.accessToken;
  } catch (error) {
    console.error('Refresh token error:', error);
    return null;
  }
};

/**
 * Clears local storage and logs the user out.
 * Redirects to the login page.
 */
export const forceLogout = ( ) =>  {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  window.location.href = '/login'; // Redirect to login
};
