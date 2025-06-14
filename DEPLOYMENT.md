# Deployment Guide for Avioservis on a VPS

This guide provides step-by-step instructions for deploying the Avioservis application (backend and frontend) on a Virtual Private Server (VPS) running Ubuntu 22.04.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your VPS:

- **Node.js** (v18 or later) and **npm**
- **Git**
- **PM2** (Process Manager for Node.js)
- **Nginx** (Web server and reverse proxy)
- **PostgreSQL** (Database)

### Installation Commands

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for a specific version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git, Nginx, and PostgreSQL
sudo apt install -y git nginx postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2
```

## 2. Database Setup

1.  **Log in to PostgreSQL:**
    ```bash
    sudo -u postgres psql
    ```

2.  **Create a new database and user.** Replace `avioservis_db`, `avioservis_user`, and `your_strong_password` with your desired values.
    ```sql
    CREATE DATABASE avioservis_db;
    CREATE USER avioservis_user WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE avioservis_db TO avioservis_user;
    \q
    ```

3.  **Construct your `DATABASE_URL`**. It will look like this:
    `postgresql://avioservis_user:your_strong_password@localhost:5432/avioservis_db`

## 3. Project Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/emirmehmedovic/dataavioservis.git
    cd dataavioservis
    ```

### Backend Setup (`/backend`)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the `.env` file:**
    ```bash
    nano .env
    ```
    Add the following content, replacing the placeholder values with your actual configuration. Use a strong, random string for `JWT_SECRET`.

    ```env
    # Environment
    NODE_ENV=production

    # Server
    PORT=4000

    # Database
    DATABASE_URL="postgresql://avioservis_user:your_strong_password@localhost:5432/avioservis_db"

    # Frontend URL
    FRONTEND_URL="http://your_domain.com"

    # Security
    JWT_SECRET="your_super_strong_and_random_jwt_secret"
    JWT_EXPIRY="7d"

    # Optional: Redis for Rate Limiting
    # REDIS_URL="redis://localhost:6379"
    # RATE_LIMIT_WHITELIST="127.0.0.1"
    ```

4.  **Apply database migrations:**
    ```bash
    npx prisma migrate deploy
    ```

5.  **Build the project:**
    ```bash
    npm run build
    ```

### Frontend Setup (`/frontend`)

1.  **Navigate to the frontend directory (from the project root):**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env.local` file:**
    ```bash
    nano .env.local
    ```
    Add the following environment variable. This tells your Next.js app where the backend API is located.

    ```env
    NEXT_PUBLIC_API_URL="http://your_domain.com/api"
    ```
    *Note: We will configure Nginx to proxy requests from `/api` to the backend.*

4.  **Build the project:**
    ```bash
    npm run build
    ```

## 4. Running the Application with PM2

PM2 will keep your applications running in the background and restart them automatically if they crash.

1.  **Start the backend (from the `/backend` directory):**
    ```bash
    cd ../backend
    pm2 start dist/app.js --name avioservis-backend
    ```

2.  **Start the frontend (from the `/frontend` directory):**
    ```bash
    cd ../frontend
    pm2 start npm --name avioservis-frontend -- start
    ```
    The frontend runs on port 3000 by default.

3.  **Save the PM2 process list:**
    ```bash
    pm2 save
    ```
    This ensures your apps will restart automatically after a server reboot.

## 5. Configure Nginx as a Reverse Proxy

This configuration will serve your frontend application and forward all requests starting with `/api` to your backend.

1.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/avioservis
    ```

2.  **Add the following configuration.** Replace `your_domain.com` with your actual domain name.

    ```nginx
    server {
        listen 80;
        server_name your_domain.com;

        # Handle API requests
        location /api {
            proxy_pass http://localhost:4000; # Backend port
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Handle frontend requests
        location / {
            proxy_pass http://localhost:3000; # Frontend port
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Enable the new site by creating a symbolic link:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/avioservis /etc/nginx/sites-enabled/
    ```

4.  **Test the Nginx configuration for errors:**
    ```bash
    sudo nginx -t
    ```

5.  **Restart Nginx to apply the changes:**
    ```bash
    sudo systemctl restart nginx
    ```

Your application should now be accessible at `http://your_domain.com`.

## 6. (Optional) Secure with HTTPS using Certbot

1.  **Install Certbot:**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Obtain and install an SSL certificate:**
    ```bash
    sudo certbot --nginx -d your_domain.com
    ```
    Follow the on-screen prompts. Certbot will automatically update your Nginx configuration and set up a cron job to renew the certificate.

Your application is now deployed and accessible via HTTPS.
