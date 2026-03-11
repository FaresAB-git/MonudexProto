import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::parcours.parcours', ({ strapi }) => ({

  // Retourne les parcours créés par l'utilisateur connecté
  async findMe(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const entities = await strapi.documents('api::parcours.parcours').findMany({
      filters: { users_permissions_user: { id: { $eq: userId } } } as any,
      populate: {
        parcours_items: { populate: { poi: { fields: ['name', 'latitude', 'longitude'] } } },
      },
    });

    const { sanitizeOutput } = this as any;
    const sanitized = await sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitized);
  },

  async create(ctx) {
    const userId = ctx.state.user?.id;
    const { sanitizeInput, sanitizeOutput } = this as any;
    const sanitizedInput = await sanitizeInput(ctx.request.body?.data ?? {}, ctx);

    const entity = await strapi.documents('api::parcours.parcours').create({
      data: {
        ...sanitizedInput,
        ...(userId ? { users_permissions_user: userId } : {}),
      },
      populate: ['users_permissions_user'],
    });

    const sanitizedOutput = await sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedOutput);
  },

  async update(ctx) {
    const userId = ctx.state.user?.id;
    const { sanitizeInput, sanitizeOutput } = this as any;
    const sanitizedInput = await sanitizeInput(ctx.request.body?.data ?? {}, ctx);

    const entity = await strapi.documents('api::parcours.parcours').update({
      documentId: ctx.params.id,
      data: {
        ...sanitizedInput,
        ...(userId ? { users_permissions_user: userId } : {}),
      },
    });

    const sanitizedOutput = await sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedOutput);
  },
}));
