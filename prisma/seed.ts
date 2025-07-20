import {
  PrismaClient,
  UserRole,
  AddressType,
  ProductStatus,
  CategoryStatus,
  OrderStatus,
} from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seeding...');

  // 1. Clean database in correct order to avoid constraint errors
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  console.log('🧹 Database cleaned.');

  // 2. Create Users (Admin + Multiple Regular Users)
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const userPassword = await bcrypt.hash('userpass123', saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      name: 'System Administrator',
      password: adminPassword,
      role: UserRole.ADMIN,
      cpf: '98765432100',
      phone: '11987654321',
      birthDate: new Date('1985-03-15'),
    },
  });

  const users: any[] = [];

  // Create multiple regular users
  const regularUser1 = await prisma.user.create({
    data: {
      email: 'maria.silva@email.com',
      name: 'Maria Silva',
      password: userPassword,
      cpf: '12345678901',
      phone: '11999887766',
      birthDate: new Date('1990-07-22'),
      role: UserRole.USER,
    },
  });
  users.push(regularUser1);

  const regularUser2 = await prisma.user.create({
    data: {
      email: 'joao.santos@email.com',
      name: 'João Santos',
      password: userPassword,
      cpf: '23456789012',
      phone: '21987654321',
      birthDate: new Date('1988-12-10'),
      role: UserRole.USER,
    },
  });
  users.push(regularUser2);

  const regularUser3 = await prisma.user.create({
    data: {
      email: 'ana.costa@email.com',
      name: 'Ana Costa',
      password: userPassword,
      cpf: '34567890123',
      phone: '31976543210',
      birthDate: new Date('1995-04-18'),
      role: UserRole.USER,
    },
  });
  users.push(regularUser3);

  const regularUser4 = await prisma.user.create({
    data: {
      email: 'carlos.oliveira@email.com',
      name: 'Carlos Oliveira',
      password: userPassword,
      cpf: '45678901234',
      phone: '47998877665',
      role: UserRole.USER,
    },
  });
  users.push(regularUser4);

  console.log(
    `👥 ${users.length + 1} users created (1 admin + ${users.length} regular).`,
  );

  // 3. Create Addresses for users
  const addresses: any[] = [];

  // Addresses for Maria Silva
  const mariaHome = await prisma.address.create({
    data: {
      name: 'Casa',
      type: AddressType.RESIDENTIAL,
      street: 'Avenida Paulista',
      number: '1578',
      complement: 'Apto 142',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310200',
      isPrimary: true,
      userId: regularUser1.id,
    },
  });
  addresses.push(mariaHome);

  const mariaWork = await prisma.address.create({
    data: {
      name: 'Escritório',
      type: AddressType.COMMERCIAL,
      street: 'Rua Augusta',
      number: '2690',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01412100',
      userId: regularUser1.id,
    },
  });
  addresses.push(mariaWork);

  // Addresses for João Santos
  const joaoHome = await prisma.address.create({
    data: {
      name: 'Residência',
      type: AddressType.RESIDENTIAL,
      street: 'Avenida Atlântica',
      number: '1702',
      complement: 'Cobertura',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22021001',
      isPrimary: true,
      userId: regularUser2.id,
    },
  });
  addresses.push(joaoHome);

  // Addresses for Ana Costa
  const anaHome = await prisma.address.create({
    data: {
      name: 'Casa dos Pais',
      type: AddressType.RESIDENTIAL,
      street: 'Rua da Bahia',
      number: '1148',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      zipCode: '30160011',
      isPrimary: true,
      userId: regularUser3.id,
    },
  });
  addresses.push(anaHome);

  // Addresses for Carlos Oliveira
  const carlosHome = await prisma.address.create({
    data: {
      name: 'Casa',
      type: AddressType.RESIDENTIAL,
      street: 'Rua XV de Novembro',
      number: '999',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
      zipCode: '80020310',
      isPrimary: true,
      userId: regularUser4.id,
    },
  });
  addresses.push(carlosHome);

  console.log(`🏠 ${addresses.length} addresses created.`);

  // 4. Create Categories
  const categoryTshirts = await prisma.category.create({
    data: { name: 'Camisetas', slug: 'camisetas' },
  });

  const categoryPants = await prisma.category.create({
    data: { name: 'Calças', slug: 'calcas' },
  });

  const categoryShoes = await prisma.category.create({
    data: { name: 'Calçados', slug: 'calcados' },
  });

  const categoryDresses = await prisma.category.create({
    data: { name: 'Vestidos', slug: 'vestidos' },
  });

  const categoryJackets = await prisma.category.create({
    data: { name: 'Jaquetas', slug: 'jaquetas' },
  });

  const categoryAccessories = await prisma.category.create({
    data: { name: 'Acessórios', slug: 'acessorios' },
  });

  const categoryHidden = await prisma.category.create({
    data: {
      name: 'Categoria Oculta',
      slug: 'categoria-oculta',
      status: CategoryStatus.HIDDEN,
    },
  });

  const categories = [
    categoryTshirts,
    categoryPants,
    categoryShoes,
    categoryDresses,
    categoryJackets,
    categoryAccessories,
  ];
  console.log(
    `📦 ${categories.length + 1} categories created (${categories.length} visible + 1 hidden).`,
  );

  // 5. Create Products with images and categories
  const products: any[] = [];

  // T-shirts
  const tshirt1 = await prisma.product.create({
    data: {
      name: 'Camiseta Básica Branca',
      description:
        'Camiseta de algodão 100% orgânico, perfeita para o dia a dia. Modelagem regular e tecido respirável.',
      sku: 'TS-WHT-001',
      stockQuantity: 150,
      oldPrice: 79.9,
      currentPrice: 59.9,
      weightInGrams: 180,
      widthInMm: 350,
      heightInMm: 650,
      lengthInMm: 10,
      slug: 'camiseta-basica-branca',
      tags: ['basico', 'verao', 'algodao', 'unissex'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
      images: {
        create: [
          {
            url: '/images/tshirt-white-front.jpg',
            altText: 'Vista frontal da camiseta branca',
          },
          {
            url: '/images/tshirt-white-back.jpg',
            altText: 'Vista traseira da camiseta branca',
          },
        ],
      },
    },
  });
  products.push(tshirt1);

  const tshirt2 = await prisma.product.create({
    data: {
      name: 'Camiseta Estampada Tropical',
      description:
        'Camiseta com estampa tropical exclusiva, ideal para viagens e passeios casuais.',
      sku: 'TS-TRP-002',
      stockQuantity: 75,
      oldPrice: 99.9,
      currentPrice: 79.9,
      weightInGrams: 185,
      widthInMm: 350,
      heightInMm: 650,
      lengthInMm: 10,
      slug: 'camiseta-estampada-tropical',
      tags: ['estampa', 'tropical', 'verao', 'casual'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
      images: {
        create: [
          {
            url: '/images/tshirt-tropical-front.jpg',
            altText: 'Camiseta com estampa tropical - frente',
          },
          {
            url: '/images/tshirt-tropical-detail.jpg',
            altText: 'Detalhe da estampa tropical',
          },
        ],
      },
    },
  });
  products.push(tshirt2);

  // Pants
  const jeans1 = await prisma.product.create({
    data: {
      name: 'Calça Jeans Skinny Azul',
      description:
        'Calça jeans com lavagem escura e corte skinny. Elastano para maior conforto e mobilidade.',
      sku: 'JN-SKY-001',
      stockQuantity: 80,
      oldPrice: 199.9,
      currentPrice: 149.9,
      weightInGrams: 650,
      widthInMm: 400,
      heightInMm: 1100,
      lengthInMm: 30,
      slug: 'calca-jeans-skinny-azul',
      tags: ['jeans', 'casual', 'skinny', 'elastano'],
      categories: { create: [{ categoryId: categoryPants.id }] },
      images: {
        create: [
          {
            url: '/images/jeans-skinny-front.jpg',
            altText: 'Calça jeans skinny azul - vista frontal',
          },
          {
            url: '/images/jeans-skinny-side.jpg',
            altText: 'Calça jeans skinny azul - vista lateral',
          },
        ],
      },
    },
  });
  products.push(jeans1);

  const pants2 = await prisma.product.create({
    data: {
      name: 'Calça Social Preta',
      description:
        'Calça social em tecido premium, ideal para ocasiões formais e ambiente corporativo.',
      sku: 'SC-BLK-001',
      stockQuantity: 45,
      oldPrice: 299.9,
      currentPrice: 249.9,
      weightInGrams: 420,
      widthInMm: 380,
      heightInMm: 1080,
      lengthInMm: 25,
      slug: 'calca-social-preta',
      tags: ['social', 'formal', 'trabalho', 'premium'],
      categories: { create: [{ categoryId: categoryPants.id }] },
    },
  });
  products.push(pants2);

  // Shoes
  const sneakers1 = await prisma.product.create({
    data: {
      name: 'Tênis Casual Branco',
      description:
        'Tênis casual em couro sintético branco, solado antiderrapante e design minimalista.',
      sku: 'SN-WHT-001',
      stockQuantity: 120,
      oldPrice: 159.9,
      currentPrice: 129.9,
      weightInGrams: 800,
      widthInMm: 300,
      heightInMm: 120,
      lengthInMm: 280,
      slug: 'tenis-casual-branco',
      tags: ['tenis', 'casual', 'couro', 'minimalista'],
      categories: { create: [{ categoryId: categoryShoes.id }] },
      images: {
        create: [
          {
            url: '/images/sneakers-white-side.jpg',
            altText: 'Tênis casual branco - vista lateral',
          },
          {
            url: '/images/sneakers-white-top.jpg',
            altText: 'Tênis casual branco - vista superior',
          },
        ],
      },
    },
  });
  products.push(sneakers1);

  // Dresses
  const dress1 = await prisma.product.create({
    data: {
      name: 'Vestido Floral Midi',
      description:
        'Vestido midi com estampa floral delicada, tecido fluido e amarração na cintura.',
      sku: 'DR-FLR-001',
      stockQuantity: 60,
      oldPrice: 189.9,
      currentPrice: 159.9,
      weightInGrams: 320,
      widthInMm: 450,
      heightInMm: 1200,
      lengthInMm: 15,
      slug: 'vestido-floral-midi',
      tags: ['vestido', 'floral', 'midi', 'feminino'],
      categories: { create: [{ categoryId: categoryDresses.id }] },
      images: {
        create: [
          {
            url: '/images/dress-floral-front.jpg',
            altText: 'Vestido floral midi - vista frontal',
          },
          {
            url: '/images/dress-floral-detail.jpg',
            altText: 'Detalhe da estampa floral do vestido',
          },
        ],
      },
    },
  });
  products.push(dress1);

  // Jackets
  const jacket1 = await prisma.product.create({
    data: {
      name: 'Jaqueta Jeans Oversized',
      description:
        'Jaqueta jeans com modelagem oversized, lavagem stone e detalhes vintage.',
      sku: 'JK-DNM-001',
      stockQuantity: 35,
      oldPrice: 259.9,
      currentPrice: 219.9,
      weightInGrams: 750,
      widthInMm: 550,
      heightInMm: 650,
      lengthInMm: 35,
      slug: 'jaqueta-jeans-oversized',
      tags: ['jaqueta', 'jeans', 'oversized', 'vintage'],
      categories: { create: [{ categoryId: categoryJackets.id }] },
    },
  });
  products.push(jacket1);

  // Accessories
  const accessory1 = await prisma.product.create({
    data: {
      name: 'Óculos de Sol Aviador',
      description:
        'Óculos de sol estilo aviador com lentes polarizadas e proteção UV400.',
      sku: 'AC-SUN-001',
      stockQuantity: 90,
      oldPrice: 89.9,
      currentPrice: 69.9,
      weightInGrams: 45,
      widthInMm: 140,
      heightInMm: 50,
      lengthInMm: 145,
      slug: 'oculos-sol-aviador',
      tags: ['oculos', 'aviador', 'proteção', 'uv'],
      categories: { create: [{ categoryId: categoryAccessories.id }] },
    },
  });
  products.push(accessory1);

  // Out of stock product
  const outOfStockProduct = await prisma.product.create({
    data: {
      name: 'Camiseta Limited Edition',
      description:
        'Edição limitada esgotada - camiseta com estampa exclusiva do artista colaborador.',
      sku: 'TS-LTD-999',
      stockQuantity: 0,
      status: ProductStatus.INACTIVE,
      oldPrice: 129.9,
      currentPrice: 99.9,
      slug: 'camiseta-limited-edition',
      tags: ['limitada', 'exclusiva', 'esgotada'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
    },
  });
  products.push(outOfStockProduct);

  // Draft product (not visible)
  const draftProduct = await prisma.product.create({
    data: {
      name: 'Produto em Desenvolvimento',
      description:
        'Este produto ainda está sendo desenvolvido e não está disponível para venda.',
      sku: 'DR-TST-001',
      stockQuantity: 0,
      status: ProductStatus.DRAFT,
      oldPrice: 199.9,
      currentPrice: 199.9,
      slug: 'produto-desenvolvimento',
      tags: ['desenvolvimento', 'teste'],
      categories: { create: [{ categoryId: categoryTshirts.id }] },
    },
  });
  products.push(draftProduct);

  console.log(
    `🛍️ ${products.length} products created with various statuses and stock levels.`,
  );

  // 6. Create Orders with different statuses
  const orders: any[] = [];

  // Completed order for Maria
  const order1 = await prisma.order.create({
    data: {
      userId: regularUser1.id,
      addressId: mariaHome.id,
      total: 219.8, // tshirt1 + jeans1
      status: OrderStatus.DELIVERED,
      createdAt: new Date('2025-01-10'),
      items: {
        create: [
          {
            productId: tshirt1.id,
            quantity: 1,
            price: tshirt1.currentPrice,
          },
          {
            productId: jeans1.id,
            quantity: 1,
            price: jeans1.currentPrice,
          },
        ],
      },
    },
  });
  orders.push(order1);

  // Pending order for João
  const order2 = await prisma.order.create({
    data: {
      userId: regularUser2.id,
      addressId: joaoHome.id,
      total: 389.7, // dress1 + jacket1 + sneakers1
      status: OrderStatus.PENDING,
      createdAt: new Date('2025-01-15'),
      items: {
        create: [
          {
            productId: dress1.id,
            quantity: 1,
            price: dress1.currentPrice,
          },
          {
            productId: jacket1.id,
            quantity: 1,
            price: jacket1.currentPrice,
          },
          {
            productId: sneakers1.id,
            quantity: 1,
            price: sneakers1.currentPrice,
          },
        ],
      },
    },
  });
  orders.push(order2);

  // Shipped order for Ana
  const order3 = await prisma.order.create({
    data: {
      userId: regularUser3.id,
      addressId: anaHome.id,
      total: 329.8, // pants2 + tshirt2
      status: OrderStatus.SHIPPED,
      createdAt: new Date('2025-01-12'),
      items: {
        create: [
          {
            productId: pants2.id,
            quantity: 1,
            price: pants2.currentPrice,
          },
          {
            productId: tshirt2.id,
            quantity: 1,
            price: tshirt2.currentPrice,
          },
        ],
      },
    },
  });
  orders.push(order3);

  // Multiple items order for Carlos
  const order4 = await prisma.order.create({
    data: {
      userId: regularUser4.id,
      addressId: carlosHome.id,
      total: 259.7, // 2x tshirt1 + accessory1
      status: OrderStatus.PAID,
      createdAt: new Date('2025-01-18'),
      items: {
        create: [
          {
            productId: tshirt1.id,
            quantity: 2,
            price: tshirt1.currentPrice,
          },
          {
            productId: accessory1.id,
            quantity: 1,
            price: accessory1.currentPrice,
          },
        ],
      },
    },
  });
  orders.push(order4);

  console.log(`📦 ${orders.length} orders created with different statuses.`);

  // 7. Create Carts with items
  const carts: any[] = [];

  // Cart for Maria (currently shopping)
  const mariaCart = await prisma.cart.create({
    data: {
      userId: regularUser1.id,
      items: {
        create: [
          {
            productId: sneakers1.id,
            quantity: 1,
          },
          {
            productId: accessory1.id,
            quantity: 2,
          },
        ],
      },
    },
  });
  carts.push(mariaCart);

  // Cart for João (considering purchase)
  const joaoCart = await prisma.cart.create({
    data: {
      userId: regularUser2.id,
      items: {
        create: [
          {
            productId: tshirt2.id,
            quantity: 1,
          },
        ],
      },
    },
  });
  carts.push(joaoCart);

  // Empty cart for Ana
  const anaCart = await prisma.cart.create({
    data: {
      userId: regularUser3.id,
    },
  });
  carts.push(anaCart);

  console.log(
    `🛒 ${carts.length} carts created (some with items, some empty).`,
  );

  console.log('✨ Comprehensive seeding completed successfully!');
  console.log(`
📊 Summary:
   • Users: ${users.length + 1} (1 admin + ${users.length} customers)
   • Addresses: ${addresses.length}
   • Categories: ${categories.length + 1} (${categories.length} visible + 1 hidden)
   • Products: ${products.length} (various statuses and stock levels)
   • Orders: ${orders.length} (different statuses: pending, paid, shipped, delivered)
   • Carts: ${carts.length} (with and without items)
  
🔑 Login Credentials:
   • Admin: admin@ecommerce.com / admin123
   • Customer: maria.silva@email.com / user123
   • Customer: joao.santos@email.com / user123
   • Customer: ana.costa@email.com / user123
   • Customer: carlos.oliveira@email.com / user123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
