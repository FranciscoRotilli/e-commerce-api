#!/bin/bash

# Docker management script for e-commerce API

set -e

function show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show logs"
    echo "  db          Access database shell"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed the database"
    echo "  reset       Reset database (remove volumes)"
    echo "  clean       Clean up containers and images"
    echo "  help        Show this help message"
}

function start_dev() {
    echo "Starting development environment..."
    docker-compose -f docker-compose.dev.yml up --build -d
    echo "Development environment started!"
    echo "API: http://localhost:3000"
    echo "Database: localhost:5432"
}

function start_prod() {
    echo "Starting production environment..."
    docker-compose up --build -d
    echo "Production environment started!"
    echo "API: http://localhost:3000"
}

function stop_services() {
    echo "Stopping services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo "Services stopped!"
}

function restart_services() {
    echo "Restarting services..."
    docker-compose restart
    echo "Services restarted!"
}

function show_logs() {
    echo "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

function access_db() {
    echo "Accessing database..."
    docker-compose exec db psql -U postgres -d ecommerce
}

function run_migrations() {
    echo "Running migrations..."
    docker-compose exec api npx prisma migrate deploy
    echo "Migrations completed!"
}

function seed_db() {
    echo "Seeding database..."
    docker-compose exec api npx prisma db seed
    echo "Database seeded!"
}

function reset_db() {
    echo "Resetting database (this will delete all data)..."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        echo "Database reset!"
    else
        echo "Cancelled."
    fi
}

function clean_docker() {
    echo "Cleaning up Docker resources..."
    docker-compose down --remove-orphans
    docker system prune -f
    echo "Cleanup completed!"
}

# Main script logic
case "${1:-help}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    db)
        access_db
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_db
        ;;
    reset)
        reset_db
        ;;
    clean)
        clean_docker
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
