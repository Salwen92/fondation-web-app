# ANNEXE 1 - SPÉCIFICATIONS TECHNIQUES
## Plateforme "Fondation" - Génération Automatique de Documentation

### 1. PÉRIMÈTRE DES PRESTATIONS À RÉALISER

**1.1 Intégration Fondation CLI**
- Intégration du CLI Fondation (bundled Node.js) pour analyse de code source
- Pipeline de génération de cours structurés via prompts IA spécialisés
- Génération multi-formats: chapitres, tutoriels, références, table des matières

**1.2 Architecture Cloud Native**
- Déploiement containerisé Docker sur Google Cloud Run
- Service asynchrone avec auto-scaling et isolation des processus
- Système de webhooks pour communication bidirectionnelle
- Gestion des timeouts et retry automatique

**1.3 Backend Temps Réel Convex**
- Base de données réactive avec synchronisation instantanée
- Mutations typées et queries optimisées avec indexes
- Persistance des jobs avec états: pending → cloning → analyzing → gathering → completed
- Stockage structuré des documents générés avec versioning

**1.4 Interface Web Next.js**
- Application React avec Server Components et App Router
- Dashboard analytique avec métriques en temps réel
- Visualiseur de documentation avec rendu Markdown avancé
- Authentification GitHub OAuth avec gestion des tokens

### 2. ARCHITECTURE TECHNIQUE

**2.1 Stack Technologique**
```
Frontend:  Next.js 15 + React 19 + TypeScript + Tailwind CSS
Backend:   Convex BaaS + Next.js API Routes
Processing: Google Cloud Run + Docker + Node.js Express
CLI:       Fondation CLI (analyse IA de repositories)
Auth:      NextAuth.js v5 + GitHub OAuth
```

**2.2 Flux de Traitement**
1. Utilisateur sélectionne repository GitHub → création job Convex
2. Trigger Cloud Run avec URL repo + token callback
3. Container clone le repo → exécute Fondation CLI
4. CLI analyse le code → génère documentation via prompts IA
5. Callback webhook → stockage docs dans Convex
6. UI synchronisée en temps réel → affichage documentation

**2.3 Containerisation Docker**
- Image Node.js 20 Alpine optimisée (~200MB)
- CLI Fondation embarqué avec prompts versionnés
- Isolation complète des exécutions parallèles
- Logs structurés pour monitoring et debug

### 3. FONCTIONNALITÉS MÉTIER

**3.1 Génération de Cours**
- Analyse intelligente de la structure du code
- Création de parcours pédagogiques adaptés
- Génération de tutoriels interactifs
- Support des diagrammes Mermaid et syntax highlighting

**3.2 Gestion des Jobs**
- Suivi progression en temps réel (étapes/pourcentage)
- Annulation de jobs en cours avec cleanup
- Régénération avec statistiques (inserted/updated/deleted)
- File d'attente avec priorités

**3.3 Intégration GitHub**
- Listing automatique des repositories utilisateur
- Support branches multiples
- Gestion rate limiting API GitHub
- Persistance tokens d'accès sécurisée

### 4. LIVRABLES ATTENDUS

**Infrastructure:**
- Service Cloud Run déployé et configuré
- Pipeline CI/CD GitHub Actions
- Scripts de déploiement automatisés

**Code:**
- Application Next.js production-ready
- Service Express.js pour Cloud Run
- Schémas Convex avec migrations
- Composants UI réutilisables

**Documentation:**
- Guide déploiement Cloud Run
- Documentation API webhooks
- Manuel d'intégration Fondation CLI

### 5. CRITÈRES D'ACCEPTATION

- Génération complète en moins de 3 minutes pour repo moyen
- Support de 100 jobs simultanés
- Disponibilité service > 99%
- Interface responsive mobile/desktop
- Localisation française complète

### 6. PHASES DE RÉALISATION

**Phase 1:** Infrastructure Cloud Run + Convex
**Phase 2:** Intégration Fondation CLI
**Phase 3:** Interface utilisateur + Dashboard
**Phase 4:** Tests et optimisations

---
*Annexe au contrat n°: [REF-CONTRAT]*