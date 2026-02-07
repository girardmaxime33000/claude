# AI Marketing Agents

Systeme multi-agents IA specialise en marketing digital, orchestre via Trello et propulse par Claude (Anthropic). Chaque agent possede une expertise metier distincte et produit des livrables actionnables de maniere autonome.

## Table des matieres

- [Architecture](#architecture)
- [Agents](#agents)
- [Fonctionnalites](#fonctionnalites)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Prerequis](#prerequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Cas d'usage](#cas-dusage)
- [Licence](#licence)

---

## Architecture

```
Trello Board                 Orchestrator                  Agents (x8)
┌──────────┐   poll/30s    ┌──────────────┐   dispatch   ┌──────────────┐
│  Todo     │─────────────▶│  Prioriser   │─────────────▶│ SEO          │
│  En cours │◀─────────────│  Router      │◀─────────────│ Content      │
│  Review   │  move card   │  Superviser  │   result     │ Ads          │
│  Done     │              └──────┬───────┘              │ Analytics    │
└──────────┘                     │                       │ Social       │
                                 │ deliverable           │ Email        │
                          ┌──────▼───────┐               │ Brand        │
                          │  GitHub      │               │ Strategy     │
                          │  PR / Issue  │               └──────────────┘
                          │  Fichiers    │
                          └──────────────┘

                          ┌──────────────┐
                          │  Umami       │  ◀── Analytics en temps reel
                          │  Analytics   │
                          └──────────────┘
```

**Flux de travail** : L'orchestrateur poll Trello toutes les 30 secondes, detecte les nouvelles cartes dans la liste "Todo", identifie le domaine via les labels et mots-cles, puis dispatche la tache a l'agent specialise. Le livrable est produit et pousse sur GitHub (PR/Issue) ou stocke localement. La carte Trello est deplacee automatiquement au fil du workflow.

---

## Agents

Le systeme embarque **8 agents specialises**, chacun associe a un domaine marketing et identifie par une couleur de label Trello :

| Agent | Domaine | Label Trello | Capacites |
|-------|---------|:------------:|-----------|
| **SEO Specialist** | `seo` | 🟢 vert | Recherche de mots-cles, audit technique, optimisation on-page, analyse concurrentielle, strategie de backlinks |
| **Content Strategist** | `content` | 🔵 bleu | Calendrier editorial, redaction, audit de contenu, tone of voice, repurposing cross-canal |
| **Paid Media** | `ads` | 🔴 rouge | Configuration de campagnes, copywriting publicitaire, optimisation budgetaire, ciblage d'audiences, reporting ROAS |
| **Analytics** | `analytics` | 🟠 orange | Creation de dashboards, analyse de donnees, tracking de conversions, modelisation d'attribution, reporting |
| **Social Media** | `social` | 🟣 violet | Strategie social media, community management, calendrier de publication, strategie d'influence, social listening |
| **Email Marketing** | `email` | 🟡 jaune | Campagnes email, workflows d'automation, segmentation, A/B testing, deliverabilite |
| **Brand Strategy** | `brand` | 🩵 ciel | Positionnement de marque, brand guidelines, analyse concurrentielle, messaging, audit de marque |
| **Marketing Strategy** | `strategy` | ⚫ noir | Plan marketing, allocation budgetaire, etude de marche, strategie de croissance, definition d'OKRs |

Chaque agent recoit un prompt systeme adapte a son expertise et produit des livrables structures (recommandations priorisees, metriques de suivi, documents prets a publier).

---

## Fonctionnalites

### Routage intelligent

L'orchestrateur detecte automatiquement le domaine d'une tache en analysant :
- Les **labels** de la carte Trello (couleur et nom)
- Les **mots-cles** dans le titre et la description
- Le **type de livrable** attendu

### Gestion de priorite

Les taches sont traitees par ordre : `urgent` > `high` > `medium` > `low`. La priorite est determinee par les labels Trello et les dates d'echeance.

### Execution concurrente

Jusqu'a 3 agents en parallele (configurable via `MAX_CONCURRENT_AGENTS`). L'orchestrateur gere la file d'attente et respecte la limite de concurrence.

### Generation de prompts inter-agents

A partir d'un objectif marketing de haut niveau, le systeme decompose automatiquement la tache en sous-objectifs et genere des prompts specialises pour chaque agent concerne. Les cartes Trello correspondantes sont creees automatiquement.

### Livrables multi-formats

| Type | Sortie | Description |
|------|--------|-------------|
| `document` | Fichier Markdown | Document structure avec metadonnees |
| `report` | Fichier Markdown | Rapport d'analyse detaille |
| `pull_request` | Pull Request GitHub | Branche + commit + PR formatee |
| `review_request` | Issue GitHub | Issue avec label "review" |
| `campaign_config` | Fichier JSON | Configuration de campagne structuree |

### Workflow Trello

Cycle complet : **Backlog** → **Todo** → **In Progress** → **Review** → **Done**. L'orchestrateur deplace les cartes, ajoute des commentaires avec les resultats et cree des checklists pour les prochaines etapes. Support bilingue (FR/EN) pour les noms de listes.

### Analytics (Umami)

Integration avec Umami Analytics pour recuperer les donnees de trafic en temps reel : statistiques, pages vues, referrers, pays, navigateurs, evenements. Ces donnees alimentent l'agent Analytics pour des rapports data-driven.

---

## Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | ES2022 |
| Langage | TypeScript | 5.5+ |
| Execution TS | tsx | 4.19+ |
| IA | Claude (Anthropic) | Sonnet |
| Orchestration | Trello API | - |
| Versioning | GitHub API | - |
| Analytics | Umami API | Cloud |
| Tests | Vitest | 2.0+ |
| Linting | ESLint | 9.0+ |
| Env | dotenv | 17+ |

---

## Structure du projet

```
src/
├── index.ts                      # Point d'entree — polling continu
├── cli.ts                        # Interface CLI (run, poll, status, create-card, generate, preview)
├── agents/
│   └── base-agent.ts             # Classe MarketingAgent — execution des taches via Claude
├── config/
│   ├── types.ts                  # Types TypeScript (domaines, priorites, livrables, cartes, prompts)
│   ├── loader.ts                 # Chargement et validation de la configuration (.env)
│   └── agents.ts                 # Definitions des 8 agents specialises (prompts, capacites)
├── orchestrator/
│   └── orchestrator.ts           # Moteur d'orchestration central (routing, concurrence, workflow)
├── deliverables/
│   └── manager.ts                # Production des livrables multi-formats (MD, JSON, PR, Issue)
├── analytics/
│   ├── index.ts                  # Export du module analytics
│   ├── types.ts                  # Types Umami (stats, pageviews, metrics, events)
│   ├── umami-client.ts           # Client HTTP pour l'API Umami
│   └── analytics-service.ts      # Service d'agregation des donnees analytics
├── prompts/
│   └── generator.ts              # Generateur de prompts inter-agents
└── trello/
    ├── client.ts                 # Client API Trello (CRUD cartes, listes, commentaires)
    └── card-creator.ts           # Creation de cartes Trello depuis les agents
```

---

## Prerequis

- **Node.js** >= 18 (support ES2022)
- Un **board Trello** avec les listes : Backlog, Todo, In Progress, Review, Done
- Une **cle API Anthropic** (Claude)
- Un **token GitHub** avec droits repo (pour PRs et Issues)
- *(Optionnel)* Un compte **Umami Cloud** pour l'analytics

---

## Installation

```bash
git clone https://github.com/girardmaxime33000/claude.git
cd claude
npm install
```

---

## Configuration

Copier le fichier d'exemple et renseigner les cles :

```bash
cp .env.example .env
```

### Variables requises

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Cle API Claude (Anthropic) |
| `TRELLO_API_KEY` | Cle API Trello |
| `TRELLO_TOKEN` | Token d'authentification Trello |
| `TRELLO_BOARD_ID` | ID du board Trello cible |
| `GITHUB_TOKEN` | Token GitHub (repos, PRs, Issues) |
| `GITHUB_OWNER` | Nom d'utilisateur ou organisation GitHub |
| `GITHUB_REPO` | Nom du repository cible |

### Variables optionnelles

| Variable | Defaut | Description |
|----------|--------|-------------|
| `POLL_INTERVAL_MS` | `30000` | Intervalle de polling Trello (ms) |
| `MAX_CONCURRENT_AGENTS` | `3` | Nombre max d'agents en parallele |
| `AUTO_ASSIGN` | `true` | Attribution automatique des taches |
| `UMAMI_API_KEY` | - | Cle API Umami Cloud |
| `UMAMI_WEBSITE_ID` | - | UUID du site Umami |
| `UMAMI_API_ENDPOINT` | `https://api.umami.is/v1` | Endpoint API Umami |
| `UMAMI_TIMEZONE` | `UTC` | Timezone pour les requetes Umami |

---

## Utilisation

### Mode continu (production)

```bash
# Polling continu — surveille Trello et traite les taches automatiquement
npm start

# Mode developpement — watch + auto-restart
npm run dev
```

### Commandes CLI

```bash
# Executer une tache par ID de carte Trello
npm run agent:run <card-id>

# Executer un seul cycle de polling
npm run agent:poll

# Voir les taches en cours d'execution
npm run agent:status

# Creer une carte Trello
npm run agent:create-card "Audit SEO du site" -- --domain seo --priority high

# Generer des prompts et creer les cartes automatiquement a partir d'un objectif
npm run agent:generate "Lancer une campagne de notoriete pour notre produit SaaS"

# Previsualiser les prompts generes (sans creation de cartes)
npm run agent:preview "Ameliorer notre strategie email marketing"
```

### Verification du code

```bash
npm run typecheck    # Verification des types TypeScript
npm run lint         # Linting ESLint
npm test             # Tests unitaires (Vitest)
```

---

## Cas d'usage

### Pipeline SEO complet

1. Un responsable marketing cree une carte Trello "Audit SEO site e-commerce" avec le label vert
2. L'orchestrateur detecte la carte et l'assigne au **SEO Specialist**
3. L'agent produit un audit technique avec recommandations priorisees
4. Le livrable est pousse en **Pull Request** sur GitHub
5. La carte passe en "Review" avec un commentaire resumant les findings

### Lancement de campagne multi-agents

```
Carte 1 : "Strategie de lancement Q2"      → Marketing Strategy Agent
Carte 2 : "Campagne Google Ads lancement"   → Paid Media Agent
Carte 3 : "Calendrier social media"         → Social Media Agent
Carte 4 : "Sequence email pre-lancement"    → Email Marketing Agent
```

Les 3 premieres cartes sont traitees en parallele. La 4e est mise en file d'attente.

### Generation automatique depuis un objectif

```bash
npm run agent:generate "Lancer notre nouveau produit SaaS sur le marche francais"
```

Le systeme decompose l'objectif, genere des prompts specialises et cree automatiquement les cartes Trello pour chaque agent concerne.

### Reporting mensuel automatise

Des cartes recurrentes declenchent la generation de rapports par les agents Analytics, SEO, Paid Media et Social Media. Les rapports sont stockes en Markdown dans `./output/deliverables/reports/`.

---

## Licence

Projet prive — girardmaxime33000
