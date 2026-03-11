import type { Core } from '@strapi/strapi';

const SEED_POIS = [
  { name: 'Palais de l\'Isle', description: 'Ancienne prison et résidence des comtes de Genève, symbole d\'Annecy.', latitude: 45.8992, longitude: 6.1272, category: 'Monument', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Palais_de_lIsle_Annecy.jpg/640px-Palais_de_lIsle_Annecy.jpg' },
  { name: 'Château d\'Annecy', description: 'Château médiéval dominant la vieille ville, abritant aujourd\'hui un musée.', latitude: 45.9001, longitude: 6.1262, category: 'Château', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Annecy-chateau.jpg/640px-Annecy-chateau.jpg' },
  { name: 'Pont des Amours', description: 'Passerelle piétonne romantique reliant les Jardins de l\'Europe au Pâquier.', latitude: 45.8970, longitude: 6.1320, category: 'Monument', image_url: '' },
  { name: 'Jardins de l\'Europe', description: 'Parc au bord du lac d\'Annecy avec vue magnifique sur les Alpes.', latitude: 45.8983, longitude: 6.1316, category: 'Parc', image_url: '' },
  { name: 'Plage d\'Annecy', description: 'Plage municipale en plein cœur de la ville, eau cristalline du lac.', latitude: 45.8942, longitude: 6.1285, category: 'Nature', image_url: '' },
  { name: 'Le Pâquier', description: 'Grande pelouse bordant le lac, lieu de promenade et de détente.', latitude: 45.8955, longitude: 6.1303, category: 'Parc', image_url: '' },
  { name: 'Basilique de la Visitation', description: 'Basilique néo-romane sur les hauteurs offrant un panorama exceptionnel.', latitude: 45.9022, longitude: 6.1276, category: 'Église', image_url: '' },
];

const SEED_PARCOURS = [
  {
    name: 'Vieille Ville d\'Annecy',
    description: 'Annecy est surnommée la "Venise des Alpes" en raison de ses canaux qui parcourent la vieille ville. Ce parcours vous emmène à travers ses ruelles pittoresques, ses ponts fleuris et ses monuments historiques incontournables.',
    image_url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
    tags: ['Ville', 'Court', 'Histoire'],
    duration_min: 90,
    distance_km: 2.8,
    is_published: true,
    poiNames: ['Palais de l\'Isle', 'Château d\'Annecy', 'Pont des Amours', 'Jardins de l\'Europe'],
  },
  {
    name: 'Tour du Lac d\'Annecy',
    description: 'Découvrez les rives du plus pur lac d\'Europe lors de cette balade rafraîchissante. De la plage au Pâquier en passant par les jardins, profitez d\'une vue imprenable sur les Alpes et les eaux turquoise.',
    image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    tags: ['Nature', 'Populaire', 'Lac'],
    duration_min: 120,
    distance_km: 5.2,
    is_published: true,
    poiNames: ['Plage d\'Annecy', 'Le Pâquier', 'Pont des Amours', 'Jardins de l\'Europe'],
  },
  {
    name: 'Panoramas et Hauteurs',
    description: 'Grimpez jusqu\'à la Basilique de la Visitation pour un panorama à couper le souffle, puis redescendez vers le château et la vieille ville.',
    image_url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    tags: ['Campagne', 'Nature', 'Vue'],
    duration_min: 150,
    distance_km: 6.5,
    is_published: true,
    poiNames: ['Basilique de la Visitation', 'Château d\'Annecy', 'Palais de l\'Isle'],
  },
];

// Permissions à configurer automatiquement
const PERMISSIONS = {
  public: [
    'api::parcours.parcours.find',
    'api::parcours.parcours.findOne',
    'api::parcours-item.parcours-item.find',
    'api::parcours-item.parcours-item.findOne',
    'api::poi.poi.find',
    'api::poi.poi.findOne',
    'api::review.review.find',
    'api::review.review.findOne',
  ],
  authenticated: [
    'api::parcours.parcours.find',
    'api::parcours.parcours.findOne',
    'api::parcours.parcours.findMe',
    'api::parcours.parcours.create',
    'api::parcours.parcours.update',
    'api::parcours.parcours.delete',
    'api::parcours-item.parcours-item.find',
    'api::parcours-item.parcours-item.findOne',
    'api::parcours-item.parcours-item.create',
    'api::parcours-item.parcours-item.update',
    'api::parcours-item.parcours-item.delete',
    'api::poi.poi.find',
    'api::poi.poi.findOne',
    'api::poi.poi.create',
    'api::review.review.find',
    'api::review.review.findOne',
    'api::review.review.create',
    'api::user-parcours.user-parcours.find',
    'api::user-parcours.user-parcours.findOne',
    'api::user-parcours.user-parcours.findMe',
    'api::user-parcours.user-parcours.create',
    'api::user-parcours.user-parcours.update',
    'api::badge.badge.find',
    'api::user-badge.user-badge.find',
  ],
};

async function setupPermissions(strapi: Core.Strapi) {
  const roles = await strapi.query('plugin::users-permissions.role').findMany({});
  const publicRole = roles.find((r: any) => r.type === 'public');
  const authRole = roles.find((r: any) => r.type === 'authenticated');

  for (const [roleType, actions] of Object.entries(PERMISSIONS)) {
    const role = roleType === 'public' ? publicRole : authRole;
    if (!role) continue;

    for (const action of actions) {
      const exists = await strapi.query('plugin::users-permissions.permission').findOne({
        where: { action, role: role.id },
      });
      if (!exists) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action, role: role.id },
        });
      }
    }
  }
  strapi.log.info('✅ Permissions configured');
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Configure les permissions automatiquement
    await setupPermissions(strapi);

    // Seed si aucun parcours-item n'existe
    const existingItems = await strapi.documents('api::parcours-item.parcours-item').findMany({});
    if (existingItems.length > 0) return;

    strapi.log.info('🌱 Seeding demo data...');

    try {
      // Supprimer les éventuels POIs/Parcours orphelins d'un seed précédent raté
      const existingParcours = await strapi.documents('api::parcours.parcours').findMany({});
      for (const p of existingParcours) {
        await strapi.documents('api::parcours.parcours').delete({ documentId: p.documentId });
      }
      const existingPois = await strapi.documents('api::poi.poi').findMany({});
      for (const p of existingPois) {
        await strapi.documents('api::poi.poi').delete({ documentId: p.documentId });
      }

      // Créer les POIs (publiés)
      const createdPois: Record<string, any> = {};
      for (const poi of SEED_POIS) {
        const created = await strapi.documents('api::poi.poi').create({ data: poi as any });
        createdPois[poi.name] = created;
      }

      // Créer les Parcours + Parcours Items
      for (const parcours of SEED_PARCOURS) {
        const { poiNames, ...parcoursData } = parcours;
        const createdParcours = await strapi.documents('api::parcours.parcours').create({
          data: parcoursData as any,
        });

        for (let i = 0; i < poiNames.length; i++) {
          const poi = createdPois[poiNames[i]];
          if (poi) {
            await strapi.documents('api::parcours-item.parcours-item').create({
              data: {
                order: i + 1,
                poi: poi.documentId,
                parcour: createdParcours.documentId,
              } as any,
            });
          }
        }
      }

      strapi.log.info('✅ Demo data seeded successfully!');
    } catch (err) {
      strapi.log.error('❌ Seed failed:', err);
    }
  },
};
