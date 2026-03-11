import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::user-parcours.user-parcours', ({ strapi }) => ({

  async findMe(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const entities = await strapi.documents('api::user-parcours.user-parcours').findMany({
      filters: { users_permissions_user: { id: { $eq: userId } } } as any,
      populate: {
        parcours: {
          fields: ['name', 'image_url', 'distance_km', 'duration_min', 'is_published', 'documentId'],
          populate: {
            parcours_items: {
              fields: ['order'],
              populate: { poi: { fields: ['name', 'latitude', 'longitude'] } },
            },
          },
        },
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

    const entity = await strapi.documents('api::user-parcours.user-parcours').create({
      data: {
        ...sanitizedInput,
        ...(userId ? { users_permissions_user: userId } : {}),
      },
    });

    const sanitizedOutput = await sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedOutput);
  },
}));
