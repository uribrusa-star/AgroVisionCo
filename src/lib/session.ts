
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { User } from './types';

export const sessionOptions = {
  cookieName: 'agrovision_session',
  password: process.env.SECRET_COOKIE_PASSWORD || 'complex_password_at_least_32_characters_long_for_dev',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const session = await getIronSession<{ user?: User }>(cookies(), sessionOptions);
  return session;
}
