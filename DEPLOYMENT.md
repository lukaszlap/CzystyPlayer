# Instrukcja Deploymentu CzystyPlayer na Ubuntu 22

Przewodnik pełny dotyczący uruchomienia aplikacji Next.js 16 na serwerze VPS z Ubuntu 22, zarówno bez Dockera jak i z Dockerem.

**Założenia:**
- Database MariaDB jest już uruchomiona na innym kontenerze LXC
- Aplikacja będzie dostępna na porcie lokalnym 3000
- Wystawianie do świata za zero trust będzie zrobione osobno

---

## WARIANT 1: INSTALACJA BEZ DOCKERA

### Krok 1: Aktualizacja systemu

```bash
sudo apt update
sudo apt upgrade -y
```

### Krok 2: Instalacja Node.js (v20+) i npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Weryfikacja instalacji:
```bash
node --version  # Powinno być v20+
npm --version   # Powinno być 10+
```

### Krok 3: Instalacja Git (opcjonalnie, jeśli klonujesz z repo)

```bash
sudo apt install -y git
```

### Krok 4: Pobranie aplikacji

**Opcja A: Z repozytorium Git**
```bash
cd /home/ubuntu
git clone <TWOJE_REPO>
cd myapp
npm install
```

**Opcja B: Upload ręczny (przez SFTP/SCP)**
```bash
# Na Twoim komputerze:
scp -r C:\Users\exten\Desktop\nexterPlayer\myapp ubuntu@your-vps:/home/ubuntu/

# Na serwerze:
cd /home/ubuntu/myapp
npm install
```

### Krok 5: Konfiguracja zmiennych środowiskowych

Utwórz plik `.env.local`:

```bash
nano /home/ubuntu/myapp/.env.local
```

Wklej zawartość (dostosuj do Twojej konfiguracji):

```env
# User Database (czystyplayer)
DB_HOST=192.168.1.55
DB_PORT=3306
DB_USER=remote
DB_PASSWORD=twoje_haslo_db
DB_NAME=czystyplayer

# Content Database (czystyplayerbaza)
CONTENT_DB_HOST=192.168.1.55
CONTENT_DB_PORT=3306
CONTENT_DB_USER=remote
CONTENT_DB_PASSWORD=twoje_haslo_db
CONTENT_DB_NAME=czystyplayerbaza

# Inne ustawienia
NODE_ENV=production
```

Zapisz (Ctrl+O, Enter, Ctrl+X).

### Krok 6: Build aplikacji

```bash
cd /home/ubuntu/myapp
npm run build
```

### Krok 7a: Testowe uruchomienie (sprawdzenie)

```bash
npm start
```

Powinieneś zobaczyć:
```
- ready started server on 0.0.0.0:3000
```

Przetestuj:
```bash
curl http://localhost:3000
```

Zatrzymaj (Ctrl+C).

### Krok 7b: Uruchomienie z PM2 (rekomendowane do produkcji)

Zainstaluj PM2 globalnie:
```bash
sudo npm install -g pm2
```

Utwórz plik konfiguracyjny `ecosystem.config.js`:

```bash
nano /home/ubuntu/myapp/ecosystem.config.js
```

Zawartość:
```javascript
module.exports = {
  apps: [
    {
      name: "czystyplayer",
      script: "npm",
      args: "start",
      cwd: "/home/ubuntu/myapp",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "/home/ubuntu/myapp/logs/error.log",
      out_file: "/home/ubuntu/myapp/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
```

Uruchom aplikację:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Sprawdź status:
```bash
pm2 status
pm2 logs czystyplayer
```

### Krok 8: Konfiguracja Nginx jako Reverse Proxy (opcjonalnie)

Zainstaluj Nginx:
```bash
sudo apt install -y nginx
```

Utwórz konfigurację:
```bash
sudo nano /etc/nginx/sites-available/czystyplayer
```

Zawartość:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Włącz konfigurację:
```bash
sudo ln -s /etc/nginx/sites-available/czystyplayer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## WARIANT 2: INSTALACJA Z DOCKEREM

### Krok 1: Instalacja Docker i Docker Compose na Ubuntu 22

#### 1.1 Aktualizacja systemu
```bash
sudo apt update
sudo apt upgrade -y
```

#### 1.2 Instalacja wymaganych pakietów
```bash
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

#### 1.3 Dodanie klucza GPG Docker
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

#### 1.4 Dodanie repozytorium Docker
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### 1.5 Instalacja Docker Engine
```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

#### 1.6 Weryfikacja instalacji
```bash
docker --version
docker compose version
```

#### 1.7 Dodanie użytkownika do grupy docker (opcjonalnie, aby nie pisać sudo)
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Krok 2: Przygotowanie plików Docker

#### 2.1 Utwórz `Dockerfile` w głównym katalogu projektu

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init (do bezpiecznego uruchamiania Node.js w kontenerze)
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY public ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

#### 2.2 Utwórz `.dockerignore`

```
node_modules
npm-debug.log
.env.local
.env*.local
.git
.gitignore
.next
out
.DS_Store
database/
.github/
```

#### 2.3 Utwórz `docker-compose.yml`

```yaml
version: '3.8'

services:
  czystyplayer:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: czystyplayer-app
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      
      # User Database (czystyplayer)
      DB_HOST: 192.168.1.55
      DB_PORT: 3306
      DB_USER: remote
      DB_PASSWORD: twoje_haslo_db
      DB_NAME: czystyplayer
      
      # Content Database (czystyplayerbaza)
      CONTENT_DB_HOST: 192.168.1.55
      CONTENT_DB_PORT: 3306
      CONTENT_DB_USER: remote
      CONTENT_DB_PASSWORD: twoje_haslo_db
      CONTENT_DB_NAME: czystyplayerbaza
    
    restart: unless-stopped
    
    # Limity zasobów (opcjonalnie)
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    
    # Volume do logów (opcjonalnie)
    volumes:
      - ./logs:/app/logs
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### Krok 3: Budowanie i uruchamianie kontenera

#### 3.1 Budowanie obrazu Docker

```bash
cd /home/ubuntu/myapp
docker compose build
```

#### 3.2 Uruchomienie kontenera

```bash
docker compose up -d
```

#### 3.3 Sprawdzenie statusu

```bash
docker compose ps
docker compose logs -f czystyplayer
```

#### 3.4 Testowanie aplikacji

```bash
curl http://localhost:3000
```

### Krok 4: Zarządzanie kontenerem

#### Zatrzymanie:
```bash
docker compose down
```

#### Restart:
```bash
docker compose restart
```

#### Usunięcie wszystkiego:
```bash
docker compose down -v
```

#### Sprawdzenie logów:
```bash
docker compose logs --tail=100 -f
```

### Krok 5: Aktualizacja aplikacji (gdy jest nowa wersja)

```bash
cd /home/ubuntu/myapp

# Pull nowego kodu
git pull origin main

# Rebuild i restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## WARIANT 2b: DOCKER Z NGINX (opcjonalnie)

Jeśli chcesz reverse proxy w Dockerze, utwórz `docker-compose.yml`:

```yaml
version: '3.8'

services:
  czystyplayer:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: czystyplayer-app
    expose:
      - "3000"
    environment:
      NODE_ENV: production
      
      DB_HOST: 192.168.1.55
      DB_PORT: 3306
      DB_USER: remote
      DB_PASSWORD: twoje_haslo_db
      DB_NAME: czystyplayer
      
      CONTENT_DB_HOST: 192.168.1.55
      CONTENT_DB_PORT: 3306
      CONTENT_DB_USER: remote
      CONTENT_DB_PASSWORD: twoje_haslo_db
      CONTENT_DB_NAME: czystyplayerbaza
    
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: czystyplayer-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - czystyplayer
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

Utwórz `nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    upstream czystyplayer {
        server czystyplayer:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://czystyplayer;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_buffering off;
        }
    }
}
```

Uruchomienie:
```bash
docker compose up -d
```

---

## ZMIENNE ŚRODOWISKOWE - PEŁNA REFERENCA

### User Database (czystyplayer)
| Zmienna | Domyślna | Opis |
|---------|----------|------|
| `DB_HOST` | `192.168.1.55` | Host bazy danych user |
| `DB_PORT` | `3306` | Port bazy danych user |
| `DB_USER` | `remote` | Użytkownik bazy danych user |
| `DB_PASSWORD` | - | Hasło bazy danych user |
| `DB_NAME` | `czystyplayer` | Nazwa bazy danych user |

### Content Database (czystyplayerbaza)
| Zmienna | Domyślna | Opis |
|---------|----------|------|
| `CONTENT_DB_HOST` | `192.168.1.55` | Host bazy danych treści |
| `CONTENT_DB_PORT` | `3306` | Port bazy danych treści |
| `CONTENT_DB_USER` | `remote` | Użytkownik bazy danych treści |
| `CONTENT_DB_PASSWORD` | - | Hasło bazy danych treści |
| `CONTENT_DB_NAME` | `czystyplayerbaza` | Nazwa bazy danych treści |

### Application
| Zmienna | Domyślna | Opis |
|---------|----------|------|
| `NODE_ENV` | `production` | Środowisko (production/development) |
| `PORT` | `3000` | Port nasłuchiwania |

---

## TROUBLESHOOTING

### Problem: "Cannot connect to database"

**Rozwiązanie:**
```bash
# Sprawdź czy baza danych jest dostępna
telnet 192.168.1.55 3306

# Weryfikuj zmienne środowiskowe
echo $DB_HOST
echo $DB_USER

# Sprawdź logi aplikacji
npm run dev  # lokalnie, aby zobaczyć błędy
```

### Problem: "Port 3000 jest zajęty"

```bash
# Znajdź proces na porcie 3000
sudo lsof -i :3000

# Zabij proces (jeśli to stary proces)
sudo kill -9 <PID>

# Lub użyj innego portu w .env.local
PORT=3001
```

### Problem: "Out of memory" w Docker

```bash
# Zwiększ limit pamięci w docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 4G
```

### Problem: Zmiany kodu nie są widoczne po restart

```bash
# Musisz przebudować obraz
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## MONITOROWANIE I LOGOWANIE

### PM2 (bez Dockera)
```bash
# Sprawdzić logi
pm2 logs czystyplayer

# Monitorowanie
pm2 monit

# Lista procesów
pm2 list
```

### Docker
```bash
# Logami
docker compose logs -f czystyplayer

# Statystyki
docker compose stats

# Wejść do kontenera
docker compose exec czystyplayer sh
```

---

## AKTUALIZACJA APLIKACJI

### Bez Dockera
```bash
cd /home/ubuntu/myapp
git pull origin main
npm install
npm run build
pm2 restart czystyplayer
```

### Z Dockerem
```bash
cd /home/ubuntu/myapp
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## REKOMENDACJE PRODUKCYJNE

1. **Zawsze używaj PM2 lub Docker** do automatycznego restartowania aplikacji
2. **Konfiguruj logowanie** w plikach zamiast na konsoli
3. **Monitoruj zużycie zasobów** (CPU, pamięć)
4. **Utwórz backup baz danych** regularnie
5. **Używaj zero trust tunnelu** (Cloudflare Tunnel, ngrok itp.) do wystawiania do świata
6. **Ustaw firewall** aby aplikacja była dostępna tylko lokalnie
7. **Regularnie aktualizuj** Node.js i zależności

---

## PODSUMOWANIE

| Aspekt | Bez Dockera | Z Dockerem |
|--------|------------|-----------|
| Instalacja | ~10 min | ~15 min |
| Przestrzeń dysku | ~500MB | ~1.5GB |
| Automatyczny restart | PM2 | Docker compose |
| Aktualizacja | git pull + build | git pull + rebuild |
| Przenośność | Zależna od systemu | Niezależna |
| Zasobożerność | Niższa | Wyższa |
| Łatwość | Prostsza | Bardziej zaawansowana |

**Rekomendacja:** Dla samodzielnego hostingu na VPS, **wariant bez Dockera z PM2** jest prostszy i mniej zasobożerny. **Wariant z Dockerem** jest lepszy, jeśli planujesz bardziej zaawansowaną infrastrukturę (k8s, orchestration, itp.).

