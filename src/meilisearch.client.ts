import { MeiliSearch } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_MASTER_KEY = process.env.MEILISEARCH_MASTER_KEY || 'changeme';

export const meiliClient = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_MASTER_KEY,
});

// Index names
export const INDEXES = {
  PRODUCTS: 'products',
  SERVICES: 'services',
} as const;

// Initialize indexes with proper configuration
export async function initializeIndexes() {
  try {
    // Products index
    const productsIndex = meiliClient.index(INDEXES.PRODUCTS);
    await productsIndex.updateSettings({
      searchableAttributes: [
        'name',
        'description',
        'category',
        'city',
        'region',
      ],
      filterableAttributes: [
        'type',
        'status',
        'category',
        'city',
        'region',
        'sellerId',
        'isAvailable',
      ],
      sortableAttributes: [
        'createdAt',
        'pricePerDay',
        'pricePerHour',
        'viewCount',
        'rankingPoints',
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'rankingPoints:desc',
      ],
    });

    console.log('✓ Products index configured');

    // Services index
    const servicesIndex = meiliClient.index(INDEXES.SERVICES);
    await servicesIndex.updateSettings({
      searchableAttributes: [
        'title',
        'description',
        'category',
        'city',
        'region',
        'specialistName',
      ],
      filterableAttributes: [
        'status',
        'category',
        'city',
        'region',
        'specialistId',
        'isAvailable',
      ],
      sortableAttributes: [
        'createdAt',
        'price',
        'viewCount',
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
    });

    console.log('✓ Services index configured');
  } catch (error) {
    console.error('Error initializing indexes:', error);
    throw error;
  }
}
