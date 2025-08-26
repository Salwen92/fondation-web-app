# 📋 Plan de Migration Monorepo et Architecture Worker Permanent

## 🎯 Objectif

Migrer vers une architecture simplifiée avec :
- **Monorepo Bun Workspaces** pour gérer fondation-web-app + fondation-cli
- **Worker permanent** qui remplace l'architecture Scaleway complexe  
- **Architecture unifiée** dev/prod sans cold start

---

## 📁 Structure Monorepo Finale

```
fondation/                          # Nouveau repo racine
├── apps/
│   ├── web/                        # fondation-web-app (déplacé)
│   │   ├── src/
│   │   ├── convex/
│   │   ├── package.json
│   │   └── next.config.js
│   ├── cli/                        # fondation (déplacé)
│   │   ├── src/
│   │   ├── prompts/
│   │   ├── package.json
│   │   └── dist/
│   │       └── cli.bundled.cjs
│   └── worker/                     # Nouveau - Worker permanent
│       ├── src/
│       │   ├── index.ts            # Worker principal avec polling
│       │   ├── job-processor.ts    # Traitement des jobs
│       │   └── cli-executor.ts     # Exécuteur CLI
│       ├── package.json
│       └── Dockerfile
├── packages/
│   └── shared/                     # Types TypeScript partagés
│       ├── src/
│       │   ├── types.ts
│       │   └── schemas.ts
│       └── package.json
├── docker/
│   └── docker-compose.yml          # Environnement dev complet
├── package.json                    # Bun workspaces config
├── bun.lockb
└── README.md
```

---

## 🏗️ Nouvelle Architecture

### **Architecture Actuelle (Complexe)**
```
UI → API Proxy → Gateway → Scaleway API → Container → Worker
```

### **Nouvelle Architecture (Simple)**
```
UI → Convex (queue) ← Worker (polling permanent) → CLI
```

### **Flow Simplifié**
1. **UI déclenche** → Crée un job `status: "pending"` dans Convex
2. **Worker poll** → Trouve le job pending toutes les 5 secondes
3. **Worker traite** → Met `status: "running"`, exécute CLI, met `status: "completed"`
4. **UI affiche** → Résultats en temps réel

---

## 🔧 Configuration Bun Workspaces

### **package.json racine**
```json
{
  "name": "fondation",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "dev:web": "bun run --filter web dev",
    "dev:worker": "bun run --filter worker dev",
    "dev:cli": "bun run --filter cli dev"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### **Commandes de développement**
```bash
# Lance tout en parallèle
bun dev

# Lance seulement l'app web
bun dev:web

# Lance seulement le worker
bun dev:worker

# Build tous les projets
bun run build
```

---

## 💻 Worker Permanent

### **Fonctionnalités du Worker**
- **Polling Convex** toutes les 5 secondes
- **Traitement séquentiel** des jobs (ou parallèle avec limites)
- **Exécution CLI** intégrée via workspaces
- **Gestion d'erreurs** robuste
- **Health checks** et monitoring

### **Code Worker Principal**
```typescript
// apps/worker/src/index.ts
import { ConvexClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

class PermanentWorker {
  private client: ConvexClient;
  private isRunning = true;

  constructor() {
    this.client = new ConvexClient(process.env.CONVEX_URL!);
  }

  async start() {
    console.log('🚀 Worker permanent démarré');
    
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
        await this.sleep(5000); // Poll toutes les 5 secondes
      } catch (error) {
        console.error('❌ Erreur worker:', error);
        await this.sleep(10000); // Backoff en cas d'erreur
      }
    }
  }

  async pollAndProcess() {
    const pendingJob = await this.client.query(api.jobs.getNextPending);
    
    if (pendingJob) {
      console.log(`📝 Job trouvé: ${pendingJob._id}`);
      await this.processJob(pendingJob);
    }
  }

  async processJob(job: any) {
    // Marquer comme running
    await this.client.mutation(api.jobs.updateStatus, {
      jobId: job._id,
      status: 'running'
    });

    try {
      // Exécuter le CLI
      const result = await this.executeCLI(job.repositoryUrl);
      
      // Marquer comme completed
      await this.client.mutation(api.jobs.updateStatus, {
        jobId: job._id,
        status: 'completed',
        result
      });
    } catch (error) {
      // Marquer comme failed
      await this.client.mutation(api.jobs.updateStatus, {
        jobId: job._id,
        status: 'failed',
        error: error.message
      });
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const worker = new PermanentWorker();
worker.start();
```

---

## 🐳 Environnements Dev/Prod

### **Développement (docker-compose.yml)**
```yaml
version: '3.8'
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    
  worker:
    build:
      context: ./apps/worker
      dockerfile: Dockerfile
    volumes:
      - ./apps/cli:/cli        # Mount CLI pour dev
      - ./apps/worker:/worker
    environment:
      - NODE_ENV=development
      - CONVEX_URL=${CONVEX_URL}
      - CLI_PATH=/cli/dist/cli.bundled.cjs
    depends_on:
      - web

  # Optionnel: CLI build watcher
  cli-watcher:
    build:
      context: ./apps/cli
    volumes:
      - ./apps/cli:/app
    command: bun run dev    # Watch et rebuild le CLI
```

### **Production**
```yaml
# Production sur VPS simple (Hetzner/DigitalOcean)
version: '3.8'
services:
  worker:
    image: fondation/worker:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - CONVEX_URL=${CONVEX_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

---

## 🚀 Plan de Migration

### **Phase 1: Setup Monorepo (1-2h)**
```bash
# 1. Créer nouveau dossier
mkdir fondation-monorepo
cd fondation-monorepo

# 2. Initialiser Bun workspaces
bun init
# Configurer package.json avec workspaces

# 3. Déplacer projets existants
mv ../fondation-web-app apps/web
mv ../fondation apps/cli

# 4. Ajuster package.json dans chaque app
# 5. Tester que `bun dev` marche
```

### **Phase 2: Créer Worker Permanent (2-3h)**
```bash
# 1. Créer apps/worker/
mkdir -p apps/worker/src

# 2. Implémenter worker avec polling Convex
# 3. Ajouter exécution CLI via workspaces
# 4. Tests en local
```

### **Phase 3: Simplifier Convex (1h)**
```bash
# 1. Supprimer convex/scalewayWorker.ts
# 2. Supprimer convex/cloudRun.ts  
# 3. Simplifier repositories.triggerAnalyze
# 4. Ajouter jobs.getNextPending
```

### **Phase 4: Nettoyer Code Legacy (1h)**
```bash
# 1. Supprimer /scaleway-gateway
# 2. Supprimer /scaleway-worker
# 3. Supprimer /api/analyze-proxy
# 4. Nettoyer variables d'environnement Scaleway
```

### **Phase 5: Docker & Déploiement (2h)**
```bash
# 1. Créer Dockerfile pour worker
# 2. Docker-compose pour dev
# 3. Setup production sur VPS
# 4. Tests E2E complets
```

---

## ✅ Avantages de la Nouvelle Architecture

### **Simplicité**
- ❌ ~~Gateway + Scaleway API + Jobs orchestration~~
- ✅ **Worker direct qui poll Convex**
- ❌ ~~3 niveaux d'indirection~~  
- ✅ **Architecture directe**

### **Performance**
- ❌ ~~Cold start 10-30 secondes~~
- ✅ **Réponse instantanée (worker toujours actif)**
- ❌ ~~Création/destruction containers~~
- ✅ **Réutilisation du même worker**

### **Coût**
- ❌ ~~Scaleway Jobs (facturé par exécution)~~
- ✅ **VPS simple $4-10/mois**
- ❌ ~~Gateway + Worker séparés~~
- ✅ **Un seul service à maintenir**

### **Développement**
- ❌ ~~Architecture différente dev/prod~~
- ✅ **Même code dev et prod**
- ❌ ~~Configuration complexe~~
- ✅ **`bun dev` et c'est parti**

---

## 🔄 Migration des Données

### **Jobs Existants**
- Les jobs Convex existants restent compatibles
- Pas de migration de schéma requise
- Worker traite automatiquement les anciens jobs "pending"

### **Variables d'Environnement**
```bash
# À supprimer
SCALEWAY_GATEWAY_URL
SCW_ACCESS_KEY
SCW_SECRET_KEY
SCW_DEFAULT_PROJECT_ID
SCW_JOB_DEFINITION_ID

# À ajouter au worker
CONVEX_URL=https://your-deployment.convex.cloud
ANTHROPIC_API_KEY=...
CLI_PATH=/app/cli/dist/cli.bundled.cjs
```

---

## 📊 Timeline Estimé

| Phase | Durée | Description |
|-------|-------|-------------|
| **Phase 1** | 1-2h | Setup monorepo, migration projets |
| **Phase 2** | 2-3h | Développement worker permanent |
| **Phase 3** | 1h | Simplification code Convex |
| **Phase 4** | 1h | Nettoyage code legacy |
| **Phase 5** | 2h | Docker, déploiement, tests |
| **Total** | **7-9h** | Migration complète |

---

## 🎯 Résultat Final

Une architecture **10x plus simple** :
- **1 commande** pour dev : `bun dev`
- **1 VPS** pour prod au lieu de Scaleway Jobs
- **0 cold start** - worker toujours actif  
- **Même code** dev/prod
- **Maintenance réduite** - plus de Gateway à maintenir

Cette migration élimine toute la complexité Scaleway tout en gardant la même fonctionnalité de génération de cours.