import Cookies from 'js-cookie';

const REFRESH_TOKEN_KEY = 'nl_admin_refresh_token';

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  Cookies.set(REFRESH_TOKEN_KEY, token, {
    expires: 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function removeRefreshToken(): void {
  Cookies.remove(REFRESH_TOKEN_KEY);
}
