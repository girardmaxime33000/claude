# AI Marketing Agents

Systeme multi-agents IA specialises en marketing, orchestre via Trello et propulse par Claude (Anthropic). Chaque agent possede une expertise metier distincte et produit des livrables actionables automatiquement.

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
```

---

## Les 8 Agents

### SEO Specialist

| | |
|---|---|
| **Domaine** | `seo` |
| **Role** | Expert SEO senior qui analyse mots-cles, audits techniques, optimisation on-page, backlinks et veille concurrentielle |
| **Capacites** | `keyword_research` · `technical_audit` · `content_optimization` · `competitor_analysis` · `backlink_strategy` |
| **Livrable type** | Document structure avec recommandations priorisees et metriques de suivi |

**Instructions internes** : L'agent recoit un prompt systeme lui demandant de produire des analyses SEO actionnables, avec priorites claires et KPIs de tracking. Il structure ses reponses en sections (resume, livrable, prochaines etapes).

---

### Content Strategist

| | |
|---|---|
| **Domaine** | `content` |
| **Role** | Directeur de contenu concevant et executant des strategies editoriales |
| **Capacites** | `editorial_calendar` · `content_writing` · `content_audit` · `tone_of_voice` · `content_repurposing` |
| **Livrable type** | Contenus prets a publier ou strategies documentees avec planning, KPIs et guidelines |

**Instructions internes** : L'agent produit des strategies de contenu completes ou des contenus directement publiables. Il inclut systematiquement un calendrier editorial, des recommandations de ton et des metriques de performance.

---

### Paid Media

| | |
|---|---|
| **Domaine** | `ads` |
| **Role** | Expert en acquisition digitale et media payant |
| **Capacites** | `campaign_setup` · `ad_copywriting` · `budget_optimization` · `audience_targeting` · `performance_reporting` |
| **Livrable type** | Configurations de campagnes, copies publicitaires, recommandations budgetaires, rapports de performance |

**Instructions internes** : L'agent genere des configurations campagnes structurees (audiences, budgets, copies), des recommandations d'optimisation et des rapports de performance avec ROI.

---

### Analytics

| | |
|---|---|
| **Domaine** | `analytics` |
| **Role** | Analyste marketing senior data-driven |
| **Capacites** | `dashboard_creation` · `data_analysis` · `conversion_tracking` · `attribution_modeling` · `reporting` |
| **Livrable type** | Rapports d'analyse, configurations de tracking, recommandations data-driven |

**Instructions internes** : L'agent fournit des analyses quantitatives avec visualisations, configurations de tracking et recommandations basees sur les donnees. Il structure ses rapports avec metriques cles et interpretations.

---

### Social Media

| | |
|---|---|
| **Domaine** | `social` |
| **Role** | Expert en marketing sur les reseaux sociaux |
| **Capacites** | `social_strategy` · `community_management` · `social_calendar` · `influencer_strategy` · `social_listening` |
| **Livrable type** | Strategies sociales, calendriers de publication, guidelines community management, rapports engagement |

**Instructions internes** : L'agent elabore des strategies social media adaptees a chaque plateforme, avec calendriers de publication, guidelines de community management et metriques d'engagement.

---

### Email Marketing

| | |
|---|---|
| **Domaine** | `email` |
| **Role** | Expert en email marketing et marketing automation |
| **Capacites** | `email_campaigns` · `automation_workflows` · `segmentation` · `ab_testing` · `deliverability` |
| **Livrable type** | Templates email, workflows d'automation, strategies de segmentation, rapports de performance |

**Instructions internes** : L'agent concoit des campagnes email completes avec workflows d'automation, regles de segmentation, scenarios A/B et optimisations de deliverabilite.

---

### Brand Strategy

| | |
|---|---|
| **Domaine** | `brand` |
| **Role** | Strategiste de marque senior |
| **Capacites** | `brand_positioning` · `brand_guidelines` · `competitive_analysis` · `brand_messaging` · `brand_audit` |
| **Livrable type** | Documents de strategie de marque, guidelines, analyses concurrentielles, recommandations de positionnement |

**Instructions internes** : L'agent produit des strategies de marque structurees avec positionnement, messages cles, guidelines visuelles et analyses du paysage concurrentiel.

---

### Marketing Strategy

| | |
|---|---|
| **Domaine** | `strategy` |
| **Role** | Directeur marketing strategique senior |
| **Capacites** | `marketing_plan` · `budget_allocation` · `market_research` · `growth_strategy` · `okr_definition` |
| **Livrable type** | Plans marketing structures, analyses de marche, recommandations strategiques, frameworks decisionnels |

**Instructions internes** : L'agent elabore des plans marketing complets avec allocation budgetaire, etudes de marche, strategies de croissance et definition d'OKRs. Il fournit des frameworks decisionnels structures.

---

## Features

### Routage intelligent des taches

L'orchestrateur detecte automatiquement le domaine d'une tache Trello en analysant :
- Les **labels** de la carte (couleur et nom)
- Les **mots-cles** dans le titre et la description
- Le **type de livrable** attendu

La tache est ensuite dispatchee a l'agent specialise correspondant.

### Gestion de priorite

Les taches sont traitees par ordre de priorite : `urgent` > `high` > `medium` > `low`. La priorite est determinee par les labels Trello et les dates d'echeance.

### Execution concurrente

Jusqu'a 3 agents peuvent s'executer en parallele (configurable via `MAX_CONCURRENT_AGENTS`). L'orchestrateur gere la file d'attente et respecte la limite de concurrence.

### Livrables multi-formats

| Type | Sortie | Description |
|------|--------|-------------|
| `document` | Fichier Markdown local | Document structure avec metadonnees |
| `report` | Fichier Markdown local | Rapport d'analyse detaille |
| `pull_request` | Pull Request GitHub | Branche + commit + PR formatee |
| `review_request` | Issue GitHub | Issue avec label "review" |
| `campaign_config` | Fichier JSON local | Configuration de campagne structuree |

### Workflow Trello complet

Chaque tache suit le cycle : **Backlog** → **Todo** → **In Progress** → **Review** → **Done**. L'orchestrateur deplace les cartes, ajoute des commentaires avec les resultats et cree des checklists pour les prochaines etapes.

### Integration GitHub

Creation automatique de Pull Requests et d'Issues pour les livrables qui necessitent une revue humaine ou une integration dans le code.

### Support bilingue

Les noms de listes Trello sont reconnus en francais et en anglais (`A faire` / `Todo`, `En cours` / `In Progress`, etc.).

---

## Cas d'usage — Orchestration

### 1. Pipeline SEO complet

> Un responsable marketing cree une carte Trello "Audit SEO site e-commerce" avec le label vert.

1. L'orchestrateur detecte la carte dans "Todo" et l'assigne au **SEO Specialist**
2. L'agent produit un audit technique avec recommandations priorisees
3. Le livrable est pousse en **Pull Request** sur GitHub
4. La carte passe en "Review" avec un commentaire resumant les findings
5. L'equipe review la PR et valide

### 2. Lancement de campagne marketing

> L'equipe cree plusieurs cartes pour un lancement produit.

```
Carte 1 : "Strategie de lancement Q2"      → Marketing Strategy Agent
Carte 2 : "Campagne Google Ads lancement"   → Paid Media Agent
Carte 3 : "Calendrier social media"         → Social Media Agent
Carte 4 : "Sequence email pre-lancement"    → Email Marketing Agent
```

Les 3 premieres cartes sont traitees en parallele (limite de concurrence). La 4e est mise en file d'attente. Chaque agent produit son livrable de maniere autonome.

### 3. Reporting mensuel automatise

> Des cartes recurrentes sont creees chaque mois pour les rapports.

- **Analytics Agent** : tableau de bord mensuel avec KPIs
- **SEO Specialist** : rapport de positionnement et evolution
- **Paid Media Agent** : rapport de performance des campagnes
- **Social Media Agent** : rapport d'engagement et croissance

Les rapports sont generes en fichiers Markdown dans `./output/deliverables/reports/`.

### 4. Refonte de marque

> Le directeur marketing initie un projet de rebranding.

1. **Brand Strategy Agent** reçoit "Audit de marque et nouveau positionnement" → produit un document strategique
2. **Content Strategist** reçoit "Nouveau tone of voice" → definit les guidelines editoriales
3. **Social Media Agent** reçoit "Adaptation identite reseaux sociaux" → adapte la strategie sociale
4. Les trois livrables sont publies en Issues GitHub pour review collaborative

### 5. Optimisation continue

> L'orchestrateur tourne en continu et traite les taches au fil de l'eau.

```
09:00  Nouvelle carte "Optimiser landing page"    → SEO Specialist
09:01  Nouvelle carte "A/B test email welcome"     → Email Marketing Agent
09:15  Livrable SEO produit → PR GitHub creee
09:18  Livrable Email produit → Document local genere
09:30  Prochain cycle de polling...
```

---

## Installation

```bash
# Cloner le repository
git clone https://github.com/girardmaxime33000/claude.git
cd claude

# Installer les dependances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Editer .env avec vos cles API
```

### Variables requises

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Cle API Claude (Anthropic) |
| `TRELLO_API_KEY` | Cle API Trello |
| `TRELLO_TOKEN` | Token d'authentification Trello |
| `TRELLO_BOARD_ID` | ID du board Trello cible |
| `GITHUB_TOKEN` | Token GitHub (pour PRs et Issues) |
| `GITHUB_OWNER` | Nom d'utilisateur / organisation GitHub |
| `GITHUB_REPO` | Nom du repository cible |

### Variables optionnelles

| Variable | Default | Description |
|----------|---------|-------------|
| `POLL_INTERVAL_MS` | `30000` | Intervalle de polling en ms |
| `MAX_CONCURRENT_AGENTS` | `3` | Nombre max d'agents en parallele |
| `AUTO_ASSIGN` | `true` | Attribution automatique des taches |

---

## Utilisation

```bash
# Mode production — polling continu
npm start

# Mode developpement — watch + auto-restart
npm run dev

# Executer une tache specifique par ID de carte Trello
npm run agent:run <card-id>

# Executer un seul cycle de polling
npm run agent:poll

# Voir les taches en cours
npm run agent:status
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js (ES2022) |
| Langage | TypeScript 5.5 |
| IA | Claude Sonnet (Anthropic) |
| Gestion de taches | Trello API |
| Versioning / Review | GitHub API |
| Tests | Vitest |
| Linting | ESLint |

---

## Structure du projet

```
src/
├── index.ts                  # Point d'entree — mode polling continu
├── cli.ts                    # Interface CLI (run, poll, status, agents)
├── agents/
│   └── base-agent.ts         # Classe MarketingAgent — execution des taches
├── config/
│   ├── types.ts              # Types TypeScript (domaines, priorites, livrables)
│   ├── loader.ts             # Chargement et validation de la configuration
│   └── agents.ts             # Definitions des 8 agents specialises
├── orchestrator/
│   └── orchestrator.ts       # Moteur d'orchestration central
├── deliverables/
│   └── manager.ts            # Production des livrables multi-formats
└── trello/
    └── client.ts             # Client API Trello (CRUD cartes, listes, commentaires)
```

---

## Licence

Projet prive — girardmaxime33000
