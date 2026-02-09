# AI Marketing Agents

Systeme multi-agents IA autonome pour le marketing digital. Orchestre par [Trello](https://developer.atlassian.com/cloud/trello/rest/), propulse par [Claude](https://platform.claude.com/docs/en/about-claude/models/overview) (Anthropic), avec production automatique de livrables sur GitHub et en local.

Chaque agent possede une expertise metier, un prompt systeme dedie, et peut deleguer des sous-taches aux autres agents.

> **Modele IA actuel** : [`claude-sonnet-4-20250514`](https://platform.claude.com/docs/en/about-claude/models/overview) (Claude Sonnet 4, mai 2025). Compatible avec les modeles plus recents ([Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5), [Opus 4.6](https://www.anthropic.com/news/claude-opus-4-5)) — il suffit de modifier le model ID dans `base-agent.ts` et `generator.ts`.

## Table des matieres

- [Architecture](#architecture)
- [Agents specialises](#agents-specialises)
- [Fonctionnalites](#fonctionnalites)
- [Templates de prompts](#templates-de-prompts)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Prerequis](#prerequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Cas d'usage](#cas-dusage)
- [APIs et references](#apis-et-references)
- [Quoi de neuf](#quoi-de-neuf)
- [Licence](#licence)

---

## Architecture

```
                          ┌─────────────────┐
                          │   Claude API    │
                          │ claude-sonnet-4 │
                          └────────┬────────┘
                                   │
Trello Board               Orchestrator                    Agents (x9)
┌────────────┐ poll/30s ┌──────────────────┐  dispatch  ┌───────────────┐
│ Backlog    │          │                  │           │ SEO           │
│ Todo       │─────────▶│  Priorite        │──────────▶│ Content       │
│ En cours   │◀─────────│  Routage         │◀──────────│ Ads           │
│ Review     │ move card│  Concurrence     │  result   │ Analytics     │
│ Done       │          │  Gestion erreurs │           │ Social        │
│ Ticketing  │◀─ error  └──────┬───────────┘           │ Email         │
└────────────┘                 │                       │ Brand         │
              ┌────────────────┼────────────────┐      │ Strategy      │
              │                │                │      │ Lead Research │
              ▼                ▼                ▼      └───────┬───────┘
     ┌────────────┐   ┌──────────────┐  ┌───────────┐        │ delegation
     │  GitHub    │   │  Fichiers    │  │  Umami    │        ▼
     │  PR/Issue  │   │  ./output/   │  │ Analytics │  ┌───────────────┐
     └────────────┘   └──────────────┘  └───────────┘  │ CardCreator   │
                                                       │ PromptGen.    │
                                                       │ → Trello card │
                                                       └───────────────┘
```

### Flux de travail detaille

1. **Polling** : L'orchestrateur interroge Trello toutes les 30s (configurable), recupere les cartes de la liste "Todo"
2. **Priorisation** : Les taches sont triees par priorite (`urgent` > `high` > `medium` > `low`). Les cartes dont la date d'echeance est a moins de 24h sont automatiquement passees en `urgent`, moins de 3 jours en `high`
3. **Routage** : Detection du domaine par les labels Trello (nom + couleur) puis par mots-cles bilingues FR/EN dans le titre et la description
4. **Dispatch** : La carte est deplacee en "In Progress" et assignee a l'agent specialise. Jusqu'a 3 agents en parallele
5. **Execution** : L'agent appelle Claude avec son prompt systeme + les instructions de la tache. Il peut deleguer des sous-taches a d'autres agents via des blocs `DELEGATE`
6. **Livrable** : Le `DeliverableManager` produit le livrable (Markdown local, Pull Request GitHub, Issue GitHub, ou JSON de configuration)
7. **Cloture** : La carte passe en "Review" ou "Done", un commentaire structure est ajoute avec le lien vers le livrable, et une checklist "Prochaines etapes" est creee
8. **Erreur** : En cas d'echec, la carte est deplacee dans "Ticketing" avec un commentaire diagnostique (erreur, agent, solutions possibles) pour investigation manuelle. Le commentaire et le deplacement sont proteges independamment pour garantir que la carte ne reste jamais bloquee en "In Progress"

---

## Agents specialises

Le systeme embarque **9 agents**, chacun identifie par un domaine, un prompt systeme et une couleur de label Trello :

| Agent | Domaine | Label | Capacites principales |
|-------|---------|:-----:|----------------------|
| **SEO Specialist** | `seo` | 🟢 | Recherche de mots-cles, audit technique (Core Web Vitals, crawlabilite), optimisation on-page, analyse concurrentielle, strategie de backlinks |
| **Content Creator** | `content-creator` | 🔵 | Blog posts, social media content (Twitter/X, LinkedIn, Instagram), marketing copy, headlines, email newsletters, audience engagement |
| **Paid Media** | `ads` | 🔴 | Campagnes Google Ads / Meta Ads / LinkedIn Ads, copywriting publicitaire, optimisation budgetaire, ciblage d'audiences, reporting ROAS |
| **Analytics** | `analytics` | 🟠 | Dashboards, analyse de donnees, tracking de conversions (GA4, GTM), modelisation d'attribution, analyse de cohortes |
| **Social Media** | `social` | 🟣 | Strategie multi-plateforme, community management, calendrier de publication, strategie d'influence, social listening |
| **Email Marketing** | `email` | 🟡 | Campagnes email, workflows d'automation et nurturing, segmentation, A/B testing, deliverabilite et conformite RGPD |
| **Brand Strategy** | `brand` | 🩵 | Positionnement de marque, brand guidelines, analyse concurrentielle et mapping, plateforme de marque, audit de perception |
| **Marketing Strategy** | `strategy` | ⚫ | Plan marketing annuel, allocation budgetaire et ROI previsionnel, etude de marche, strategie Go-to-Market, definition d'OKRs |
| **Lead Research Assistant** | `lead-research-assistant` | — | Identification de leads qualifies, scoring ICP (1-10), strategies de contact personnalisees, enrichissement de donnees, prospection |

Chaque agent recoit un prompt systeme adapte a son expertise et produit des livrables structures (recommandations priorisees, metriques de suivi, documents prets a publier). Pour une reference detaillee des competences, voir [`skill.md`](./skill.md).

### Detection bilingue des domaines

Le routage supporte les mots-cles en francais et en anglais. Exemples :

| Mot-cle | Domaine detecte |
|---------|----------------|
| "seo", "referencement" | `seo` |
| "content", "contenu", "redaction" | `content` |
| "ads", "publicite", "paid media" | `ads` |
| "analytics", "data" | `analytics` |
| "social", "reseaux sociaux" | `social` |
| "email", "emailing", "crm" | `email` |
| "brand", "marque" | `brand` |
| "strategy", "strategie" | `strategy` |

---

## Fonctionnalites

### Routage intelligent

L'orchestrateur detecte le domaine d'une tache en trois passes successives :
1. **Labels Trello** : correspondance par nom (ex: "seo", "contenu") ou par couleur (ex: vert = SEO)
2. **Mots-cles bilingues** : analyse du titre et de la description
3. **Fallback** : assignation au Marketing Strategy Agent

### Gestion de priorite

Quatre niveaux : `urgent` > `high` > `medium` > `low`.

Sources de priorite :
- **Labels Trello** : labels contenant "urgent", "high"/"prioritaire", "low"/"bas"
- **Date d'echeance** : < 24h = `urgent`, < 3 jours = `high`
- **Defaut** : `medium`

### Execution concurrente

Jusqu'a 3 agents en parallele (configurable via `MAX_CONCURRENT_AGENTS`). Les taches supplementaires sont mises en file d'attente et traitees des qu'un slot se libere.

### Generation de prompts inter-agents

A partir d'un objectif de haut niveau, le systeme :
1. Detecte automatiquement les domaines concernes par mots-cles
2. Appelle Claude avec un meta-prompt de decomposition
3. Parse la reponse en prompts structures (titre, instructions, type de livrable, criteres d'acceptation)
4. Cree les cartes Trello correspondantes avec checklists

Deux modes de generation :
- **IA** : Claude decompose l'objectif en sous-taches (`generateFromObjective`)
- **Template** : prompts pre-construits sans appel API (`buildFromTemplate`)

### Livrables

| Type | Sortie | Emplacement |
|------|--------|-------------|
| `document` | Fichier Markdown avec en-tete (agent, date, domaine) | `./output/deliverables/docs/<slug>.md` |
| `report` | Rapport d'analyse Markdown | `./output/deliverables/reports/<slug>.md` |
| `pull_request` | Branche + fichier + Pull Request sur GitHub | `feature/<slug>` |
| `review_request` | Document local + Issue GitHub avec labels | `review/<slug>` |
| `campaign_config` | Fichier JSON structure | `./output/deliverables/campaigns/<slug>.json` |

### Workflow Trello

Cycle nominal : **Backlog** > **Todo** > **In Progress** > **Review** > **Done**
Cycle en erreur : **In Progress** > **Ticketing** (investigation manuelle)

Noms de listes supportes (FR/EN) :

| Stage | Noms acceptes |
|-------|---------------|
| `backlog` | Backlog |
| `todo` | Todo, To Do, A faire |
| `in_progress` | In Progress, In_Progress, En cours |
| `review` | Review, En Review, A valider |
| `done` | Done, Termine, Fait |
| `ticketing` | Ticketing |

Actions automatiques sur les cartes :
- Deplacement entre listes selon l'avancement
- Commentaire structure avec resume, lien vers le livrable et sous-taches creees
- Checklist "Prochaines etapes" ajoutee automatiquement
- Commentaires de liaison parent/enfant pour les delegations
- En cas d'erreur : commentaire diagnostique (agent, erreur, solutions possibles) et deplacement vers Ticketing

### Analytics (Umami)

Integration via le SDK [`@umami/api-client`](https://www.npmjs.com/package/@umami/api-client) v0.80.0. Authentification par cle API Cloud (header `x-umami-api-key`). Les reponses du SDK suivent le format `{ ok: boolean, data?: T, status: number, error?: any }`.

Le module `AnalyticsService` produit un rapport complet en une requete :

| Donnee | Methode | Endpoint Umami |
|--------|---------|----------------|
| Stats globales (pageviews, visitors, visits, bounces, totaltime) | `getStats()` | `GET /websites/{id}/stats` |
| Pages vues par periode (heure, jour, mois, annee) | `getPageviews()` | `GET /websites/{id}/pageviews` |
| Top pages, referrers, pays, navigateurs, devices, OS | `getMetrics()` | `GET /websites/{id}/metrics` |
| Evenements | `getEvents()` | `GET /event-data/events` |
| Visiteurs actifs en temps reel | `getActiveVisitors()` | `GET /websites/{id}/active` |
| Rapport complet agrege | `getSummary()` | Combine tous les endpoints ci-dessus via `Promise.all` |

Le service inclut :
- `getSummary(range)` : agregation parallele de toutes les metriques en un seul appel
- `formatSummaryAsMarkdown(summary)` : generateur de rapport Markdown avec tableaux comparatifs (periode courante vs precedente, bounce rate, temps moyen)
- `daysAgo(n)` : helper pour creer un `UmamiDateRange` relatif

### Graceful shutdown

Le processus ecoute `SIGINT` et `SIGTERM` pour arreter proprement le polling et laisser les taches en cours se terminer.

---

## Templates de prompts

8 templates pre-construits pour les patterns marketing courants. Utilisables sans appel a Claude (`buildFromTemplate`) :

| Template | Domaine | Variables | Description |
|----------|---------|-----------|-------------|
| `seo_audit` | SEO | `{{target}}` | Audit SEO complet (technique, on-page, off-page, mots-cles, concurrence) |
| `content_calendar` | Content | `{{period}}`, `{{target}}`, `{{frequency}}` | Calendrier editorial avec thematiques, formats et KPIs |
| `ad_campaign` | Ads | `{{objective}}` | Campagne publicitaire (strategie, ciblage, 3 variantes d'annonces, budget) |
| `analytics_report` | Analytics | `{{target}}`, `{{period}}` | Rapport d'analyse (KPIs, trafic, conversion, insights) |
| `social_strategy` | Social | `{{target}}`, `{{platforms}}` | Strategie social media multi-plateforme |
| `email_sequence` | Email | `{{objective}}`, `{{email_count}}` | Sequence email complete (segmentation, triggers, A/B) |
| `brand_guidelines` | Brand | `{{target}}` | Charte de marque (positionnement, personnalite, tone of voice, visuels) |
| `marketing_plan` | Strategy | `{{target}}`, `{{period}}` | Plan marketing annuel (SWOT, OKRs, budget, planning) |

---

## Stack technique

| Composant | Technologie | Semver | Version installee | Detail |
|-----------|-------------|--------|-------------------|--------|
| Runtime | Node.js | >= 18.18 | 22.22.0 | Target ES2022, module ESNext |
| Langage | TypeScript | ^5.5.0 | 5.9.3 | Mode strict, `moduleResolution: bundler` |
| Execution TS | tsx | ^4.19.0 | 4.21.0 | Execution directe + mode watch |
| IA | [Claude API](https://platform.claude.com/docs/en/api/overview) | — | `claude-sonnet-4-20250514` | `anthropic-version: 2023-06-01`, max 4096 tokens |
| Orchestration | [Trello REST API v1](https://developer.atlassian.com/cloud/trello/rest/) | — | — | Rate limit : 300 req/10s par cle, 100 req/10s par token |
| Livrables | [GitHub REST API](https://docs.github.com/en/rest) | — | — | Branches, fichiers, Pull Requests, Issues |
| Analytics | [@umami/api-client](https://www.npmjs.com/package/@umami/api-client) | ^0.80.0 | 0.80.0 | SDK officiel Umami Cloud, auth via header `x-umami-api-key` |
| Env | dotenv | ^17.2.4 | 17.2.4 | Chargement automatique via `import "dotenv/config"` |
| Tests | Vitest | ^2.0.0 | 2.1.9 | `vitest run` + mode watch |
| Linting | ESLint | ^9.0.0 | 9.39.2 | Flat config (ESLint 9) |

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
│   └── agents.ts                 # Definitions des 9 agents specialises (prompts, capacites)
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
├── utils/
│   ├── sanitizer.ts              # Protection prompt injection et path traversal (CRITIQUE-01/02)
│   ├── http.ts                   # Fetch securise avec timeout, rate limiter et retry (HAUTE-02/04/05)
│   └── validator.ts              # Validation des entrees CLI et limites de delegation (MOYENNE-02/04, CRITIQUE-04)
└── trello/
    ├── client.ts                 # Client API Trello (CRUD cartes, listes, commentaires)
    └── card-creator.ts           # Creation de cartes Trello depuis les agents
```

---

## Prerequis

- **Node.js** >= 18.18 (impose par `@umami/api-client`)
- Un **board Trello** avec 6 listes : Backlog, Todo, In Progress, Review, Done, Ticketing
- Une **cle API Anthropic** avec acces au modele Claude Sonnet 4+ ([obtenir une cle](https://console.anthropic.com/))
- Un **token GitHub** avec scope `repo` ([creer un token](https://github.com/settings/tokens))
- *(Optionnel)* Une **cle API Umami Cloud** pour le module analytics ([umami.is](https://umami.is/))

---

## Installation

```bash
git clone https://github.com/girardmaxime33000/claude.git
cd claude
npm install
```

---

## Configuration

```bash
cp .env.example .env
```

Editer `.env` avec vos cles :

### Variables requises

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Cle API Claude (Anthropic) |
| `TRELLO_API_KEY` | Cle API Trello ([trello.com/power-ups/admin](https://trello.com/power-ups/admin)) |
| `TRELLO_TOKEN` | Token d'autorisation Trello |
| `TRELLO_BOARD_ID` | ID du board cible (visible dans l'URL du board) |
| `GITHUB_TOKEN` | Personal Access Token GitHub avec scope `repo` |
| `GITHUB_OWNER` | Nom d'utilisateur ou organisation GitHub |
| `GITHUB_REPO` | Nom du repository pour les PRs et Issues |

### Variables optionnelles

| Variable | Defaut | Description |
|----------|--------|-------------|
| `POLL_INTERVAL_MS` | `30000` | Intervalle de polling Trello en ms |
| `MAX_CONCURRENT_AGENTS` | `3` | Nombre max d'agents executant des taches en parallele |
| `AUTO_ASSIGN` | `true` | Attribution automatique des taches aux agents |
| `UMAMI_API_KEY` | - | Cle API Umami Cloud |
| `UMAMI_WEBSITE_ID` | - | UUID du site dans Umami |
| `UMAMI_API_ENDPOINT` | `https://api.umami.is/v1` | Endpoint de l'API Umami |
| `UMAMI_TIMEZONE` | `UTC` | Timezone pour les requetes analytics |

---

## Utilisation

### Mode continu (production)

```bash
# Polling continu — surveille Trello et traite les taches automatiquement
# Arret propre via Ctrl+C (SIGINT) ou SIGTERM
npm start

# Mode developpement — watch + auto-restart a chaque modification
npm run dev
```

### Commandes CLI

```bash
# Executer une tache specifique par ID de carte Trello
npm run agent:run <card-id>

# Executer un seul cycle de polling (fetch + traitement)
npm run agent:poll

# Afficher les taches en cours d'execution (agent, duree)
npm run agent:status

# Lister tous les agents disponibles avec leurs capacites
tsx src/cli.ts agents

# Creer une carte Trello manuellement
npm run agent:create-card "Audit SEO du site" -- --domain seo --priority high --desc "Audit complet"

# Generer des prompts inter-agents et creer les cartes depuis un objectif
npm run agent:generate "Lancer une campagne de notoriete pour notre produit SaaS"

# Previsualiser les prompts generes sans creer de cartes
npm run agent:preview "Ameliorer notre strategie email marketing"
```

Options de `create-card` :

| Option | Valeurs | Defaut |
|--------|---------|--------|
| `--domain` | seo, content, ads, analytics, social, email, brand, strategy | strategy |
| `--desc` | Texte libre | - |
| `--priority` | low, medium, high, urgent | medium |
| `--stage` | backlog, todo, in_progress, review, done, ticketing | todo |

### Verification du code

```bash
npm run typecheck    # Verification des types TypeScript (tsc --noEmit)
npm run lint         # Linting ESLint
npm test             # Tests unitaires (Vitest, execution unique)
npm run test:watch   # Tests en mode watch
```

---

## Cas d'usage

### 1. Pipeline SEO complet

1. Un responsable marketing cree une carte "Audit SEO site e-commerce" avec le label vert sur Trello
2. L'orchestrateur detecte la carte, identifie le domaine `seo` et l'assigne au **SEO Specialist**
3. La carte passe en "In Progress"
4. L'agent appelle Claude avec son prompt systeme SEO et les details de la carte
5. Claude produit un audit structure ; l'agent parse le livrable et le stocke dans `./output/deliverables/reports/audit-seo-site-e-commerce.md`
6. La carte passe en "Review" avec un commentaire resumant les findings et un lien vers le livrable
7. Une checklist "Prochaines etapes" est ajoutee a la carte

### 2. Decomposition automatique d'un objectif

```bash
npm run agent:generate "Lancer notre nouveau produit SaaS sur le marche francais"
```

Le systeme :
1. Detecte les domaines pertinents via les mots-cles ("produit" → strategy, "marche" → strategy, "lancer" → ads, etc.)
2. Appelle Claude pour decomposer l'objectif en sous-taches
3. Cree les cartes Trello avec instructions, criteres d'acceptation et checklists :

```
[STRATEGY]  Elaborer le plan Go-to-Market France       → Todo
[ADS]       Campagne Google Ads lancement produit       → Todo
[CONTENT]   Calendrier editorial pre-lancement          → Todo
[SOCIAL]    Strategie social media lancement            → Todo
[EMAIL]     Sequence email nurturing prospects           → Todo
```

### 3. Delegation en chaine

Un agent **Marketing Strategy** recoit la tache "Plan marketing Q2". Pendant son execution, il identifie le besoin de sous-taches et genere des blocs `DELEGATE` dans sa reponse :

```
Agent Strategy → cree carte SEO "Audit mots-cles Q2"
               → cree carte Content "Calendrier editorial Q2"
               → cree carte Ads "Budget campagnes Q2"
```

Les sous-taches apparaissent dans la liste "Todo" avec un commentaire de liaison vers la carte parente. Elles seront traitees au prochain cycle de polling.

### 4. Utilisation des templates (sans appel API)

```typescript
import { PromptGenerator } from "./src/prompts/generator.js";

const generator = new PromptGenerator(apiKey);
const prompt = generator.buildFromTemplate("seo_audit", {
  target: "www.example.com",
});
// → prompt structure pret a l'emploi, sans consommer de tokens
```

---

## APIs et references

| Service | Documentation | Details |
|---------|--------------|---------|
| **Anthropic Claude API** | [platform.claude.com/docs](https://platform.claude.com/docs/en/api/overview) | Header `anthropic-version: 2023-06-01` (seule version supportee). Endpoint : `POST https://api.anthropic.com/v1/messages`. Modeles disponibles : Sonnet 4, Sonnet 4.5, Haiku 4.5, Opus 4.5, Opus 4.6 |
| **Trello REST API** | [developer.atlassian.com/cloud/trello/rest](https://developer.atlassian.com/cloud/trello/rest/) | API v1. Auth par query params `key` + `token`. Rate limits : 300 req/10s par cle, 100 req/10s par token. Webhooks supportes |
| **GitHub REST API** | [docs.github.com/en/rest](https://docs.github.com/en/rest) | Auth par Bearer token. Utilise pour la creation de branches, fichiers, PRs et Issues |
| **Umami API** | [umami.is/docs/api](https://umami.is/docs/api/api-client) | SDK `@umami/api-client`. Auth Cloud via header `x-umami-api-key`. Requiert Node.js >= 18.18 |

### Mise a jour du modele Claude

Le modele IA est configure dans deux fichiers :
- `src/agents/base-agent.ts` : appel Claude pour l'execution des taches agents
- `src/prompts/generator.ts` : appel Claude pour la generation de prompts inter-agents

Pour passer a un modele plus recent (ex: `claude-sonnet-4-5-20250929`) :

```typescript
// Remplacer dans les deux fichiers :
model: "claude-sonnet-4-20250514"
// Par :
model: "claude-sonnet-4-5-20250929"
```

Modeles disponibles (fevrier 2026) :

| Modele | ID API | Prix (input/output) |
|--------|--------|---------------------|
| Opus 4.6 | `claude-opus-4-6` | $15 / $75 par Mtokens |
| Sonnet 4.5 | `claude-sonnet-4-5-20250929` | $3 / $15 par Mtokens |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1 / $5 par Mtokens |
| **Sonnet 4** (actuel) | `claude-sonnet-4-20250514` | $3 / $15 par Mtokens |

---

## Quoi de neuf

### v1.4.0 — 8 fevrier 2026

**Gestion d'erreurs et colonne Ticketing**

- **Ticketing** : nouvelle colonne Trello pour les taches en echec. Les cartes ne restent plus bloquees en "In Progress"
- **Commentaires diagnostiques** : en cas d'erreur, un commentaire structure est ajoute a la carte avec le nom de l'agent, l'erreur, et des solutions possibles (timeout, rate limit, auth, 404, SHA, etc.)
- **Resilience** : le commentaire et le deplacement de carte sont proteges par des try/catch independants — si l'un echoue, l'autre s'execute quand meme
- **Validation GitHub** : le SHA de la branche par defaut est verifie avant de creer une PR, avec un message d'erreur clair si le repo est vide ou la branche introuvable
- **Nouveau skill** : [`lead-research-assistant`](./skill.md) — identification de leads qualifies, scoring ICP, strategies de contact

### v1.3.0 — 7 fevrier 2026

**Agents Content Creator et Lead Research**

- **Content Creator** (`content-creator`) remplace Content Strategist — framework complet de creation de contenu avec templates par plateforme (blog, Twitter/X, LinkedIn, email), formules de headlines, techniques d'engagement et checklist pre-publication
- **Lead Research Assistant** (`lead-research-assistant`) — nouvel agent de prospection avec analyse produit, identification de leads par ICP, scoring (1-10), strategies de contact personnalisees
- **skill.md** : nouvelle documentation de reference pour les competences de tous les agents
- Le systeme passe de 8 a **9 agents**

### v1.2.0 — 7 fevrier 2026

**Documentation enrichie et Context7 MCP**

- README enrichi avec donnees verifiees des APIs officielles (Claude, Trello, GitHub, Umami)
- Ajout des templates de prompts pre-construits (8 templates, utilisables sans appel API)
- Section APIs et references avec liens vers la documentation officielle
- Integration du serveur MCP Context7 pour la documentation a jour des librairies
- Table des modeles Claude disponibles avec pricing

### v1.1.0 — 7 fevrier 2026

**Audit de securite et correctifs**

- Audit de securite complet : 17 vulnerabilites identifiees, 14 corrigees
- Protection contre le path traversal (CRITIQUE-02)
- Timeouts sur toutes les requetes HTTP (HAUTE-05)
- Verification des reponses API (HAUTE-04)
- Sanitisation des URLs dans les logs (CRITIQUE-03)
- Idempotence des taches pour eviter les doublons (MOYENNE-05)

### v1.0.0 — 6 fevrier 2026

**Lancement initial**

- 8 agents marketing specialises (SEO, Content, Ads, Analytics, Social, Email, Brand, Strategy)
- Orchestration via Trello avec polling, priorisation et routage automatique
- Execution concurrente (jusqu'a 3 agents en parallele)
- Livrables multi-formats : Markdown, Pull Request GitHub, Issue GitHub, JSON
- Generation de prompts inter-agents et delegation en chaine
- Integration Umami Analytics (remplacement GA4/Search Console)
- Interface CLI complete (run, poll, status, create-card, generate, preview)
- Graceful shutdown (SIGINT/SIGTERM)

---

## Licence

Projet prive — girardmaxime33000
