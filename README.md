# SHIVBAEMPIRE

**Shivba Tarun Mitra Mandal — Mandal Management Platform**

A complete production-ready full-stack web application for managing Yatra collections, donors, expenses, receipts, and financial reporting.

---

## Features

- 🧑‍🤝‍🧑 **Donor Management** — Add, edit, search, filter donors; duplicate detection; payment status tracking
- 💰 **Collection / Vargani** — Record collections with MySQL transactions; receipt auto-generation; QR codes
- 🧾 **Professional Receipts** — PDF download, WhatsApp sharing, public QR verification
- 📊 **Financial Dashboard** — Real-time KPIs, charts (Recharts), target progress
- 💸 **Expense Management** — 12 categories, full CRUD, expense reports
- 👥 **Collector Management** — Create collectors, view their live performance stats
- 📈 **Reports** — 8 report types + Final Yatra Report; CSV export
- 🔍 **Audit Logs** — Every financial action tracked with old/new data
- 🎫 **Multi-Yatra Events** — Support for multiple events (Yatra 2026, 2027, etc.)
- 🔐 **Security** — JWT, bcrypt, Helmet, CORS, rate limiting, parameterized SQL
- 🐳 **Docker** — MySQL data volume persists across deployments
- 🚀 **CI/CD** — GitHub Actions (test → build → migrate → deploy)

---

## Technology Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + Recharts + Axios |
| Backend | Node.js + Express + JWT + bcrypt + Helmet |
| Database | MySQL 8.0 (DECIMAL for money, migrations) |
| Infrastructure | Docker + Docker Compose + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions |

---

## Project Structure

```
SHIVBAEMPIRE/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express API
├── database/
│   ├── migrations/    # SQL migration files (run in order)
│   └── seed/          # Dev-only seed data
├── nginx/             # Nginx config
├── .github/
│   └── workflows/
│       └── ci-cd.yml  # GitHub Actions CI/CD
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- MySQL 8.0
- npm

### 1. Clone & Configure

```bash
git clone https://github.com/yourorg/shivbaempire.git
cd shivbaempire
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

### 2. Database Setup

```bash
# Create database in MySQL
mysql -u root -p -e "CREATE DATABASE shivbaempire CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'shivba_user'@'localhost' IDENTIFIED BY 'your_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON shivbaempire.* TO 'shivba_user'@'localhost';"

# Run migrations
cd backend && node src/utils/migrate.js

# Load dev seed data (optional)
node src/utils/seed.js
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
# API running at http://localhost:5000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
# UI running at http://localhost:5173
```

### 5. Default Credentials (Dev Seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin@123` |
| Collector | `rajesh.patil` | `collector@123` |
| Collector | `sunita.desai` | `collector@123` |

> ⚠️ **Change all passwords immediately before production deployment!**

---

## Docker Deployment

### Development

```bash
cp .env.example .env
# Edit .env
docker-compose up --build
```

### Production VPS

```bash
# 1. Prepare VPS directory
mkdir -p /opt/shivbaempire
cd /opt/shivbaempire

# 2. Clone repo
git clone https://github.com/yourorg/shivbaempire.git .

# 3. Create production .env (never commit this!)
cp .env.example .env
nano .env  # Fill in real values

# 4. Start services
docker-compose up -d

# 5. Check health
curl http://localhost:5000/api/health
```

---

## HTTPS with Let's Encrypt

```bash
# Install certbot on VPS
sudo apt install certbot

# Stop nginx temporarily
docker-compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx/nginx.conf with your domain
# Restart
docker-compose up -d nginx

# Auto-renew (add to crontab)
0 0 * * * certbot renew --quiet && docker-compose exec nginx nginx -s reload
```

---

## GitHub Actions CI/CD

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `VPS_HOST` | Your VPS IP or hostname |
| `VPS_USERNAME` | SSH username (e.g., `ubuntu`) |
| `VPS_SSH_PRIVATE_KEY` | SSH private key (RSA/Ed25519) |
| `VPS_PORT` | SSH port (default 22) |

### Pipeline Flow

```
Push to main
     ↓
1. Install frontend + backend deps
2. Run database migrations (test DB)
3. Run backend Jest tests
4. Build frontend (Vite)
5. Validate Docker builds
     ↓ (all pass)
6. SSH to VPS
7. git pull (never overwrites .env)
8. Run migrations safely
9. docker compose build + up (rolling)
10. Health check
11. Done ✅
```

> ⚠️ The pipeline **never deletes MySQL data** or the production `.env`

---

## Database Backup

```bash
# Manual backup
mysqldump -u root -p shivbaempire > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
mysql -u root -p shivbaempire < backup_20260101_120000.sql

# Automated daily backup (add to VPS crontab)
0 2 * * * mysqldump -u shivba_user -p'yourpass' shivbaempire > /opt/shivbaempire/backups/backup_$(date +\%Y\%m\%d).sql
```

---

## API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://yourdomain.com/api`

### Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login |
| GET | `/auth/me` | JWT | Current user |
| GET | `/donors` | JWT | List donors |
| POST | `/donors` | JWT | Create donor |
| GET | `/donors/:id` | JWT | Donor details |
| PUT | `/donors/:id` | JWT | Update donor |
| DELETE | `/donors/:id` | Admin | Delete donor |
| GET | `/collections` | JWT | List collections |
| POST | `/collections` | JWT | Record collection + generate receipt |
| DELETE | `/collections/:id` | Admin | Cancel collection |
| GET | `/receipts/verify/:receiptNumber` | Public | Verify receipt |
| GET | `/receipts/:id/pdf` | JWT | Download PDF |
| GET | `/expenses` | JWT | List expenses |
| POST | `/expenses` | JWT | Add expense |
| GET | `/collectors` | Admin | List collectors |
| POST | `/collectors` | Admin | Create collector |
| GET | `/reports/dashboard` | JWT | Dashboard KPIs |
| GET | `/reports/final` | Admin | Final Yatra report |
| GET | `/activity-logs` | Admin | Audit trail |
| GET | `/api/health` | Public | Health check |

---

## Security Notes

- All passwords hashed with bcrypt (rounds=12)
- JWT tokens expire in 24h
- SQL injection prevented via parameterized queries
- Rate limiting: 100 req/15min (global), 20 req/15min (login)
- Helmet.js security headers on all responses
- No secrets in source code — use `.env`
- Production `.env` only lives on VPS

---

## Troubleshooting

**MySQL connection refused:**
```bash
docker-compose logs mysql
# Wait for "ready for connections"
docker-compose restart backend
```

**Backend not starting:**
```bash
docker-compose logs backend
# Check .env has all required variables
```

**Receipt PDF fails:**
```bash
# Ensure pdfkit is installed
cd backend && npm install pdfkit
```

---

## License

© 2026 SHIVBAEMPIRE — Shivba Tarun Mitra Mandal. All rights reserved.
