import { Prisma, PrismaClient, UserRole } from '../generated/prisma';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Limpar dados antigos na ordem correta para evitar erros de constraint
  console.log('Cleaning old data...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Criar Categorias
  console.log('Creating categories...');
  const categoriesData = [
    { name: 'Eletrônicos', slug: 'eletronicos' },
    { name: 'Roupas Masculinas', slug: 'roupas-masculinas' },
    { name: 'Roupas Femininas', slug: 'roupas-femininas' },
    { name: 'Calçados', slug: 'calcados' },
    { name: 'Acessórios', slug: 'acessorios' },
  ];
  const categories = await Promise.all(
    categoriesData.map((cat) => prisma.category.create({ data: cat })),
  );

  // 3. Criar Usuários (1 Admin, 4 Comuns)
  console.log('Creating users...');
  const saltRounds = 10;
  const usersData: Prisma.UserCreateInput[] = [];

  // Admin
  const adminPassword = await bcrypt.hash('password123', saltRounds);
  usersData.push({
    name: 'Admin User',
    email: 'admin@example.com',
    password: adminPassword,
    role: UserRole.ADMIN,
  });

  // Usuários comuns
  for (let i = 0; i < 4; i++) {
    const userPassword = await bcrypt.hash('password123', saltRounds);
    usersData.push({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: userPassword,
      role: UserRole.USER,
    });
  }
  const users = await Promise.all(
    usersData.map((user) => prisma.user.create({ data: user })),
  );

  // 4. Criar Endereços para os usuários
  console.log('Creating addresses...');
  for (const user of users) {
    await prisma.address.create({
      data: {
        userId: user.id,
        street: faker.location.streetAddress(),
        number: faker.location.buildingNumber(),
        neighborhood: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode(),
        isPrimary: true,
      },
    });
  }

  // 5. Criar Produtos e associá-los a categorias
  console.log('Creating products...');
  const productsData: Prisma.ProductCreateInput[] = [];
  for (let i = 0; i < 30; i++) {
    const productName = faker.commerce.productName();
    productsData.push({
      name: productName,
      description: faker.commerce.productDescription(),
      sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
      stockQuantity: faker.number.int({ min: 10, max: 100 }),
      oldPrice: parseFloat(
        faker.commerce.price({ min: 100, max: 500, dec: 2 }),
      ),
      currentPrice: parseFloat(
        faker.commerce.price({ min: 80, max: 450, dec: 2 }),
      ),
      slug: faker.helpers.slugify(productName).toLowerCase(),
      tags: faker.helpers.arrayElements(
        ['novo', 'promoção', 'mais-vendido', 'desconto'],
        { min: 1, max: 3 },
      ),
      categories: {
        create: [
          {
            category: {
              connect: {
                id: faker.helpers.arrayElement(categories).id,
              },
            },
          },
        ],
      },
    });
  }
  const products = await Promise.all(
    productsData.map((p) => prisma.product.create({ data: p })),
  );

  // 6. Criar Pedidos e Itens de Pedido
  console.log('Creating orders...');
  for (const user of users) {
    const orderCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < orderCount; i++) {
      const productsInOrder = faker.helpers.arrayElements(products, {
        min: 1,
        max: 4,
      });
      let orderTotal = 0;

      const orderItemsData = productsInOrder.map((product) => {
        const quantity = faker.number.int({ min: 1, max: 3 });
        orderTotal += Number(product.currentPrice) * quantity;
        return {
          productId: product.id,
          quantity: quantity,
          price: product.currentPrice,
        };
      });

      await prisma.order.create({
        data: {
          userId: user.id,
          total: orderTotal,
          status: faker.helpers.arrayElement(['PENDING', 'PAID', 'SHIPPED']),
          items: {
            create: orderItemsData,
          },
        },
      });
    }
  }

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
