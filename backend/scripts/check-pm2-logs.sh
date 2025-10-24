#!/bin/bash

# Script to check PM2 logs and restart if CRON jobs are stuck
# Usage: ./check-pm2-logs.sh

echo "Checking PM2 logs for CRON job issues..."

# Check for missed CRON executions in the last 10 minutes
MISSED_EXECUTIONS=$(pm2 logs avioservis-backend --err --lines 100 | grep -c "missed execution" || echo "0")

echo "Found $MISSED_EXECUTIONS missed CRON executions in recent logs"

# Check for IMAP errors
IMAP_ERRORS=$(pm2 logs avioservis-backend --err --lines 100 | grep -c "IMAP connection error" || echo "0")

echo "Found $IMAP_ERRORS IMAP connection errors in recent logs"

# If we have missed executions or IMAP errors, restart the service
if [ "$MISSED_EXECUTIONS" -gt 0 ] || [ "$IMAP_ERRORS" -gt 0 ]; then
    echo "Issues detected, restarting PM2 service..."
    pm2 restart avioservis-backend
    echo "PM2 service restarted"
else
    echo "No issues detected, service running normally"
fi

# Show current PM2 status
echo "Current PM2 status:"
pm2 status