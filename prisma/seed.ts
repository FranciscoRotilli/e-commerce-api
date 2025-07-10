import {
  PrismaClient,
  UserRole,
  AddressType,
  AddressStatus,
  ProductStatus,
  CategoryStatus,
  OrderStatus,
} from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Limpa o banco de dados na ordem correta para evitar erros de constraint
  await prisma.orderItem.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('Old data cleaned.');

  // 2. Cria os Usuários
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const userPassword = await bcrypt.hash('user123', saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@email.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@email.com',
      name: 'Regular User',
      password: userPassword,
      cpf: '12345678900',
      phone: '51999998888',
      role: UserRole.USER,
    },
  });
  console.log('Users created.');

  // 3. Cria Endereços para o usuário comum
  const userAddress1 = await prisma.address.create({
    data: {
      name: 'Casa',
      type: AddressType.RESIDENTIAL,
      street: 'Avenida Borges de Medeiros',
      number: '123',
      city: 'Porto Alegre',
      state: 'RS',
      zipCode: '90010001',
      isPrimary: true,
      userId: regularUser.id,
    },
  });

  const userAddress2 = await prisma.address.create({
    data: {
      name: 'Trabalho',
      type: AddressType.COMMERCIAL,
      street: 'Rua dos Andradas',
      number: '1000',
      city: 'Porto Alegre',
      state: 'RS',
      zipCode: '90020000',
      userId: regularUser.id,
    },
  });
  console.log('Addresses created.');

  // 4. Cria Categorias
  const categoryTshirts = await prisma.category.create({
    data: { name: 'Camisetas', slug: 'camisetas' },
  });
  const categoryPants = await prisma.category.create({
    data: { name: 'Calças', slug: 'calcas' },
  });
  const categoryHidden = await prisma.category.create({
    data: {
      name: 'Acessórios Ocultos',
      slug: 'acessorios-ocultos',
      status: CategoryStatus.HIDDEN,
    },
  });
  console.log('Categories created.');

  // 5. Cria Produtos com imagens e categorias
  const product1 = await prisma.product.create({
    data: {
      name: 'Camiseta Básica Branca',
      description: 'Camiseta de algodão 100% orgânico, cor branca.',
      sku: 'TS-WHT-001',
      stockQuantity: 50,
      oldPrice: 79.9,
      currentPrice: 59.9,
      slug: 'camiseta-basica-branca',
      tags: ['basico', 'verao', 'algodao'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
      images: {
        create: [
          {
            url: '/placeholders/tshirt-white-front.jpg',
            altText: 'Vista frontal da camiseta branca',
          },
          {
            url: '/placeholders/tshirt-white-back.jpg',
            altText: 'Vista traseira da camiseta branca',
          },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Calça Jeans Skinny',
      description: 'Calça jeans com lavagem escura e corte skinny.',
      sku: 'JN-SKY-001',
      stockQuantity: 25,
      oldPrice: 199.9,
      currentPrice: 149.9,
      slug: 'calca-jeans-skinny',
      tags: ['jeans', 'casual'],
      categories: { create: [{ categoryId: categoryPants.id }] },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Camiseta Estampada',
      description: 'Camiseta de algodão com estampa exclusiva.',
      sku: 'TS-PRT-002',
      stockQuantity: 0, // Sem estoque
      status: ProductStatus.INACTIVE,
      oldPrice: 89.9,
      currentPrice: 69.9,
      slug: 'camiseta-estampada',
      tags: ['estampa', 'arte'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
    },
  });
  console.log('Products created.');

  // 6. Cria um Pedido de exemplo para o usuário comum
  await prisma.order.create({
    data: {
      userId: regularUser.id,
      addressId: userAddress1.id, // Usa o endereço principal
      total: 209.8, // 1x 59.90 + 1x 149.90
      status: OrderStatus.PAID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            price: product1.currentPrice,
          },
          {
            productId: product2.id,
            quantity: 1,
            price: product2.currentPrice,
          },
        ],
      },
    },
  });
  console.log('Sample order created.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
