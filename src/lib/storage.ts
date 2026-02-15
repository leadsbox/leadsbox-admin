const TOKEN_KEY = 'lb_admin_access_token';

export const getAdminToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
};

export const setAdminToken = (token?: string): void => {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
};
