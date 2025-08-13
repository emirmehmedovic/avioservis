#!/bin/bash

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Stop services
print_status "Stopping services..."
sudo systemctl stop avioservis-backend
sudo systemctl stop avioservis-frontend

# Pull latest code
print_status "Pulling latest code..."
git pull origin main

# Backend deployment
print_status "Deploying backend..."
cd backend

print_status "Cleaning backend cache..."
rm -rf node_modules
# Keep package-lock.json for consistent dependency versions

print_status "Clearing npm cache..."
npm cache clean --force

print_status "Installing backend dependencies..."
npm ci

print_status "Running Prisma migrations..."
npx prisma migrate deploy
npx prisma generate

print_status "Building backend..."
npm run build

# Frontend deployment
print_status "Deploying frontend..."
cd ../frontend

print_status "Cleaning frontend cache..."
rm -rf node_modules
rm -rf .next
# Keep package-lock.json for consistent dependency versions

print_status "Clearing npm cache..."
npm cache clean --force

print_status "Installing frontend dependencies..."
npm ci

print_status "Building frontend..."
npm run build

# Start services
print_status "Starting services..."
cd ..
sudo systemctl start avioservis-backend
sleep 5
sudo systemctl start avioservis-frontend

# Check status
print_status "Checking service status..."
if systemctl is-active --quiet avioservis-backend; then
    print_status "Backend service is running ✅"
else
    print_error "Backend service failed to start ❌"
    sudo systemctl status avioservis-backend
fi

if systemctl is-active --quiet avioservis-frontend; then
    print_status "Frontend service is running ✅"
else
    print_error "Frontend service failed to start ❌"
    sudo systemctl status avioservis-frontend
fi

print_status "Deployment completed! 🎉"

echo ""
echo "To check logs:"
echo "  Backend:  sudo journalctl -u avioservis-backend -f"
echo "  Frontend: sudo journalctl -u avioservis-frontend -f" 

# Mjesečno pokreni ove komande:
sudo journalctl --vacuum-time=30d
pm2 flush
sudo apt-get clean

# Provjeri disk space redovno:
df -h