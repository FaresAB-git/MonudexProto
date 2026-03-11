export default {
  routes: [
    {
      method: 'GET',
      path: '/user-parcourss/me',
      handler: 'user-parcours.findMe',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/user-parcourss',
      handler: 'user-parcours.find',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/user-parcourss',
      handler: 'user-parcours.create',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/user-parcourss/:id',
      handler: 'user-parcours.findOne',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/user-parcourss/:id',
      handler: 'user-parcours.update',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/user-parcourss/:id',
      handler: 'user-parcours.delete',
      config: { policies: [], middlewares: [] },
    },
  ],
};
