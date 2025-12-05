import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { meiliClient, INDEXES, initializeIndexes } from './meilisearch.client';

const prisma = new PrismaClient();

interface ProductDocument {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  category: string;
  city: string;
  region: string;
  sellerId: string;
  sellerName: string;
  isAvailable: boolean;
  pricePerDay: number | null;
  pricePerHour: number | null;
  pricePerShift: number | null;
  imageUrl: string | null;
  viewCount: number;
  rankingPoints: number;
  createdAt: number;
  updatedAt: number;
}

interface ServiceDocument {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  city: string;
  region: string;
  specialistId: string;
  specialistName: string;
  isAvailable: boolean;
  price: number | null;
  imageUrl: string | null;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}

async function syncProducts() {
  console.log('🔄 Syncing products...');

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'APPROVED',
      },
      include: {
        seller: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const documents: ProductDocument[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      status: product.status,
      category: product.category,
      city: product.city,
      region: product.region,
      sellerId: product.sellerId,
      sellerName: product.seller.fullName || 'Unknown',
      isAvailable: product.isAvailable,
      pricePerDay: product.pricePerDay ? parseFloat(product.pricePerDay.toString()) : null,
      pricePerHour: product.pricePerHour ? parseFloat(product.pricePerHour.toString()) : null,
      pricePerShift: product.pricePerShift ? parseFloat(product.pricePerShift.toString()) : null,
      imageUrl: product.imageUrl,
      viewCount: product.viewCount,
      rankingPoints: product.rankingPoints,
      createdAt: product.createdAt.getTime(),
      updatedAt: product.updatedAt.getTime(),
    }));

    const productsIndex = meiliClient.index(INDEXES.PRODUCTS);

    if (documents.length > 0) {
      await productsIndex.addDocuments(documents, { primaryKey: 'id' });
      console.log(`✓ Synced ${documents.length} products`);
    } else {
      console.log('✓ No products to sync');
    }
  } catch (error) {
    console.error('Error syncing products:', error);
    throw error;
  }
}

async function syncServices() {
  console.log('🔄 Syncing services...');

  try {
    const services = await prisma.service.findMany({
      where: {
        status: 'APPROVED',
      },
      include: {
        specialist: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const documents: ServiceDocument[] = services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      status: service.status,
      category: service.category,
      city: service.city,
      region: service.region,
      specialistId: service.specialistId,
      specialistName: service.specialist.fullName || 'Unknown',
      isAvailable: service.isAvailable,
      price: service.price ? parseFloat(service.price.toString()) : null,
      imageUrl: service.imageUrl,
      viewCount: service.viewCount,
      createdAt: service.createdAt.getTime(),
      updatedAt: service.updatedAt.getTime(),
    }));

    const servicesIndex = meiliClient.index(INDEXES.SERVICES);

    if (documents.length > 0) {
      await servicesIndex.addDocuments(documents, { primaryKey: 'id' });
      console.log(`✓ Synced ${documents.length} services`);
    } else {
      console.log('✓ No services to sync');
    }
  } catch (error) {
    console.error('Error syncing services:', error);
    throw error;
  }
}

async function fullSync() {
  console.log('🚀 Starting full sync...');

  try {
    // Initialize indexes first
    await initializeIndexes();

    // Sync all data
    await syncProducts();
    await syncServices();

    console.log('✅ Full sync completed successfully!');
  } catch (error) {
    console.error('❌ Full sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.main) {
  fullSync();
}

export { syncProducts, syncServices, fullSync };
