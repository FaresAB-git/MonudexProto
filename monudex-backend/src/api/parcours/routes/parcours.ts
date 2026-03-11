import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Route custom : parcours de l'utilisateur connecté
    {
      method: 'GET',
      path: '/parcourss/me',
      handler: 'parcours.findMe',
      config: { policies: [], middlewares: [] },
    },
    // Routes CRUD standards
    {
      method: 'GET',
      path: '/parcourss',
      handler: 'parcours.find',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/parcourss',
      handler: 'parcours.create',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/parcourss/:id',
      handler: 'parcours.findOne',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/parcourss/:id',
      handler: 'parcours.update',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/parcourss/:id',
      handler: 'parcours.delete',
      config: { policies: [], middlewares: [] },
    },
  ],
};
