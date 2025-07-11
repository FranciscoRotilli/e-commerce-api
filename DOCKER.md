# Docker Setup for E-commerce API

This directory contains Docker configuration files to run the e-commerce API with PostgreSQL database.

## Files Overview

- `Dockerfile` - Production build configuration
- `Dockerfile.dev` - Development build configuration with hot reloading
- `docker-compose.yml` - Production environment setup
- `docker-compose.dev.yml` - Development environment setup
- `docker-entrypoint.sh` - Entrypoint script for database migrations
- `.dockerignore` - Files to exclude from Docker build

## Quick Start

### Development Environment

1. **Start the development environment:**

   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **The API will be available at:** `http://localhost:3000`

3. **Database access:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `ecommerce_dev`
   - Username: `postgres`
   - Password: `postgres`

### Production Environment

1. **Start the production environment:**

   ```bash
   docker-compose up --build
   ```

2. **The API will be available at:** `http://localhost:3000`

## Environment Variables

The following environment variables are configured:

- `NODE_ENV` - Application environment (development/production)
- `PORT` - Application port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string

## Database Management

### Running Migrations

Migrations are automatically run when the container starts via the entrypoint script.

To run migrations manually:

```bash
docker-compose exec api npx prisma migrate deploy
```

### Seeding the Database

To seed the database with initial data:

```bash
docker-compose exec api npx prisma db seed
```

Or set the `RUN_SEED=true` environment variable in docker-compose.yml to seed automatically on startup.

### Accessing the Database

```bash
docker-compose exec db psql -U postgres -d ecommerce
```

## Development Workflow

### View Logs

```bash
docker-compose logs -f api
docker-compose logs -f db
```

### Restart Services

```bash
docker-compose restart api
docker-compose restart db
```

### Stop Services

```bash
docker-compose down
```

### Remove Volumes (Reset Database)

```bash
docker-compose down -v
```

## File Structure

```
├── Dockerfile              # Production build
├── Dockerfile.dev         # Development build
├── docker-compose.yml     # Production environment
├── docker-compose.dev.yml # Development environment
├── docker-entrypoint.sh   # Startup script
└── .dockerignore          # Excluded files
```

## Volumes

- `postgres_data` - Persistent PostgreSQL data (production)
- `postgres_dev_data` - Persistent PostgreSQL data (development)
- `./uploads` - Mounted uploads directory

## Network

Both setups create isolated Docker networks:

- `ecommerce-network` (production)
- `ecommerce-dev-network` (development)

## Health Checks

The PostgreSQL service includes health checks to ensure the database is ready before starting the API.

## Troubleshooting

### Database Connection Issues

- Ensure the database service is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs db`

### API Not Starting

- Check API logs: `docker-compose logs api`
- Verify environment variables are set correctly

### Port Conflicts

- Change the port mapping in docker-compose.yml if port 3000 or 5432 are already in use

### Reset Everything

```bash
docker-compose down -v --remove-orphans
docker system prune -f
docker-compose up --build
```
