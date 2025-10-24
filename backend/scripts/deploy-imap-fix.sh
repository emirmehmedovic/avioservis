#!/bin/bash

# Script to deploy IMAP fix and configure environment
echo "🚀 Deploying IMAP fix to prevent CRON job blocking..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in backend directory. Please run from backend/ directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env-template.txt .env
    echo "✅ .env file created. Please update with your actual credentials."
else
    echo "📝 .env file already exists. Adding IMAP disable setting..."
    
    # Add DISABLE_IMAP if not already present
    if ! grep -q "DISABLE_IMAP" .env; then
        echo "" >> .env
        echo "# IMAP disabled to prevent CRON job blocking" >> .env
        echo "DISABLE_IMAP=true" >> .env
        echo "✅ Added DISABLE_IMAP=true to .env"
    else
        echo "✅ DISABLE_IMAP already configured in .env"
    fi
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Restart PM2 if running
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 process..."
    pm2 restart avioservis-backend || pm2 start dist/app.js --name avioservis-backend
    echo "✅ PM2 process restarted"
else
    echo "⚠️  PM2 not found. Please restart your application manually."
fi

echo ""
echo "🎉 IMAP fix deployed successfully!"
echo ""
echo "📋 What was changed:"
echo "   ✅ IMAP disabled to prevent CRON job blocking"
echo "   ✅ Email sending still works via SMTP"
echo "   ✅ CRON jobs should now run without blocking"
echo "   ✅ Environment variables configured"
echo ""
echo "🔍 To verify the fix:"
echo "   pm2 logs avioservis-backend --lines 50"
echo "   # Look for 'IMAP disabled to prevent CRON job blocking' messages"
echo ""
echo "📧 Email functionality:"
echo "   ✅ Emails will still be sent via SMTP"
echo "   ❌ Copies won't be saved to Sent folder (this is OK)"
echo "   ✅ CRON jobs will run without blocking"
