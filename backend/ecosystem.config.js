/**
 * PM2 Ecosystem Configuration
 * 
 * This configuration runs the application as two separate processes:
 * 1. avioservis-backend - Main API server (handles HTTP requests, port 3001)
 * 2. avioservis-cron - Cron jobs process (handles scheduled tasks)
 * 
 * Benefits of this architecture:
 * - Isolation: Cron jobs won't block the API
 * - Independent restart: Restart one without affecting the other
 * - Resource monitoring: Track CPU/Memory separately
 * - Easier debugging: Separate logs
 * 
 * Usage:
 *   pm2 start ecosystem.config.js                    # Start both processes
 *   pm2 restart ecosystem.config.js                  # Restart both
 *   pm2 stop ecosystem.config.js                     # Stop both
 *   pm2 logs avioservis-backend                      # View backend logs
 *   pm2 logs avioservis-cron                         # View cron logs
 *   pm2 monit                                        # Monitor all processes
 */

module.exports = {
  apps: [
    {
      name: 'avioservis-backend',
      script: './dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_file: '../logs/backend-combined.log',
      time: true,
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'avioservis-cron',
      script: './dist/cron.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        TZ: 'Europe/Sarajevo',  // ✅ KRITIČNO: Timezone za CRON jobove
      },
      error_file: '../logs/cron-error.log',
      out_file: '../logs/cron-out.log',
      log_file: '../logs/cron-combined.log',
      time: true,
      max_memory_restart: '500M',  // Povećano sa 300M
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '60s',  // Povećano sa 10s - daj procesu vremena za inicijalizaciju
      cron_restart: '0 7,19 * * *', // 07:00 UTC (08:00 Sarajevo) i 19:00 UTC (20:00 Sarajevo) - 2x dnevno
      // Health check: ako proces krši u manje od 60s, PM2 će čekati prije nego što ga ponovno pokrene
      listen_timeout: 10000,  // Timeout za proces
      kill_timeout: 5000,  // Timeout za kill command
    },
  ],
};

