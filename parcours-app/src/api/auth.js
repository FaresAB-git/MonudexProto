import client from './client';

export const login = async (identifier, password) => {
  const res = await client.post('/auth/local', { identifier, password });
  return res.data; // { jwt, user }
};

export const register = async (username, email, password) => {
  const res = await client.post('/auth/local/register', { username, email, password });
  return res.data; // { jwt, user }
};

export const getMe = async () => {
  const res = await client.get('/users/me');
  return res.data;
};
