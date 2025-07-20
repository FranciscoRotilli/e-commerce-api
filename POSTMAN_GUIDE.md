# E-Commerce API - Postman Collection

This repository contains a comprehensive Postman collection for testing the NestJS E-Commerce API.

## 📁 Files Included

- `E-Commerce-API.postman_collection.json` - Main collection with all API endpoints
- `E-Commerce-API.postman_environment.json` - Environment variables for local development

## 🚀 Quick Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Select both JSON files:
   - `E-Commerce-API.postman_collection.json`
   - `E-Commerce-API.postman_environment.json`
4. Select the "E-Commerce API - Local" environment from the environment dropdown

### 2. Start Your API Server

Make sure your NestJS API is running on `http://localhost:3000`:

```bash
# Using Docker (recommended)
./docker.sh dev

# Or manually
npm run start:dev
```

### 3. Seed the Database (Important!)

The collection is designed to work with seeded data. Run the seed script:

```bash
# If using Docker
docker exec -it e-commerce-api npm run prisma:seed

# Or if running manually
npm run prisma:seed
```

### 4. Test the API

Start with the basic health check:

- Go to `App > Health Check` and send the request
- You should get a "Hello World!" response

## 🔐 Authentication Flow

### Ready-to-Use Accounts

The seed data creates these accounts you can use immediately:

**Admin Account:**

- Email: `admin@ecommerce.com`
- Password: `admin123`
- Role: ADMIN

**Customer Accounts:**

- Email: `maria.silva@email.com` / Password: `user123`
- Email: `joao.santos@email.com` / Password: `user123`
- Email: `ana.costa@email.com` / Password: `user123`
- Email: `carlos.oliveira@email.com` / Password: `user123`

### Step 1: Login with Existing Account

1. Go to `Auth > Login`
2. Use one of the seeded accounts (recommend starting with admin account)
3. The JWT token will be automatically saved to the environment
4. All subsequent requests will use this token for authentication

### Step 2: Get Profile

1. Go to `Auth > Get Profile`
2. Verify your authentication is working

### Alternative: Create New User

1. Go to `Users > Create User (Register)`
2. Send the request with your own data
3. Note: Only the first user becomes ADMIN, subsequent users are regular users

## �️ Seeded Data Overview

After running the seed script, you'll have access to:

### 📊 Available Data for Testing

**Categories:**

- Camisetas (camisetas)
- Calças (calcas)
- Calçados (calcados)
- Vestidos (vestidos)
- Jaquetas (jaquetas)
- Acessórios (acessorios)

**Products:**

- Camiseta Básica Branca - R$ 59,90
- Camiseta Estampada Tropical - R$ 79,90
- Calça Jeans Skinny Azul - R$ 149,90
- Calça Social Preta - R$ 249,90
- Tênis Casual Branco - R$ 129,90
- Vestido Floral Midi - R$ 159,90
- Jaqueta Jeans Oversized - R$ 219,90
- Óculos de Sol Aviador - R$ 69,90
- And more...

**Existing Orders:**

- Order statuses: PENDING, PAID, SHIPPED, DELIVERED
- Multiple items per order
- Different customers and addresses

**Shopping Carts:**

- Some users already have items in their carts
- Perfect for testing cart operations

## 📋 Testing Workflow

### Recommended Testing Flow

Follow this order to test with seeded data:

1. **Authentication**
   - Login with admin account: `admin@ecommerce.com` / `admin123`

2. **Browse Existing Data**
   - Get All Categories → Get All Products → Get All Users (admin)

3. **Test Shopping Flow** (Switch to customer account)
   - Login as: `maria.silva@email.com` / `user123`
   - Get My Cart → Get My Addresses → Get My Orders

4. **Create New Data**
   - Create new category → Create new product → Add to cart → Create order

5. **Administrative Tasks** (Back to admin)
   - Update order statuses → Manage users

## 🔧 Environment Variables

The collection uses these environment variables (automatically managed):

| Variable      | Description              | Auto-populated              |
| ------------- | ------------------------ | --------------------------- |
| `base_url`    | API base URL             | ✅                          |
| `jwt_token`   | JWT authentication token | ✅ (from login)             |
| `user_id`     | Created user ID          | ✅ (from user creation)     |
| `product_id`  | Created product ID       | ✅ (from product creation)  |
| `category_id` | Created category ID      | ✅ (from category creation) |
| `order_id`    | Created order ID         | ✅ (from order creation)    |
| `address_id`  | Created address ID       | ✅ (from address creation)  |

## 📚 Endpoint Categories

### 🏠 App

- Health check endpoint

### 🔐 Auth

- Login (get JWT token)
- Get profile
- Forgot password
- Reset password

### 👥 Users

- Register new user
- Update profile
- Change password
- **[ADMIN]** List all users
- **[ADMIN]** Get user by ID
- **[ADMIN]** Update user role

### 🏷️ Categories

- Get all categories (public)
- Get category by ID/slug (public)
- **[ADMIN]** Create category
- **[ADMIN]** Toggle category status

### 📦 Products

- Get all products with search/filter/sort (public)
- Get product by ID/slug (public)
- **[ADMIN]** Create product
- **[ADMIN]** Update product
- **[ADMIN]** Update product status
- **[ADMIN]** Add category to product
- **[ADMIN]** Upload product images
- **[ADMIN]** Delete product image

### 📍 Addresses

- Create address
- Get my addresses
- Get address by ID
- Update address
- Delete (disable) address

### 🛒 Cart

- Get my cart
- Add item to cart
- Update cart item quantity
- Remove item from cart
- Clear entire cart

### 📋 Orders

- Create order from cart
- Get my orders
- Get order by ID
- Cancel my order
- **[ADMIN]** Update order status

### 📁 File Uploads

- Access uploaded product images (static files)

## 🛡️ Security Notes

### Role-Based Access Control

- **Public**: No authentication required
- **Authenticated**: Requires valid JWT token
- **Admin**: Requires JWT token + ADMIN role

### Authentication Headers

The collection automatically includes the JWT token in the `Authorization` header:

```
Authorization: Bearer {{jwt_token}}
```

## 📝 Example Request Bodies

### Login with Seeded Accounts

```json
{
  "email": "admin@ecommerce.com",
  "password": "admin123"
}
```

```json
{
  "email": "maria.silva@email.com",
  "password": "user123"
}
```

### Create User (New Account)

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Create Category (Admin)

```json
{
  "name": "Electronics",
  "description": "Electronic devices and gadgets"
}
```

### Create Product (Admin)

```json
{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with A17 Pro chip",
  "sku": "IPHONE15PRO-256GB-BLACK",
  "stockQuantity": 50,
  "oldPrice": 1299.99,
  "currentPrice": 1199.99,
  "categoryIds": ["{{category_id}}"]
}
```

### Add Item to Cart

```json
{
  "productId": "{{product_id}}",
  "quantity": 2
}
```

### Create Address

```json
{
  "name": "Home",
  "type": "RESIDENTIAL",
  "street": "Main Street",
  "number": "123",
  "complement": "Apt 4B",
  "neighborhood": "Downtown",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  "isPrimary": true
}
```

## 🚫 Common Issues & Solutions

### 1. JWT Token Not Being Saved Automatically

**Problem**: The token script in login requests isn't working

**Solutions**:

- Check the **Console** tab in Postman after sending a login request
- Look for debug messages showing the response and token
- Ensure you're using the correct environment (not "No Environment")
- Verify the API is returning `access_token` in the response
- Try manually copying the token from the response to the environment variable

**Manual Token Setup**:

1. Send the login request
2. Copy the `access_token` from the response
3. Go to the Environment tab → Variables
4. Set `jwt_token` to the copied token value

### 2. 401 Unauthorized

- Make sure you're logged in and the JWT token is set
- Check if the token has expired (login again)

### 3. 403 Forbidden

- Endpoint requires ADMIN role
- Make sure your user has ADMIN privileges

### 4. 404 Not Found

- Check if the API server is running
- Verify the endpoint URL
- Ensure the resource ID exists

### 5. 400 Bad Request

- Check the request body format
- Ensure all required fields are provided
- Validate data types (strings, numbers, UUIDs)

## 🔍 Advanced Features

### Search & Filtering (Products)

Try these searches with the seeded data:

```
GET /products?search=camiseta
GET /products?search=jeans&minPrice=100&maxPrice=200
GET /products?categorySlug=calcados&sortBy=currentPrice&sortOrder=asc
GET /products?categorySlug=vestidos
GET /products?search=tropical
```

### Pagination

```
GET /users?page=1&limit=10&search=maria
GET /products?page=1&limit=5
```

## 🧪 Testing Scenarios with Seeded Data

### Scenario 1: Admin Management

1. Login as admin (`admin@ecommerce.com` / `admin123`)
2. Get all users → See the 5 seeded users
3. Get all categories → See the 6 categories + 1 hidden
4. Create new category → Add it to a product
5. Update order statuses for existing orders

### Scenario 2: Customer Shopping Experience

1. Login as Maria (`maria.silva@email.com` / `user123`)
2. Browse products → Search for "camiseta"
3. Check existing cart → Maria already has items!
4. View addresses → See her home and work addresses
5. View order history → See her delivered order

### Scenario 3: Cart to Order Flow

1. Login as João (`joao.santos@email.com` / `user123`)
2. Check cart → He has one item already
3. Add more items to cart
4. Create order from cart using his Copacabana address
5. Check order status

### Scenario 4: Different Order Statuses

- Maria: Has DELIVERED order (order history)
- João: Has PENDING order (can be cancelled)
- Ana: Has SHIPPED order (admin can update status)
- Carlos: Has PAID order (ready for shipping)

### Scenario 5: Product Search & Filter

1. Search "jeans" → Find jeans products
2. Filter by category slug "calcas" → See pants only
3. Filter by price range R$100-200
4. Sort by price ascending/descending

**Available category slugs:** `camisetas`, `calcas`, `calcados`, `vestidos`, `jaquetas`, `acessorios`, `eletronics`

### Scenario 6: Address Management

Each customer has realistic Brazilian addresses:

- Maria: São Paulo (Paulista + Augusta)
- João: Rio de Janeiro (Copacabana)
- Ana: Belo Horizonte (Centro)
- Carlos: Curitiba (Centro)

## ✨ Benefits of Using Seeded Data

### 🎯 Immediate Testing

- No need to create users, categories, or products manually
- Ready-to-use data relationships
- Realistic Brazilian e-commerce scenario

### 🔍 Complete Data Coverage

- Multiple user roles (admin + customers)
- Various product categories and prices
- Different order statuses and shipping addresses
- Active shopping carts with items

### 🧪 Comprehensive Testing

- Test all API endpoints immediately
- Verify complex relationships (orders ↔ users ↔ addresses)
- Test edge cases (out of stock products, empty carts)
- Real-world Brazilian data (CEP codes, addresses, names)

### 🚀 Quick Demo Ready

- Perfect for demonstrations
- Realistic e-commerce data
- Multiple user personas for different test scenarios

### File Uploads

- Use `form-data` for image uploads
- Maximum 5 files per request
- Supported formats: JPG, JPEG, PNG, GIF

## 📞 Support

If you encounter any issues with the API or Postman collection:

1. Check the API server logs
2. Verify environment variables are set correctly
3. Ensure you're using the correct HTTP methods and endpoints
4. Check request body format and required fields

## 🏗️ Development Notes

- The API uses PostgreSQL database
- JWT tokens are used for authentication
- File uploads are stored locally in `/uploads` directory
- First registered user automatically becomes ADMIN
- Addresses support Brazilian CEP validation
- Orders are created from cart items automatically
- Products support multiple categories and images

## 📄 API Documentation

For detailed API documentation including all available fields, validation rules, and response formats, refer to the main project README.md file.
