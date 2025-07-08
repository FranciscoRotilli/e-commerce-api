import { Prisma, PrismaClient } from '../generated/prisma';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Limpar dados antigos para evitar duplicatas
  await prisma.product.deleteMany({});

  const products: Prisma.ProductCreateInput[] = [];

  for (let i = 0; i < 30; i++) {
    const productName = faker.commerce.productName();
    const product = {
      name: productName,
      description: faker.commerce.productDescription(),
      sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
      stockQuantity: faker.number.int({ min: 0, max: 100 }),
      oldPrice: parseFloat(
        faker.commerce.price({ min: 100, max: 5000, dec: 2 }),
      ),
      currentPrice: parseFloat(
        faker.commerce.price({ min: 80, max: 4500, dec: 2 }),
      ),
      slug: faker.helpers.slugify(productName).toLowerCase(),
      tags: faker.helpers.arrayElements(
        ['novo', 'promoção', 'mais-vendido', 'eletrônico', 'acessório'],
        { min: 1, max: 3 },
      ),
    };
    products.push(product);
  }

  await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log('Seeding finished.');
}

async function runSeed() {
  try {
    await main();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  }
}

void runSeed();
