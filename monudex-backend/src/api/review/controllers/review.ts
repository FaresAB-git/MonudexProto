import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::review.review', ({ strapi }) => ({

  async create(ctx) {
    const userId = ctx.state.user?.id;
    const { sanitizeInput, sanitizeOutput } = this as any;
    const sanitizedInput = await sanitizeInput(ctx.request.body?.data ?? {}, ctx);

    const entity = await strapi.documents('api::review.review').create({
      data: {
        ...sanitizedInput,
        ...(userId ? { users_permissions_user: userId } : {}),
      },
    });

    const sanitizedOutput = await sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedOutput);
  },
}));
