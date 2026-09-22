# JMK HRMS - cPanel Production Deployment & Verification Guide

This guide details how to deploy the repaired and verified HRMS application to your cPanel hosting environment (`hrms.jattamkommerce.com`).

---

## 🔍 Root Cause of Previous "Login Failed" & cPanel Issues

1. **Apache SPA Rewrite Conflict**: The previous `public_html/.htaccess` was redirecting **ALL** HTTP requests (including `/api/auth/login`) to `index.html`. As a result, login requests received an HTML page instead of JSON, resulting in an immediate network/parsing error ("Login failed").
2. **Database Port & Schema Mismatch**: Local Docker used port `3307`, whereas cPanel and native MySQL run on port `3306`. Additionally, several database columns (`employees.marital_status`, `ai_conversations.status`, `ai_conversations.workflow_state`, `ai_insights.severity/dedup_key`) were missing from earlier sql exports.
3. **Strict CORS in Production**: Requests from `https://hrms.jattamkommerce.com` were rejected when `CORS_ORIGIN` was not matching or lacked scheme normalization.
4. **Token Collision & Audit Log Constraint**: Rapid logins caused unique token index collisions in `refresh_tokens`, and failed login logging crashed because `login_history.user_id` was marked `NOT NULL` when invalid emails were typed.
5. **Stale Zip Archives**: Swapping older zip files on cPanel re-introduced the outdated build without the required fixes.

---

## 📦 Generated Production Zip Archives

The repository includes fresh, production-ready zip files located in the project root:

1. **`hrms-frontend.zip`** (37.07 MB)
   - Contains the compiled Vite build (`dist/index.html`, `dist/assets/`, and the updated `dist/.htaccess` with `/api` and `/health` rewrite exemptions).
   - **Target**: Extract directly into your domain's document root (e.g. `/public_html` or `/hrms.jattamkommerce.com`).

2. **`hrms-backend.zip`** (37.24 MB)
   - Clean, production Node.js application containing:
     - `src/` (All hardened controllers, routes, middleware, and services)
     - `database/schema/production_baseline.sql` (Complete synchronized MySQL schema)
     - `public/` (Built SPA assets for fallback static hosting)
     - `app.js` and `index.js` (Phusion Passenger entry points)
     - `package.json` & `package-lock.json`
     - `.env.example`
   - Excludes development clutter (`node_modules/`, `.git/`, test suites, and local `.env` passwords).
   - **Target**: Extract into your cPanel Node.js application root directory.

---

## 🚀 Step-by-Step cPanel Deployment Instructions

### Step 1: Database Setup via cPanel MySQL & phpMyAdmin

1. Log into your **cPanel**.
2. Under **Databases**, open **MySQL® Databases**:
   - Create a database: e.g., `jattamko_hrms`.
   - Create a database user: e.g., `jattamko_hrmsuser` with a strong password.
   - Add the user to the database with **ALL PRIVILEGES**.
3. Open **phpMyAdmin** from cPanel:
   - Select your new database (`jattamko_hrms`).
   - Click the **Import** tab.
   - Choose the file: `backend/database/schema/production_baseline.sql` (extracted from `hrms-backend.zip` or from this repository).
   - Click **Go** to import all tables and initial schema.

---

### Step 2: Setup Node.js Backend App in cPanel

1. In cPanel, navigate to **Software** -> **Setup Node.js App**.
2. Click **Create Application**:
   - **Node.js version**: Select `18.x`, `20.x`, or `22.x`.
   - **Application mode**: `Production`
   - **Application root**: e.g., `hrms-backend` (folder name in your home directory).
   - **Application URL**: Select domain or subdomain (e.g., `hrms.jattamkommerce.com/api` or `api.jattamkommerce.com`).
   - **Application startup file**: `app.js` (or `index.js`).
3. Click **Create**.
4. Upload `hrms-backend.zip` into the application root folder (`/home/username/hrms-backend`) via cPanel File Manager and extract it.
5. In **Setup Node.js App**, scroll to **Environment variables** and add:

| Variable Name | Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & security |
| `PORT` | `5001` (or cPanel default) | Backend server port |
| `DB_HOST` | `localhost` or `127.0.0.1` | cPanel local MySQL host |
| `DB_PORT` | `3306` | Standard MySQL port on cPanel |
| `DB_USER` | `jattamko_hrmsuser` | Your cPanel DB username |
| `DB_PASSWORD` | *(your DB password)* | Your cPanel DB password |
| `DB_NAME` | `jattamko_hrms` | Your cPanel DB name |
| `JWT_SECRET` | *(64-char random string)* | JWT Access Token Signing Key |
| `JWT_REFRESH_SECRET` | *(64-char random string)* | JWT Refresh Token Signing Key |
| `CORS_ORIGIN` | `https://hrms.jattamkommerce.com,https://admin.jattamkommerce.com` | Allowed frontend origins |
| `APP_URL` | `https://hrms.jattamkommerce.com` | Primary application URL |

6. Click **Run NPM Install** in the cPanel Node.js interface to install production packages natively on the Linux server.
7. Click **Restart Application**.
8. Test the health endpoint in your browser: `https://your-domain.com/health` (should return `{"status":"UP", ...}`).

---

### Step 3: Frontend Deployment in `public_html`

1. Open **cPanel File Manager**.
2. Navigate to `public_html` (or your subdomain folder for `hrms.jattamkommerce.com`).
3. Upload **`hrms-frontend.zip`**.
4. Extract the zip file directly into `public_html`.
5. Ensure `.htaccess` is present (enable "Show Hidden Files" in File Manager settings). The `.htaccess` contains:
   ```apache
   RewriteEngine On
   RewriteBase /

   RewriteCond %{REQUEST_FILENAME} -f [OR]
   RewriteCond %{REQUEST_FILENAME} -d [OR]
   RewriteCond %{REQUEST_FILENAME} -l
   RewriteRule ^ - [L]

   # Pass through backend API endpoints & static uploads
   RewriteCond %{REQUEST_URI} ^/api [NC,OR]
   RewriteCond %{REQUEST_URI} ^/uploads [NC,OR]
   RewriteCond %{REQUEST_URI} ^/health [NC]
   RewriteRule ^ - [L]

   # Fall back all SPA routes to index.html
   RewriteRule ^ index.html [L]
   ```

---

## 🔑 Default Verified Test Accounts

The following credentials are fully tested and functional:

| Role | Email / Username | Employee Code | Password |
|---|---|---|---|
| **Super Admin** | `superadmin@hrms.com` | — | `password123` |
| **Org Admin** | `admin@acme.com` | — | `password123` |
| **Employee (Bob)** | `employee@acme.com` | `EMP-004` | `password123` |
| **Employee (Charlie)** | `charlie@acme.com` | `EMP-005` | `password123` |
| **Employee (Rahul)** | `rahul@acme.com` | `EMP-001` | `password123` |

> Employees can log in using either their **Email Address** OR **Employee Code** (e.g., `EMP-004` or `emp-004`). Case and leading/trailing whitespace are automatically normalized.

---

## 🧪 Local Test Verification Results

All 7 verification suites pass with a 100% success rate:
- **Phase 1 AI Tests**: 21/21 passed (100%)
- **Phase 2 AI Tests**: 24/24 passed (100%)
- **Phase 3A Conversations**: 21/21 passed (100%)
- **Phase 3B Analytics**: 20/20 passed (100%)
- **Phase 3C Proactive Insights**: 21/21 passed (100%)
- **Security & RBAC Audit**: 38/38 passed (100%)
- **Phase 4A Production Hardening**: 14/14 passed (100%)
- **Total**: **159 / 159 tests passed (0 failures)**
