# HRMS SaaS Database

This directory contains the complete MySQL 8 schema for the multi-tenant AI-First HRMS SaaS product.

## Architecture

The database is designed with strict multi-tenancy. Almost every table includes an `organization_id` foreign key.
The application backend will enforce row-level access control based on the JWT token's `organization_id`.

`SUPER_ADMIN` accounts and system roles have a `NULL` `organization_id`, separating them from tenant data.

## Execution Order

To initialize a fresh database, execute the SQL files in this exact order to prevent Foreign Key constraint errors:

1. `01_platform.sql`
2. `02_auth_rbac.sql`
3. `03_organization_employee.sql`
4. `04_attendance.sql`
5. `05_leave.sql`
6. `06_payroll.sql`
7. `07_recruitment.sql`
8. `08_onboarding.sql`
9. `09_performance.sql`
10. `10_operations.sql`
11. `11_automation_ai.sql`
12. `12_seed_data.sql`

## How to start MySQL with Docker

From the root project directory (`/Users/aishwarya/Desktop/Jatta M Kom/HRMS`):

```bash
docker-compose up -d
```

## How to create the database and run the schema

Once the container is running, you can execute the following command to load the schema:

```bash
# Connect to MySQL and run scripts (assuming you have mysql client locally)
# Or use the docker container:
cat backend/database/schema/*.sql | docker exec -i hrms_db mysql -u root -proot hrms_saas
```

Alternatively, you can write a short initialization script in Node.js or a bash script.

## Seed Data

`12_seed_data.sql` inserts:
- Base subscription plans
- Base platform and tenant permissions
- System Roles (`SUPER_ADMIN`, `ORG_ADMIN`, `HR_ADMIN`, `EMPLOYEE`, etc.)
- A default Super Admin user (`superadmin@hrms.com`)
