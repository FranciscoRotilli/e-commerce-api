# NestJS E-Commerce API

A comprehensive and robust RESTful API for a full-featured e-commerce platform, built as a study project to explore and implement advanced backend concepts using the NestJS ecosystem.

## 📖 About The Project

This API serves as the complete backend for an e-commerce application. It includes essential features like secure user authentication with JWT, a complete product catalog with advanced search and filtering, a transactional order management system, and much more.

While the core functionalities are robust and complete, the project is designed as a foundational boilerplate. It can be extended with additional complementary features and is not intended for production use without further hardening and specific configurations (like using a cloud storage service instead of local storage).

---

## ✨ Key Features

- **Authentication & Security:**
  - System for login with **JWT** (JSON Web Tokens).
  - Complete **"Forgot Password"** flow with secure, expiring, and hashed reset tokens. The token generation and reset logic is fully functional, but the email dispatch is currently **simulated** by logging the token to the console. Integration with an email service (like SendGrid, Mailgun) is required for production.
  - **Password Change** functionality for logged-in users.
  - Password hashing with `bcrypt`.
  - **Role-Based Access Control (RBAC)** using custom decorators (`@Roles`) to protect routes for `USER` and `ADMIN` roles.

- **User Management:**
  - User registration, with the **first registered user automatically becoming an `ADMIN`**.
  - Endpoints for authenticated users to manage their own profile (`/users/me`).
  - Admin-exclusive endpoints for listing, searching, and managing all users.
  - Secure data handling, ensuring password hashes are never exposed in API responses.

- **Product Catalog:**
  - Full CRUD (Create, Read, Update, Delete) functionality for products, restricted to `ADMIN` users.
  - A powerful public-facing `GET /products` endpoint with:
    - Text-based search across multiple fields (name, description, slug).
    - Advanced filtering by `categoryId`, price range, etc.
    - Dynamic and secure sorting by whitelisted fields (`name`, `currentPrice`, `createdAt`).
  - Dynamic data views, showing extended details for `ADMIN`s and a curated public view for customers.
  - **Image Uploads** for products, supporting multiple files with validation. The current implementation uses **local file storage**, which is suitable for development. The service can be easily adapted to use a cloud storage service like **Amazon S3, Google Cloud Storage, or a CDN** for a production environment.
  - **Soft-delete** pattern via product status changes (`ACTIVE`, `INACTIVE`, `ARCHIVED`).

- **Categories & Addresses:**
  - Full CRUD for product categories and user addresses.
  - Automatic `slug` generation for categories for user-friendly URLs.
  - **Real-time CEP (Brazilian Zip Code) validation** using an external API, implemented as a custom `class-validator` decorator.
  - Transactional logic to ensure a user can only have **one primary address**.

- **Order Management:**
  - **Transactional order creation** using `prisma.$transaction` to guarantee data integrity (stock is checked and updated atomically with order creation).
  - **Finite State Machine** for order statuses (`PENDING`, `PAID`, `SHIPPED`, etc.) with validated transitions.
  - Secure endpoints for users to view and **cancel their own orders** based on business rules.
  - Comprehensive admin endpoints for managing all orders.

- **Architecture & Code Quality:**
  - Modular design with clear separation of concerns.
  - Reusable, generic **pagination utility** to provide consistent responses across all list endpoints.
  - Extensive use of DTOs and `class-validator` for robust request validation.
  - Clean and consistent error handling using NestJS built-in exceptions.

---

## 🛠️ Tech Stack

- **Backend:** [NestJS](https://nestjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **Authentication:** [JWT](https://jwt.io/), [Passport.js](http://www.passportjs.org/)
- **File Uploads:** [Multer](https://github.com/expressjs/multer)
- **Security:** [bcrypt](https://www.npmjs.com/package/bcrypt)
- **Validation:** [class-validator](https://github.com/typestack/class-validator), [class-transformer](https://github.com/typestack/class-transformer)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (recommended for easy setup)

### Installation & Setup

#### 🐳 Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose, which will set up both the API and PostgreSQL database automatically.

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Start the development environment:**

    ```bash
    ./docker.sh dev
    ```

    Or manually:

    ```bash
    docker-compose -f docker-compose.dev.yml up --build
    ```

3.  **The API will be ready at:** `http://localhost:3000`

The Docker setup automatically handles:

- PostgreSQL database setup
- Database migrations
- Prisma client generation
- Hot reloading for development

#### 🔧 Manual Setup (Alternative)

If you prefer to set up the environment manually:

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    - Create a `.env` file in the project root.
    - Add the necessary variables based on the example below.

    **_.env.example_**

    ```env
    # URL for the PostgreSQL database connection, preferably running in Docker
    DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

    # Secret key for signing JWTs. Use a strong, randomly generated string.
    JWT_SECRET="YOUR_SUPER_STRONG_SECRET_KEY"

    # --- For a Production Email Service (Optional) ---
    # EMAIL_HOST=smtp.example.com
    # EMAIL_PORT=587
    # EMAIL_USER=user@example.com
    # EMAIL_PASS=password
    ```

4.  **Start the Database with Docker:**

    ```bash
    docker run --name postgres-ecommerce \
      -e POSTGRES_DB=ecommerce \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 \
      -d postgres:15-alpine
    ```

5.  **Apply Database Migrations:**
    - This command will create the tables and types in your database based on the `schema.prisma` file.
      ```bash
      npx prisma migrate dev
      ```

6.  **Seed the Database:**
    - This command executes the `prisma/seed.ts` script to populate the database with sample data.
      ```bash
      npx prisma db seed
      ```

---

## ⚙️ Running the Application

### With Docker (Recommended)

```bash
# Development mode with hot reloading
./docker.sh dev

# Production mode
./docker.sh prod

# View logs
./docker.sh logs

# Stop services
./docker.sh stop
```

### Manual Setup

```bash
# Development mode with hot-reload
npm run start:dev
```

The API will be available at `http://localhost:3000`.

---

## 🐳 Docker Configuration

This project includes a comprehensive Docker setup for both development and production environments.

### Available Docker Commands

The included `docker.sh` script provides convenient commands:

```bash
./docker.sh dev         # Start development environment
./docker.sh prod        # Start production environment
./docker.sh stop        # Stop all services
./docker.sh restart     # Restart services
./docker.sh logs        # Show logs
./docker.sh db          # Access database shell
./docker.sh migrate     # Run database migrations
./docker.sh seed        # Seed the database
./docker.sh reset       # Reset database (removes all data)
./docker.sh clean       # Clean up Docker resources
```

### Docker Files

- **`Dockerfile`** - Production optimized build
- **`Dockerfile.dev`** - Development build with hot reloading
- **`docker-compose.yml`** - Production environment
- **`docker-compose.dev.yml`** - Development environment
- **`docker-entrypoint.sh`** - Handles migrations and startup
- **`DOCKER.md`** - Detailed Docker documentation

### Environment Configuration

#### Development Environment

- **API**: `http://localhost:3000`
- **Database**: `localhost:5432`
- **Database Name**: `ecommerce_dev`
- **Hot Reloading**: Enabled
- **Volume Mounting**: Source code mounted for live updates

#### Production Environment

- **API**: `http://localhost:3000`
- **Database**: `localhost:5432`
- **Database Name**: `ecommerce`
- **Optimized Build**: Multi-stage Docker build
- **Automatic Migrations**: Run on startup

### Database Access

```bash
# Using the script
./docker.sh db

# Or manually
docker-compose exec db psql -U postgres -d ecommerce
```

For detailed Docker setup instructions, see [DOCKER.md](./DOCKER.md).

---

## 📝 API Endpoints

This is a summary of the main available routes. Refer to the DTO files for all available query parameters and body payloads.

### Auth (`/auth`)

| Method | Route              | Description                                | Protection    |
| :----- | :----------------- | :----------------------------------------- | :------------ |
| `POST` | `/login`           | Authenticates a user and returns a JWT.    | **Public**    |
| `GET`  | `/profile`         | Returns the profile of the logged-in user. | Authenticated |
| `POST` | `/forgot-password` | Initiates the password recovery flow.      | **Public**    |
| `POST` | `/reset-password`  | Finalizes the password recovery flow.      | **Public**    |

### Users (`/users`)

| Method  | Route          | Description                                       | Protection    |
| :------ | :------------- | :------------------------------------------------ | :------------ |
| `POST`  | `/`            | Creates a new user.                               | **Public**    |
| `GET`   | `/`            | Lists, searches, and filters all users.           | **Admin**     |
| `GET`   | `/:id`         | Finds a single user by ID.                        | **Admin**     |
| `PATCH` | `/me`          | Allows a logged-in user to update their profile.  | Authenticated |
| `PATCH` | `/me/password` | Allows a logged-in user to change their password. | Authenticated |
| `PATCH` | `/:id/role`    | Changes the role of a user.                       | **Admin**     |

### Products (`/products`)

| Method   | Route              | Description                                   | Protection |
| :------- | :----------------- | :-------------------------------------------- | :--------- |
| `GET`    | `/`                | Lists, searches, filters, and sorts products. | **Public** |
| `GET`    | `/id/:id`          | Finds a product by ID.                        | **Public** |
| `GET`    | `/:slug`           | Finds a product by slug.                      | **Public** |
| `POST`   | `/`                | Creates a new product.                        | **Admin**  |
| `PATCH`  | `/id/:id`          | Updates a product's details.                  | **Admin**  |
| `POST`   | `/:id/images`      | Uploads images for a product.                 | **Admin**  |
| `DELETE` | `/images/:imageId` | Deletes a product image.                      | **Admin**  |
| `PATCH`  | `/:id/status`      | Changes a product's status.                   | **Admin**  |

### Orders (`/orders`)

| Method  | Route         | Description                                   | Protection    |
| :------ | :------------ | :-------------------------------------------- | :------------ |
| `POST`  | `/`           | Creates a new order.                          | Authenticated |
| `GET`   | `/`           | Lists orders (user's own or all for admin).   | Authenticated |
| `GET`   | `/:id`        | Finds a specific order belonging to the user. | Authenticated |
| `POST`  | `/:id/cancel` | Allows a user to cancel their own order.      | Authenticated |
| `PATCH` | `/:id/status` | Changes an order's status.                    | **Admin**     |

### Categories (`/categories`)

| Method | Route                 | Description                      | Protection |
| :----- | :-------------------- | :------------------------------- | :--------- |
| `GET`  | `/`                   | Lists all visible categories.    | **Public** |
| `GET`  | `/id/:id` or `/:slug` | Finds a single category.         | **Public** |
| `POST` | `/`                   | Creates a new category.          | **Admin**  |
| `POST` | `/:id/status`         | Toggles a category's visibility. | **Admin**  |

### Addresses (`/addresses`)

| Method   | Route         | Description                                   | Protection    |
| :------- | :------------ | :-------------------------------------------- | :------------ |
| `POST`   | `/`           | Creates a new address for the logged-in user. | Authenticated |
| `GET`    | `/`           | Lists all addresses for the logged-in user.   | Authenticated |
| `GET`    | `/:id`        | Finds a specific address.                     | Authenticated |
| `PATCH`  | `/:id`        | Updates a specific address.                   | Authenticated |
| `DELETE` | `/:id/delete` | Deactivates (soft-deletes) an address.        | Authenticated |

---

## 🌱 TBD / Future Features

- Implement **Unit and Integration Tests**
- Add **Docker Production Optimizations** (multi-stage builds, health checks)
- Implement **CI/CD Pipeline** with Docker deployment
- Add **Kubernetes** deployment manifests
- Develop a **Shopping Cart** feature
- Build a **Front-end** application to consume the API
- Integrate a **Payment Gateway** (e.g., Pagseguro, Mercado Pago)
- Implement **Shipping Cost Calculation** (e.g., via Correios API)
- Add a **Product Review and Rating** system
- Create a **Wishlist** functionality for users
- Develop a **Coupon and Discount** system
- Implement **"Back in Stock" Notifications**
- Add **Redis** for caching and session management
- Implement **API Rate Limiting** and **Request Throttling**

---

## 🚀 Deployment

### Docker Production Deployment

1. **Build and start production environment:**

   ```bash
   ./docker.sh prod
   ```

2. **For cloud deployment**, update the `docker-compose.yml` with:
   - External database connection string
   - Environment-specific secrets
   - Volume configurations for persistent storage
   - Load balancer configurations

3. **Environment variables to configure:**
   ```bash
   DATABASE_URL=postgresql://user:password@your-db-host:5432/dbname
   JWT_SECRET=your-production-jwt-secret
   NODE_ENV=production
   ```

### Manual Production Deployment

1. **Build the application:**

   ```bash
   npm run build
   ```

2. **Start with PM2 or similar process manager:**
   ```bash
   npm run start:prod
   ```

For detailed deployment guides and best practices, refer to the [DOCKER.md](./DOCKER.md) documentation.
