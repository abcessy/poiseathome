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

### phpMyAdmin database dashboard

- **Dashboard:** [http://localhost:8080](http://localhost:8080)
- **Server:** `mysql` (already selected by Docker Compose)
- **Username:** `poiseathome_user`
- **Password:** `change_this_db_password`

phpMyAdmin starts automatically with Docker Compose and connects to MySQL over the private Compose network. Its browser port is controlled by `PHPMYADMIN_PORT` in the root `.env`. Use the MySQL credentials from that same file if you change the defaults.

The dashboard is intended for local administration. Do not expose port `8080` directly to the public internet. Database changes made in phpMyAdmin affect the application immediately and can bypass Laravel validation, so create a backup before manually editing or deleting production data.

## Docker Setup

### 1. Install Docker CLI and Docker Compose

This setup uses only the command line—Docker Desktop is not required.

#### Windows 10 or Windows 11

PoiseAtHome uses Linux containers, so Windows runs Docker Engine through WSL 2. **This does not replace Windows and does not create a dual-boot system.** Ubuntu opens as a terminal application inside Windows, while PoiseAtHome remains accessible from the normal Windows browser.

The WSL and Docker installation is required only once. It normally takes approximately 10–25 minutes, depending on the computer and internet connection.

##### A. Install WSL 2 once

Open **PowerShell as Administrator** and install WSL 2 with Ubuntu:

```powershell
wsl --install -d Ubuntu
wsl --update
```

If installation remains at `0.0%`, retry with:

```powershell
wsl --install --web-download -d Ubuntu
```

Restart Windows when requested. Windows will continue to be the main operating system.

##### B. Open the Ubuntu terminal

After restarting, open **Ubuntu** from the Windows Start menu, or run this command in PowerShell:

```powershell
wsl -d Ubuntu
```

On its first launch, Ubuntu asks you to create a Linux username and password. These credentials are only for the Ubuntu terminal and are separate from the PoiseAtHome accounts.

When the prompt looks similar to `username@computer:~$`, you are inside Ubuntu. Run the Docker installation commands in the next section from this Ubuntu terminal—not from PowerShell.

Microsoft documents the requirements and commands in its [official WSL installation guide](https://learn.microsoft.com/windows/wsl/install).

#### Ubuntu or Ubuntu on WSL 2

Install Git, Docker Engine, Docker CLI, Buildx, and the Docker Compose CLI plugin from Docker's official repository:

```bash
sudo apt-get update
sudo apt-get install ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

These commands follow the current [official Docker Engine installation guide](https://docs.docker.com/engine/install/ubuntu/).

Start Docker Engine and configure it to start automatically when the computer boots:

```bash
sudo systemctl enable --now docker
```

Verify that Docker Engine, the CLI, and the Compose plugin are working:

```bash
docker --version
docker compose version
docker info
```

If `docker info` reports a permission error on Linux, either run Docker commands with `sudo` or complete Docker's [Linux post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/).

On Windows, run all remaining `git` and `docker compose` commands inside the Ubuntu WSL terminal. The application URLs remain accessible from the Windows browser through `localhost`.

The default setup uses host ports `3000`, `3306`, `8000`, `8080`, `9000`, and `9001`; stop any application already using those ports. The frontend, backend, phpMyAdmin, and MinIO ports can alternatively be changed in the root `.env`; changing the MySQL host port requires editing the `mysql` port mapping in `docker-compose.yml`.

No local PHP, Composer, Node.js, npm, MySQL, or MinIO installation is required.

### 2. Clone and enter the project

On Windows, run these commands inside the Ubuntu terminal. The recommended location is the WSL home folder because Docker builds are faster and Linux file permissions work reliably there:

```bash
mkdir -p ~/projects
cd ~/projects
git clone <repository-url>
cd poiseathome
```

The repository still lives on the same Windows laptop. To open it in Windows File Explorer, enter this path in the address bar and replace `<username>` with the Ubuntu username created earlier:

```text
\\wsl$\Ubuntu\home\<username>\projects\poiseathome
```

The repository may also be stored in a normal Windows folder such as `C:\Users\Client\Documents\poiseathome`. From Ubuntu, that folder is available as `/mnt/c/Users/Client/Documents/poiseathome`, although Docker operations can be slower there.

If the project is already downloaded, enter its directory before running Docker commands. All remaining commands must be run from the repository root, which contains `docker-compose.yml`.

### 3. Create the environment files

Do not skip this step. Docker may build successfully without these files, but Laravel will return HTTP `500` when its application key is missing. From the repository root, run:

```bash
cp .env.example .env
cp poiseathomebackend/.env.example poiseathomebackend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
Copy-Item poiseathomebackend/.env.example poiseathomebackend/.env
```

The root `.env` owns Docker, application, MinIO, email, payment, and seed-account settings. The separate `poiseathomebackend/.env` file is required by Laravel and will hold its generated `APP_KEY`. Both files are ignored by Git. Each computer must generate its own application key; do not copy the key from another installation.

Development defaults work without editing either file. Before using the system with real client data, change at least the MySQL, MinIO, administrator, staff, and customer passwords in the root `.env`. Keep `localhost` URLs when the browser and Docker are running on the same laptop.

For real verification and password-reset email delivery, configure `RESEND_API_KEY` and an approved sender address. Without a usable Resend key, local codes are written to the backend log.

### 4. Build the backend and generate Laravel's application key

Run this once for each fresh installation:

```bash
docker compose build backend
docker compose run --rm backend php artisan key:generate --force
grep '^APP_KEY=' poiseathomebackend/.env
```

The key check must display a non-empty value beginning with `APP_KEY=base64:`. The generation command may also start MySQL and MinIO. Do not share or commit the generated backend `.env`.

If Laravel reports success but the key remains empty, generate a key for manual insertion:

```bash
docker compose run --rm backend php artisan key:generate --show
```

Copy the generated `base64:...` value into `poiseathomebackend/.env` after `APP_KEY=`. Keep this key private and retain it for the lifetime of this installation.

### 5. Build and start PoiseAtHome

```bash
docker compose up -d --build
docker compose exec frontend npm run build
docker compose restart frontend backend
```

The first build downloads images and dependencies and can take several minutes. The second command creates the frontend production files in the source directory mounted by Docker Compose; it is required on a fresh clone. The restart makes both services reload the generated files and configuration. Docker Compose starts React, Laravel, MySQL, and MinIO. The one-time `minio-init` container should exit with code `0`; this is expected. The backend automatically runs outstanding migrations and the idempotent database seeders before starting the API.

Confirm service status:

```bash
docker compose ps
```

The `frontend`, `backend`, `mysql`, `phpmyadmin`, and `minio` services should be running. A MySQL status of `healthy` means the MySQL server is responding, but the API health check below confirms that Laravel can actually connect to it:

```bash
curl --fail http://localhost:8000/api/v1/health
```

The response should contain `"status":"ok"` and `"connected":true`. If `curl` is unavailable, open [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) in a browser.

If the API returns HTTP `500`, first confirm that `APP_KEY` is not empty in `poiseathomebackend/.env`, then run:

```bash
docker compose exec backend php artisan optimize:clear
docker compose restart backend
docker compose logs --tail=100 backend
```

Follow backend startup, migration, and seeding logs:

```bash
docker compose logs -f backend
```

Press `Ctrl+C` to stop following logs; the containers continue running.

### 6. Open and smoke-test the application

Open [http://localhost:3000](http://localhost:3000), confirm that service cards and images load, and sign in with the administrator account listed above. This checks the frontend, API, database, authentication, and MinIO path together. Open [http://localhost:8080](http://localhost:8080) and sign in with the MySQL credentials above to verify the optional database dashboard.

### 7. Start PoiseAtHome again later on Windows

The WSL and Docker installation steps are not repeated. Start Windows normally, open the Ubuntu terminal, and run:

```bash
cd ~/projects/poiseathome
docker compose up -d
```

Then open [http://localhost:3000](http://localhost:3000) in the normal Windows browser.

### 8. Reseed manually

Automatic startup seeding normally makes this unnecessary. To rerun every idempotent seeder:

```bash
docker compose exec backend php artisan db:seed --force
```

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
docker compose exec frontend npm run build

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
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

The normal backend image installs production dependencies only. To install the development dependencies in a temporary container and run the backend test suite:

```bash
docker compose run --rm backend sh -c "composer install --no-interaction && php artisan test"
```

## Troubleshooting First Setup

- **A port is already allocated:** stop the conflicting program, or change `FRONTEND_PORT`, `BACKEND_PORT`, `PHPMYADMIN_PORT`, `MINIO_API_PORT`, or `MINIO_CONSOLE_PORT` in `.env`. If changing browser-facing application ports, also update the related URL, CORS, Sanctum, and media values in that file. Change the MySQL host mapping directly in `docker-compose.yml` only if host access to MySQL is required.
- **Laravel reports that no application encryption key is specified:** repeat step 4 and then run `docker compose restart backend`.
- **The frontend opens before the API is ready:** wait for migrations and seeding to finish, check `docker compose logs backend`, and refresh after the health endpoint reports a connected database.
- **Images do not load:** confirm `minio` is running and `minio-init` exited with code `0` using `docker compose ps -a`.
- **A container repeatedly restarts:** inspect `docker compose logs backend`, `docker compose logs frontend`, or `docker compose logs mysql`. After correcting `.env`, recreate services with `docker compose up -d --build --force-recreate`.
- **Docker reports `permission denied` while reading `poiseathomebackend/storage`:** on Linux, restore ownership with `sudo chown -R "$(id -u):$(id -g)" poiseathomebackend/storage poiseathomebackend/bootstrap/cache`, then rebuild. Do not run Composer or Artisan with `sudo` inside the repository.
- **Windows bind-mount or permission errors:** keep the repository in a drive shared with Docker Desktop and ensure Docker Desktop is using Linux containers.

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
