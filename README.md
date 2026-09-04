# HRMS SaaS Platform

A multi-tenant AI-powered Human Resource Management System.

## Prerequisites

- Node.js (v18 or higher)
- Docker & Docker Compose (for MySQL database)

## Development Setup

We have configured a unified command to start the entire stack: Database, Backend, and Frontend.

From the project root, simply run:

```bash
npm run dev
```

This single command will:
1. Start the MySQL Docker container (`docker compose up -d`) if it's not already running.
2. Wait automatically until MySQL is ready to accept connections.
3. Start the Node.js backend.
4. Wait for the backend API to be available.
5. Start the React Vite frontend and automatically open it in your default browser.
6. Cleanly shut down all child Node processes if you press `Ctrl+C`.

### Individual Commands

If you prefer to run services individually:

- **Database Only:** `npm run db:up` (Stop with `npm run db:down`)
- **Backend Only:** `npm run dev:backend`
- **Frontend Only:** `npm run dev:frontend`

## Project Structure

- `/backend`: Express API, MySQL Database schemas, and Auth services.
- `/frontend`: React application (Vite), Components, and Contexts.
- `/scripts`: Utilities for checking database readiness and orchestration.
- `/docker-compose.yml`: Local database definition.

## Default Credentials

A Super Admin user is seeded automatically when executing the initial SQL scripts.

- **Email:** `superadmin@hrms.com`
- **Password:** `password123`
