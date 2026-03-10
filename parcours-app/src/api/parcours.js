import client from './client';

// --- Parcours ---
const POI_FIELDS = ['name', 'description', 'latitude', 'longitude', 'image_url', 'category', 'google_place_id'];

export const fetchParcours = async (params = {}) => {
  const populate = {
    'populate[parcours_items][fields][0]': 'order',
    'populate[parcours_items][populate][poi][fields][0]': 'name',
    'populate[parcours_items][populate][poi][fields][1]': 'latitude',
    'populate[parcours_items][populate][poi][fields][2]': 'longitude',
    'populate[parcours_items][populate][poi][fields][3]': 'description',
    'populate[parcours_items][populate][poi][fields][4]': 'image_url',
    'populate[parcours_items][populate][poi][fields][5]': 'category',
    'populate[reviews][fields][0]': 'rating',
    'populate[reviews][fields][1]': 'comment',
  };
  const res = await client.get('/parcourss', { params: { ...populate, ...params } });
  return res.data;
};

export const fetchParcoursById = async (id) => {
  const res = await client.get(`/parcourss/${id}`, {
    params: {
      'populate[parcours_items][fields][0]': 'order',
      'populate[parcours_items][populate][poi][fields][0]': 'name',
      'populate[parcours_items][populate][poi][fields][1]': 'latitude',
      'populate[parcours_items][populate][poi][fields][2]': 'longitude',
      'populate[parcours_items][populate][poi][fields][3]': 'description',
      'populate[parcours_items][populate][poi][fields][4]': 'image_url',
      'populate[parcours_items][populate][poi][fields][5]': 'category',
      'populate[reviews][fields][0]': 'rating',
      'populate[reviews][fields][1]': 'comment',
      'populate[reviews][populate][users_permissions_user][fields][0]': 'username',
    },
  });
  return res.data;
};

export const createParcours = async (data) => {
  const res = await client.post('/parcourss', { data });
  return res.data;
};

export const updateParcours = async (id, data) => {
  const res = await client.put(`/parcourss/${id}`, { data });
  return res.data;
};

export const deleteParcours = async (id) => {
  const res = await client.delete(`/parcourss/${id}`);
  return res.data;
};

// --- POIs ---
export const fetchPois = async () => {
  const res = await client.get('/pois');
  return res.data;
};

export const createPoi = async (data) => {
  const res = await client.post('/pois', { data });
  return res.data;
};

// --- Parcours Items ---
export const createParcoursItem = async (data) => {
  const res = await client.post('/parcours-items', { data });
  return res.data;
};

export const deleteParcoursItem = async (id) => {
  const res = await client.delete(`/parcours-items/${id}`);
  return res.data;
};

// --- Reviews ---
export const fetchReviews = async (parcoursId) => {
  const res = await client.get('/reviews', {
    params: {
      'filters[parcours][id][$eq]': parcoursId,
      'populate[users_permissions_user]': '*',
    },
  });
  return res.data;
};

export const createReview = async (data) => {
  const res = await client.post('/reviews', { data });
  return res.data;
};

// --- UserParcours ---
export const fetchUserParcours = async (userId) => {
  const res = await client.get('/user-parcourss', {
    params: {
      'filters[users_permissions_user][id][$eq]': userId,
      'populate[parcours][populate][parcours_items][populate][poi]': '*',
    },
  });
  return res.data;
};

export const createUserParcours = async (data) => {
  const res = await client.post('/user-parcourss', { data });
  return res.data;
};

export const updateUserParcours = async (id, data) => {
  const res = await client.put(`/user-parcourss/${id}`, { data });
  return res.data;
};

// --- Badges ---
export const fetchBadges = async () => {
  const res = await client.get('/badges');
  return res.data;
};

export const fetchUserBadges = async (userId) => {
  const res = await client.get('/user-badges', {
    params: {
      'filters[users_permissions_user][id][$eq]': userId,
      'populate[badge]': '*',
    },
  });
  return res.data;
};
