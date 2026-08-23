# PoiseAtHome

PoiseAtHome is the home-service booking and salon operations platform for Poise Hair Center Salon. It provides public service discovery, customer booking and payment submission, staff scheduling and appointment workflows, inventory and product usage, notifications, and role-based reports.

> **Development only:** The credentials below are local demonstration defaults. Change every password and secret before exposing the system publicly, and never commit a populated `.env` file.

## Local URLs and Credentials

### PoiseAtHome application

- **Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Health check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Administrator | PoiseAtHome Administrator | `admin@gmail.com` | `admin1234` |
| Staff | Maria Santos | `maria.santos@poiseathome.local` | `Staff123!` |
| Staff | Angela Reyes | `angela.reyes@poiseathome.local` | `Staff123!` |
| Customer | Sofia Cruz | `sofia.cruz@poiseathome.local` | `Customer123!` |
| Customer | Bianca Mendoza | `bianca.mendoza@poiseathome.local` | `Customer123!` |

The administrator values come from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the root `.env`. Staff and customer passwords come from `DEMO_STAFF_PASSWORD` and `DEMO_CUSTOMER_PASSWORD`. All demo accounts are active and email-verified.

The seeders are idempotent: rerunning them does not duplicate users or replace passwords on existing accounts.

### Seeded demonstration data

The automatic seed creates:

- one administrator, two staff accounts, and two customer accounts;
- staff profiles marked available and qualified for the seeded services;
- five service categories and four home salon services;
- four service photos and two staff photos uploaded automatically to MinIO;
- five product categories and four inventory products;
- initial inventory quantities and stock-movement records;
- a saved home-service address for each seeded customer.

The downloaded seed-image sources and photographer credits are recorded in [`poiseathomebackend/database/seeders/assets/ATTRIBUTION.md`](poiseathomebackend/database/seeders/assets/ATTRIBUTION.md).

### MinIO object storage

- **Console:** [http://localhost:9001](http://localhost:9001)
- **S3 API:** [http://localhost:9000](http://localhost:9000)
- **Username:** `minioadmin`
- **Password:** `minioadmin`
- **Image bucket:** `poiseathome-images`

The bucket is created automatically and allows public reads for service and staff-profile images. Private customer payment proofs remain in Laravel private storage.

To inspect images:

1. Open [http://localhost:9001](http://localhost:9001).
2. Sign in with the MinIO credentials above.
3. Open **Object Browser**.
4. Select `poiseathome-images`.

### MySQL database

| Setting | Value |
| --- | --- |
| Host from your computer | `localhost` |
| Host inside Docker Compose | `mysql` |
| Port | `3306` |
| Database | `poiseathome_db` |
| Username | `poiseathome_user` |
| Password | `change_this_db_password` |
| Root password | `change_this_root_password` |

Open a MySQL shell through the container:

```bash
docker compose exec mysql mysql -u poiseathome_user -p poiseathome_db
```

Enter `change_this_db_password` when prompted.

## Docker Setup

### 1. Create the environment file

From the repository root:

```bash
cp .env.example .env
```

The root environment file owns Docker, application, MinIO, email, payment, and seed-account settings. The backend `.env` remains Laravel’s default environment template and retains the generated `APP_KEY`.

For real verification and password-reset email delivery, configure `RESEND_API_KEY` and an approved sender address. Without a usable Resend key, local codes are written to the backend log.

### 2. Build and start PoiseAtHome

```bash
docker compose up -d --build
```

Docker Compose starts React, Laravel, MySQL, and MinIO. The backend automatically runs outstanding migrations and the idempotent database seeders before starting the API.

Confirm service status:

```bash
docker compose ps
```

Follow backend startup, migration, and seeding logs:

```bash
docker compose logs -f backend
```

### 3. Reseed manually

Automatic startup seeding normally makes this unnecessary. To rerun every idempotent seeder:

```bash
docker compose exec backend php artisan db:seed --force
```

### 4. Open the application

Open [http://localhost:3000](http://localhost:3000), then sign in with any account listed above.

Role-specific areas include:

- **Administrator:** staff, services, appointment oversight, payment review, inventory, and reports.
- **Staff:** schedule, appointments, assigned services, availability, inventory usage, and reports.
- **Customer:** service booking, saved address, appointment tracking, payments, and notifications.

## Common Docker Commands

```bash
# Show container status
docker compose ps

# Follow all logs
docker compose logs -f

# Restart services
docker compose restart

# Rebuild after source or dependency changes
docker compose up -d --build

# Stop containers while preserving stored data
docker compose down
```

To permanently remove the MySQL and MinIO volumes:

```bash
docker compose down --volumes
```

> This permanently removes local database records and MinIO objects. Seed data is recreated on the next startup, but user-created data cannot be recovered.

## Automated Checks

```bash
docker compose exec backend php artisan test
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

## Kubernetes Staging Deployment

Pushes to `main` build both images in GHCR and deploy them to the shared cluster.
The application uses the global MySQL and MinIO services; its manifests are in
`k8s/poiseathome`.

Staging backend, database, MinIO, and GHCR credentials are declared in
`k8s/poiseathome/secret.yaml`, following the same manifest layout as the other
client projects.

Staging endpoints are:

- Application: `https://poiseathome.site` (also available at `https://www.poiseathome.site`)
- API: `https://api.poiseathome.site/api/v1`
- Public images: `https://cdn.poiseathome.site/poiseathome-images`

Deploy `global-infra` once before the first application deployment. Its
idempotent provisioning jobs create the `poiseathome_db` database/user and
`poiseathome-images` bucket even when the shared persistent volumes already
exist.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Laravel REST API, Sanctum SPA authentication
- **Database:** MySQL 8
- **Object storage:** MinIO through Laravel’s S3-compatible filesystem
- **Email:** Resend
- **Local orchestration:** Docker Compose

```text
poiseathome/
├── poiseathomebackend/  # Laravel application, migrations, and seeders
├── poiseathomefrontend/ # React application and public/customer/staff/admin UI
├── docs/                # System documentation and diagrams
├── docker-compose.yml   # Local application services
└── .env.example         # Root development configuration template
```

## Documentation

- [Documentation index](docs/README.md)
- [System documentation](docs/system_documentation.pdf)
- [Prototype explanation](docs/poiseathome_prototype_explanation.docx)
- [Architecture and workflow diagrams](docs/diagrams)
