#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_status "🚀 Starting deployment with Cron fixes..."

# Navigate to project directory
cd /home/avio/avioservis

# Stop services
print_status "Stopping services..."
pm2 stop all || true

# Git pull
print_status "Pulling latest changes..."
git pull origin main

# Backend deployment
print_status "Deploying backend..."
cd backend

print_status "Cleaning backend cache..."
rm -rf node_modules
rm -rf dist

print_status "Clearing npm cache..."
npm cache clean --force

print_status "Installing backend dependencies..."
npm ci

print_status "Running Prisma migrations..."
npx prisma migrate deploy
npx prisma generate

print_status "Building backend..."
npm run build

# Verify critical files exist
if [ ! -f "dist/app.js" ]; then
    print_error "dist/app.js not found! Build failed."
    exit 1
fi

if [ ! -f "dist/cron.js" ]; then
    print_error "dist/cron.js not found! Build failed."
    exit 1
fi

if [ ! -f "dist/lib/prisma.js" ]; then
    print_error "dist/lib/prisma.js not found! Build failed."
    exit 1
fi

print_status "✅ All critical backend files built successfully"

# Frontend deployment
print_status "Deploying frontend..."
cd ../frontend

print_status "Cleaning frontend cache..."
rm -rf node_modules
rm -rf .next

print_status "Clearing npm cache..."
npm cache clean --force

print_status "Installing frontend dependencies..."
npm ci

print_status "Building frontend..."
npm run build

# Create logs directory if it doesn't exist
print_status "Creating logs directory..."
cd ..
mkdir -p logs

# Start services with PM2
print_status "Starting services with PM2..."
cd backend

# Stop old PM2 processes (if any)
pm2 delete all || true

# Start new processes with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (if not already setup)
pm2 startup || print_warning "PM2 startup may already be configured"

# Wait for services to start
print_status "Waiting for services to initialize..."
sleep 5

# Check PM2 status
print_status "Checking PM2 process status..."
pm2 status

# Verify Backend API is running
print_status "Verifying Backend API server..."
if curl -s http://localhost:3001/ > /dev/null; then
    print_status "✅ Backend API server is responding"
else
    print_error "❌ Backend API server is not responding"
    pm2 logs avioservis-backend --err --lines 50
    exit 1
fi

# Verify Cron process is running
print_status "Verifying Cron process..."
if pm2 show avioservis-cron > /dev/null 2>&1; then
    print_status "✅ Cron process is running"
    print_status "Checking cron initialization logs..."
    pm2 logs avioservis-cron --lines 20 --nostream
else
    print_error "❌ Cron process failed to start"
    exit 1
fi

# Frontend startup (with PM2)
cd ../frontend
print_status "Starting frontend with PM2..."
pm2 start npm --name "avioservis-frontend" -- start || print_warning "Frontend already running"
pm2 save

# Final status check
print_status ""
print_status "═══════════════════════════════════════════════════"
print_status "✅ Deployment Completed Successfully! 🎉"
print_status "═══════════════════════════════════════════════════"
print_status ""
print_status "📊 Process Status:"
pm2 status

print_status ""
print_status "📋 Next Steps:"
echo ""
echo "  1. Monitor cron execution tonight:"
echo "     pm2 logs avioservis-cron --lines 100"
echo ""
echo "  2. Check for 'missed execution' errors:"
echo "     pm2 logs avioservis-cron --err | grep -i 'missed'"
echo ""
echo "  3. Monitor API performance:"
echo "     pm2 monit"
echo ""
echo "  4. View individual logs:"
echo "     Backend:  pm2 logs avioservis-backend"
echo "     Cron:     pm2 logs avioservis-cron"
echo "     Frontend: pm2 logs avioservis-frontend"
echo ""
print_status "🔍 Expected cron executions tonight:"
echo "     01:00 - Fuel Consistency Check"
echo "     05:00 - Vehicle Expiration Notifications"
echo "     06:00 - XML Invoice Payment Status"
echo "     06:30 - Email Invoice Payment Status"
echo "     23:50 - Email Invoice Dispatch"
echo "     23:55 - XML Invoice Dispatch (Wizz)"
echo "     23:57 - Email Invoice Retry"
echo ""
print_status "📄 For detailed documentation, see:"
echo "     - CRON_FIXES_DEPLOYMENT.md"
echo "     - CRON_FIXES_SUMMARY.md"
echo ""

# Cleanup (monthly maintenance)
print_warning "Monthly maintenance commands (run manually):"
echo "  pm2 flush                        # Clear old logs"
echo "  sudo apt-get clean               # Clean package cache"
echo "  df -h                            # Check disk space"
echo ""

print_status "Deployment script completed! ✨"

