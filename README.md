# AI Marketing Agents — Documentation Technique

Systeme multi-agents IA orchestre via Trello et propulse par Claude (Anthropic).
8 agents specialises traitent automatiquement des taches marketing, produisent des livrables et synchronisent les resultats sur Trello et GitHub.

---

## Table des matieres

1. [Architecture globale](#1-architecture-globale)
2. [Specifications des agents](#2-specifications-des-agents)
3. [Fonctionnalites du systeme](#3-fonctionnalites-du-systeme)
4. [Cas d'usage d'orchestration](#4-cas-dusage-dorchestration)
5. [Installation et configuration](#5-installation-et-configuration)
6. [Reference technique](#6-reference-technique)

---

## 1. Architecture globale

```
                         ┌─────────────────────────────────────────────────┐
                         │              ORCHESTRATOR                       │
                         │  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
  ┌──────────────┐       │  │  Poll   │─▶│ Priorite │─▶│   Dispatch   │  │
  │ TRELLO BOARD │◀─────▶│  │ (30s)  │  │  & Tri   │  │  par domaine │  │
  │              │       │  └─────────┘  └──────────┘  └──────┬───────┘  │
  │ Backlog      │       │                                     │          │
  │ Todo ────────│──GET──│─────────────────────────────────────┘          │
  │ In Progress  │◀─PUT──│  ┌──────────────────────────────────────────┐  │
  │ Review       │◀─PUT──│  │           AGENTS (max 3 //)              │  │
  │ Done         │◀─PUT──│  │                                          │  │
  └──────┬───────┘       │  │  SEO · Content · Ads · Analytics         │  │
         │               │  │  Social · Email · Brand · Strategy       │  │
         │ Comments       │  │                                          │  │
         │ Checklists     │  │  Chaque agent appelle Claude Sonnet     │  │
         │               │  │  via l'API Anthropic (4096 tokens max)   │  │
         └───────────────│  └──────────────────┬───────────────────────┘  │
                         │                     │ AgentResult               │
                         │  ┌──────────────────▼───────────────────────┐  │
                         │  │        DELIVERABLE MANAGER               │  │
                         │  │                                          │  │
                         │  │  document ──▶ ./output/.../slug.md       │  │
                         │  │  report ────▶ ./output/.../slug.md       │  │
                         │  │  campaign ──▶ ./output/.../slug.json     │  │
                         │  │  PR ────────▶ GitHub Pull Request        │  │
                         │  │  review ────▶ GitHub Issue + fichier     │  │
                         │  └──────────────────────────────────────────┘  │
                         └─────────────────────────────────────────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │     GITHUB API      │
                                    │  Branches · Commits │
                                    │  Pull Requests      │
                                    │  Issues             │
                                    └─────────────────────┘
```

**Flux principal** :

```
Trello "Todo"
     │
     ▼
Orchestrator.poll()
     │
     ├─ TrelloClient.getAvailableTasks()      GET /lists/{todoId}/cards
     ├─ TrelloClient.parseCard(card)           Detecte domaine + priorite + type
     ├─ Tri par priorite (urgent=0, high=1, medium=2, low=3)
     ├─ Slice(0, availableSlots)               Respecte MAX_CONCURRENT_AGENTS
     │
     ▼
processTask(task)
     │
     ├─ TrelloClient.moveCard(id, "in_progress")    PUT /cards/{id}
     ├─ MarketingAgent.execute(task)                 POST api.anthropic.com/v1/messages
     │    ├─ buildPrompt(task)                       Construit le prompt structure
     │    ├─ callClaude(prompt)                      model: claude-sonnet-4-20250514
     │    └─ parseDeliverable(task, response)        Extraction regex des sections
     │
     ├─ DeliverableManager.produce(deliverable)      Ecrit fichier / cree PR / issue
     ├─ TrelloClient.addComment(id, comment)         POST /cards/{id}/actions/comments
     ├─ TrelloClient.addChecklist(id, steps)         POST /cards/{id}/checklists
     └─ TrelloClient.moveCard(id, "review"|"done")   PUT /cards/{id}
```

---

## 2. Specifications des agents

Chaque agent est une instance de `MarketingAgent` initialisee avec une `AgentDefinition` qui definit son comportement via le `systemPrompt` injecte a Claude.

### Mecanisme commun d'execution

```
MarketingAgent.execute(task)
     │
     ├─ 1. buildPrompt(task)
     │      Genere un prompt structure en francais :
     │      ┌──────────────────────────────────────┐
     │      │ # Tache a realiser                   │
     │      │ **Titre** : {task.title}             │
     │      │ **Priorite** : {task.priority}       │
     │      │ **Date limite** : {task.dueDate}     │
     │      │ **Type de livrable** : {type}        │
     │      │                                      │
     │      │ ## Description                       │
     │      │ {task.description}                   │
     │      │                                      │
     │      │ ## Contexte additionnel              │
     │      │ - **cle**: valeur  (extrait de la    │
     │      │   description Trello)                │
     │      │                                      │
     │      │ ## Instructions                      │
     │      │ 1. Analyse la tache                  │
     │      │ 2. Produis le livrable               │
     │      │ 3. Structure ta reponse :            │
     │      │    ### SUMMARY                       │
     │      │    ### DELIVERABLE_TITLE             │
     │      │    ### DELIVERABLE_CONTENT           │
     │      │    ### NEXT_STEPS                    │
     │      └──────────────────────────────────────┘
     │
     ├─ 2. callClaude(prompt)
     │      POST https://api.anthropic.com/v1/messages
     │      Headers: x-api-key, anthropic-version: 2023-06-01
     │      Body: { model: "claude-sonnet-4-20250514",
     │              max_tokens: 4096,
     │              system: agentDefinition.systemPrompt,
     │              messages: [{ role: "user", content: prompt }] }
     │
     ├─ 3. parseDeliverable(task, response)
     │      Regex: /###\s*{SECTION}\s*\n([\s\S]*?)(?=###|$)/i
     │      Extrait SUMMARY, DELIVERABLE_TITLE, DELIVERABLE_CONTENT
     │      Genere un slug : title → lowercase → replace [^a-z0-9] → "-"
     │      Mappe le type vers un chemin :
     │        document       → deliverables/docs/{slug}.md
     │        report         → deliverables/reports/{slug}.md
     │        pull_request   → feature/{slug}  (nom de branche)
     │        review_request → review/{slug}
     │        campaign_config→ deliverables/campaigns/{slug}.json
     │
     └─ 4. Retourne AgentResult
            { taskId, domain, status, deliverable, summary, trelloComment }
            status = "needs_review" si deliverableType == review_request
            status = "success" sinon
```

**Format de sortie impose a Claude** :

```markdown
### SUMMARY
Resume en 2-3 phrases.

### DELIVERABLE_TITLE
Titre du livrable.

### DELIVERABLE_CONTENT
Contenu complet du livrable.

### NEXT_STEPS
- Etape 1
- Etape 2
```

**Metadonnees attachees a chaque livrable** :

| Champ | Valeur |
|-------|--------|
| `agent` | Nom de l'agent (ex: "SEO Specialist Agent") |
| `domain` | Domaine (ex: "seo") |
| `taskId` | ID interne `task_{trelloCardId}` |
| `generatedAt` | Timestamp ISO 8601 |

---

### 2.1 SEO Specialist Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `seo` |
| **Label Trello** | `green` |
| **Mots-cles de routage** | `seo`, `referencement` |
| **Capabilities** | `keyword_research`, `technical_audit`, `content_optimization`, `competitor_analysis`, `backlink_strategy` |

**Prompt systeme** :
```
Tu es un expert SEO senior. Tu analyses, recommandes et implementes des strategies SEO.

Tes competences :
- Recherche et analyse de mots-cles (volume, difficulte, intention)
- Audit technique SEO (Core Web Vitals, structure, crawlabilite)
- Optimisation on-page (titres, metas, structure Hn, maillage interne)
- Strategie de backlinks et netlinking
- Analyse concurrentielle SEO

Format de sortie : Tu produis des documents structures avec des recommandations actionnables,
des priorites claires, et des metriques de suivi.
```

**Regles de decision** : Le routage vers cet agent se declenche si un label de la carte a le nom `seo` ou `referencement`, ou en fallback si le texte (titre + description) contient ces mots-cles.

**APIs et outils exploites** : Anthropic Messages API (`claude-sonnet-4-20250514`, 4096 tokens). Le prompt est en francais, les recommandations produites sont directement actionnables par une equipe technique.

**Metriques de performance** :
- Nombre de recommandations actionnables generees
- Couverture des 5 capabilities dans le livrable
- Ratio taches `success` vs `failed`

**Entrees** : `MarketingTask` (titre, description, priorite, contexte extrait de la carte Trello)
**Sorties** : `AgentResult` avec un `Deliverable` de type `document`, `report` ou `pull_request`

---

### 2.2 Content Strategist Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `content` |
| **Label Trello** | `blue` |
| **Mots-cles de routage** | `content`, `contenu`, `redaction` |
| **Capabilities** | `editorial_calendar`, `content_writing`, `content_audit`, `tone_of_voice`, `content_repurposing` |

**Prompt systeme** :
```
Tu es un directeur de contenu experimente. Tu concois et executes des strategies de contenu.

Tes competences :
- Creation de calendriers editoriaux
- Redaction d'articles, landing pages, newsletters
- Audit de contenu existant
- Definition de tone of voice et guidelines
- Repurposing de contenu cross-canal

Format de sortie : Tu produis du contenu pret a publier ou des strategies documentees
avec planning, KPIs et guidelines.
```

**Regles de decision** : Routage via labels `content`, `contenu`, `redaction` ou presence de ces mots dans le texte de la carte.

**Entrees** : Tache marketing avec contexte editorial (cible, ton, canal)
**Sorties** : Contenu publiable (articles, copies) ou strategie documentee avec calendrier

---

### 2.3 Paid Media Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `ads` |
| **Label Trello** | `red` |
| **Mots-cles de routage** | `ads`, `publicite`, `paid media` |
| **Capabilities** | `campaign_setup`, `ad_copywriting`, `budget_optimization`, `audience_targeting`, `performance_reporting` |

**Prompt systeme** :
```
Tu es un expert en media payant et acquisition digitale.

Tes competences :
- Conception de campagnes Google Ads, Meta Ads, LinkedIn Ads
- Redaction d'annonces et creatifs
- Optimisation de budgets et encheres
- Ciblage d'audiences et remarketing
- Reporting de performance et ROAS

Format de sortie : Tu produis des configurations de campagnes, des copies d'annonces,
des recommandations budgetaires et des rapports de performance.
```

**Regles de decision** : Routage si label contient `ads`, `publicite` ou `paid media`. Les cartes contenant `campagne` ou `campaign` dans le texte declenchent un `DeliverableType = campaign_config`, produisant un fichier JSON.

**Entrees** : Tache avec budget, cible, objectifs
**Sorties** : `campaign_config` (JSON) ou `report` (Markdown)

---

### 2.4 Analytics Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `analytics` |
| **Label Trello** | `orange` |
| **Mots-cles de routage** | `analytics`, `data` |
| **Capabilities** | `dashboard_creation`, `data_analysis`, `conversion_tracking`, `attribution_modeling`, `reporting` |

**Prompt systeme** :
```
Tu es un analyste marketing data-driven senior.

Tes competences :
- Configuration de tracking et analytics (GA4, GTM)
- Creation de dashboards et rapports automatises
- Analyse de funnels de conversion
- Modelisation d'attribution
- Analyse de cohortes et segmentation

Format de sortie : Tu produis des rapports d'analyse, des configurations de tracking,
des recommandations data-driven avec visualisations.
```

**Regles de decision** : Routage via labels `analytics` ou `data`. Les cartes contenant `rapport`, `report` ou `analyse` declenchent un `DeliverableType = report`.

**Entrees** : Tache avec metriques cibles, periodes d'analyse, KPIs
**Sorties** : `report` avec configurations de tracking et recommandations

---

### 2.5 Social Media Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `social` |
| **Label Trello** | `purple` |
| **Mots-cles de routage** | `social`, `reseaux sociaux` |
| **Capabilities** | `social_strategy`, `community_management`, `social_calendar`, `influencer_strategy`, `social_listening` |

**Prompt systeme** :
```
Tu es un expert en social media marketing.

Tes competences :
- Strategie social media multi-plateforme
- Creation de calendriers de publication
- Community management et engagement
- Strategie d'influence et partenariats
- Social listening et veille concurrentielle

Format de sortie : Tu produis des strategies sociales, des calendriers de publication,
des guidelines de community management et des rapports d'engagement.
```

**Entrees** : Tache avec plateformes cibles, objectifs, audience
**Sorties** : `document` (strategies, calendriers) ou `report` (analyses d'engagement)

---

### 2.6 Email Marketing Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `email` |
| **Label Trello** | `yellow` |
| **Mots-cles de routage** | `email`, `emailing`, `crm` |
| **Capabilities** | `email_campaigns`, `automation_workflows`, `segmentation`, `ab_testing`, `deliverability` |

**Prompt systeme** :
```
Tu es un expert en email marketing et marketing automation.

Tes competences :
- Conception de campagnes email (newsletters, promotionnels, transactionnels)
- Workflows d'automation et nurturing
- Segmentation et personnalisation
- A/B testing et optimisation
- Delivrabilite et conformite RGPD

Format de sortie : Tu produis des templates email, des workflows d'automation,
des strategies de segmentation et des rapports de performance email.
```

**Entrees** : Tache avec segments, objectifs de conversion, contraintes RGPD
**Sorties** : `document` (templates, workflows) ou `report` (performances)

---

### 2.7 Brand Strategy Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `brand` |
| **Label Trello** | `sky` |
| **Mots-cles de routage** | `brand`, `marque` |
| **Capabilities** | `brand_positioning`, `brand_guidelines`, `competitive_analysis`, `brand_messaging`, `brand_audit` |

**Prompt systeme** :
```
Tu es un stratege de marque senior.

Tes competences :
- Positionnement de marque et proposition de valeur
- Creation de brand guidelines
- Analyse concurrentielle et mapping
- Plateforme de marque et messaging
- Audit de perception de marque

Format de sortie : Tu produis des documents de strategie de marque, des guidelines,
des analyses concurrentielles et des recommandations de positionnement.
```

**Entrees** : Tache avec marche cible, concurrents, valeurs
**Sorties** : `document` (guidelines, positionnement) ou `review_request` (validation strategique)

---

### 2.8 Marketing Strategy Agent

| Propriete | Detail |
|-----------|--------|
| **Domaine** | `strategy` |
| **Label Trello** | `black` |
| **Mots-cles de routage** | `strategy`, `strategie` |
| **Capabilities** | `marketing_plan`, `budget_allocation`, `market_research`, `growth_strategy`, `okr_definition` |
| **Fallback** | **Cet agent est le domaine par defaut** si aucun autre domaine n'est detecte |

**Prompt systeme** :
```
Tu es un directeur marketing strategique senior.

Tes competences :
- Elaboration de plans marketing annuels
- Allocation budgetaire et ROI previsionnel
- Etudes de marche et analyse d'opportunites
- Strategie de croissance et Go-to-Market
- Definition d'OKRs marketing

Format de sortie : Tu produis des plans marketing structures, des analyses de marche,
des recommandations strategiques et des frameworks de decision.
```

**Regle specifique** : Si `detectDomain()` ne trouve aucune correspondance dans les labels ni dans le texte de la carte, le domaine retourne est `"strategy"` par defaut. Cet agent sert donc de filet de securite pour toute tache non classifiee.

**Entrees** : Tache a perimetre large (plan, budget, GTM, OKRs)
**Sorties** : `document` ou `review_request`

---

## 3. Fonctionnalites du systeme

### 3.1 Algorithme de routage intelligent

Le routage est execute par `TrelloClient.parseCard()` qui appelle `detectDomain()`. L'algorithme fonctionne en 3 passes :

```
detectDomain(card: TrelloCard) → AgentDomain
│
├─ PASSE 1 : Labels Trello
│   Pour chaque label de la carte :
│     label.name.toLowerCase() → lookup dans labelMap
│     labelMap = {
│       "seo" → seo,  "referencement" → seo,
│       "content" → content,  "contenu" → content,  "redaction" → content,
│       "ads" → ads,  "publicite" → ads,  "paid media" → ads,
│       "analytics" → analytics,  "data" → analytics,
│       "social" → social,  "reseaux sociaux" → social,
│       "email" → email,  "emailing" → email,  "crm" → email,
│       "brand" → brand,  "marque" → brand,
│       "strategy" → strategy,  "strategie" → strategy
│     }
│     Premier match → return domaine
│
├─ PASSE 2 : Analyse textuelle (fallback)
│   text = (card.name + " " + card.desc).toLowerCase()
│   Pour chaque (keyword, domain) du meme labelMap :
│     Si text.includes(keyword) → return domaine
│
└─ PASSE 3 : Default
    return "strategy"
```

**Detection du type de livrable** (`detectDeliverableType`) :

```
text = (card.name + " " + card.desc).toLowerCase()

Si contient "pull request" | "pr" | "code"    → pull_request
Si contient "review" | "valider"              → review_request
Si contient "rapport" | "report" | "analyse"  → report
Si contient "campagne" | "campaign"           → campaign_config
Sinon                                         → document
```

**Extraction de contexte** (`extractContext`) :

Parse les paires cle-valeur dans la description Trello au format :
```
**Cle** : Valeur
```
Regex : `/\*\*([^*]+)\*\*\s*:\s*(.+)/g`
Resultat : `Record<string, string>` injecte dans le prompt de l'agent.

---

### 3.2 Systeme de priorisation

La priorisation est executee en 2 etapes :

**Etape 1 — Detection de la priorite** (`detectPriority`) :

```
Pour chaque label de la carte :
  Si label.name contient "urgent"                    → urgent
  Si label.name contient "high" | "prioritaire"      → high
  Si label.name contient "low" | "bas"               → low

Si la carte a une date d'echeance (card.due) :
  daysUntilDue = (dueDate - now) / (1000×60×60×24)
  Si daysUntilDue < 1 jour                           → urgent
  Si daysUntilDue < 3 jours                          → high

Default                                              → medium
```

**Etape 2 — Tri dans l'orchestrateur** (`Orchestrator.poll`) :

```typescript
tasks.sort((a, b) => {
  const priority = { urgent: 0, high: 1, medium: 2, low: 3 };
  return priority[a.priority] - priority[b.priority];
});
```

Les taches `urgent` sont toujours traitees en premier. A priorite egale, l'ordre de retour de l'API Trello est conserve.

---

### 3.3 Gestion de l'execution concurrente

```
Orchestrator
  │
  ├─ running: Map<string, RunningTask>      // taches en cours
  ├─ maxConcurrentAgents: number            // default 3
  │
  └─ poll()
       availableSlots = maxConcurrentAgents - running.size
       Si availableSlots <= 0 → skip ("All agent slots occupied")
       tasks = tri par priorite
       toProcess = tasks.slice(0, availableSlots)
       Pour chaque task de toProcess :
         processTask(task)    // sequentiel dans la boucle
```

**Modele de concurrence** : Les taches d'un meme cycle de polling sont traitees **sequentiellement** via une boucle `for...of` avec `await`. La concurrence reelle se produit entre **cycles de polling** : si un agent est encore en cours d'execution lors du prochain cycle (30s plus tard), le slot est occupe et `availableSlots` est reduit.

**Cycle de vie d'une tache** :

```
processTask(task)
  ├─ Ajout dans running Map
  ├─ moveCard → "in_progress"
  ├─ agent.execute(task)
  │    ├─ Succes → handleResult()
  │    │            ├─ DeliverableManager.produce()
  │    │            ├─ addComment() sur Trello
  │    │            ├─ addChecklist() "Prochaines etapes"
  │    │            └─ moveCard → "review" | "done"
  │    │
  │    └─ Erreur → handleError()
  │                 ├─ addComment() avec message d'erreur
  │                 └─ moveCard → "todo" (retry possible)
  └─ Suppression de running Map (finally)
```

**Gestion d'erreur** : En cas d'echec d'un agent (erreur API Claude, timeout, parsing), la carte est remise dans "Todo" avec un commentaire d'erreur. Elle sera re-detectee au prochain cycle de polling, permettant un retry automatique.

---

### 3.4 Types de livrables produits

#### Document (`document`)

```
Chemin : ./output/deliverables/docs/{slug}.md
Format :
  # {title}
  > Genere par **{agent}** le {timestamp}
  > Domaine : {domain} | Tache : {taskId}
  ---
  {contenu genere par Claude}
```

#### Report (`report`)

```
Chemin : ./output/deliverables/reports/{slug}.md
Format : identique a document
```

#### Pull Request (`pull_request`)

```
Sequence d'appels GitHub API :
  1. GET  /repos/{owner}/{repo}                    → default_branch
  2. GET  /repos/{owner}/{repo}/git/ref/heads/{branch} → baseSha
  3. POST /repos/{owner}/{repo}/git/refs           → cree branche feature/{slug}
  4. PUT  /repos/{owner}/{repo}/contents/{path}    → commit du fichier .md
  5. POST /repos/{owner}/{repo}/pulls              → cree la PR

Titre PR : [{DOMAIN}] {deliverable.title}
Corps PR : Description + extrait du contenu (500 premiers caracteres)
Branche : feature/{slug}
Fichier : deliverables/{domain}/{slug}.md
```

#### Review Request (`review_request`)

```
Sequence :
  1. Ecriture du document localement (meme que document)
  2. POST /repos/{owner}/{repo}/issues
     Titre : [Review] {title}
     Labels : ["review", "{domain}"]
     Corps : Description + extrait du contenu (1000 premiers caracteres)
```

#### Campaign Config (`campaign_config`)

```
Chemin : ./output/deliverables/campaigns/{slug}.json
Format : Si le contenu Claude est du JSON valide → ecrit tel quel
         Sinon → enveloppe dans :
         {
           "title": "{title}",
           "generatedBy": "{agent}",
           "generatedAt": "{timestamp}",
           "config": "{contenu brut}"
         }
```

---

## 4. Cas d'usage d'orchestration

### 4.1 Pipeline SEO complet — Audit, optimisation, suivi

**Scenario** : Un responsable marketing veut auditer et optimiser le referencement d'un site e-commerce.

**Cartes Trello creees** :

| Carte | Label | Priorite | Type livrable |
|-------|-------|----------|---------------|
| "Audit technique SEO - site e-commerce" | `seo` (vert) + `urgent` | urgent | report |
| "Optimisation metas et Hn pages produits" | `seo` (vert) | high | pull_request |
| "Strategie backlinks Q2" | `seo` (vert) | medium | document |
| "Rapport suivi positions mensuel" | `seo` (vert) | low | report |

**Sequence d'intervention** :

```
Cycle 1 (T+0s)
│
├─ Orchestrator.poll()
│   ├─ Detecte 4 cartes dans Todo
│   ├─ Tri : urgent → high → medium → low
│   └─ Slots disponibles : 3
│
├─ Slot 1 : "Audit technique SEO"
│   ├─ SEO Agent execute avec systemPrompt SEO
│   ├─ Claude produit audit : Core Web Vitals, crawlabilite, structure
│   ├─ DeliverableManager.writeDocument() → ./output/deliverables/reports/audit-technique-seo-site-e-commerce.md
│   ├─ Trello : commentaire + checklist "Prochaines etapes"
│   └─ Carte → "Done"
│
├─ Slot 2 : "Optimisation metas et Hn"
│   ├─ SEO Agent execute
│   ├─ Claude produit les metas optimisees
│   ├─ DeliverableManager.createPullRequest()
│   │   ├─ Cree branche feature/optimisation-metas-et-hn-pages-produits
│   │   ├─ Commit fichier .md sur la branche
│   │   └─ Ouvre PR : "[SEO] Optimisation metas et Hn pages produits"
│   ├─ Trello : commentaire avec lien PR
│   └─ Carte → "Done"
│
├─ Slot 3 : "Strategie backlinks Q2"
│   ├─ SEO Agent execute
│   ├─ Claude produit strategie de netlinking
│   ├─ writeDocument() → ./output/deliverables/docs/strategie-backlinks-q2.md
│   └─ Carte → "Done"
│
Cycle 2 (T+30s)
│
└─ Slot 1 : "Rapport suivi positions mensuel"
    ├─ SEO Agent execute
    ├─ writeDocument() → ./output/deliverables/reports/rapport-suivi-positions-mensuel.md
    └─ Carte → "Done"
```

**Flux de donnees** :

```
Trello Card ──parseCard()──▶ MarketingTask{domain:"seo", priority:"urgent"}
     │
     ▼
SEO Agent ──callClaude()──▶ Anthropic API
     │                         │
     │                         ▼
     │                    Response structuree
     │                    (SUMMARY / TITLE / CONTENT / NEXT_STEPS)
     │
     ▼
AgentResult ──produce()──▶ Report .md / PR GitHub
     │
     ▼
Trello : Comment + Checklist + Move
```

**Points de decision automatises** :
- Priorite `urgent` → traite en premier (slot 1)
- Texte contient "rapport" → `DeliverableType = report`
- Texte contient "pr" ou "code" → `DeliverableType = pull_request`
- `status = "success"` → carte vers "Done"

**Livrables finaux** :
1. `./output/deliverables/reports/audit-technique-seo-site-e-commerce.md`
2. Pull Request GitHub "[SEO] Optimisation metas et Hn pages produits"
3. `./output/deliverables/docs/strategie-backlinks-q2.md`
4. `./output/deliverables/reports/rapport-suivi-positions-mensuel.md`

---

### 4.2 Lancement de campagne multicanal

**Scenario** : L'equipe marketing lance un nouveau produit et cree simultanement des taches sur tous les canaux.

**Cartes Trello creees** :

| Carte | Label | Routage | Type |
|-------|-------|---------|------|
| "Plan Go-to-Market nouveau produit" | `strategie` (noir) | Strategy Agent | review_request |
| "Campagne Google Ads lancement" | `ads` (rouge) | Paid Media Agent | campaign_config |
| "Calendrier social media lancement" | `social` (violet) | Social Media Agent | document |
| "Sequence email nurturing pre-lancement" | `email` (jaune) | Email Agent | document |
| "Landing page produit - contenu" | `contenu` (bleu) | Content Agent | pull_request |

**Sequence d'intervention** :

```
Cycle 1 — 3 slots disponibles
│
├─ Slot 1 : "Plan Go-to-Market"         → Strategy Agent
│   ├─ Produit plan GTM complet
│   ├─ DeliverableType = review_request
│   │   ├─ Ecrit document localement
│   │   └─ Cree GitHub Issue "[Review] Plan Go-to-Market nouveau produit"
│   │     Labels: ["review", "strategy"]
│   ├─ AgentResult.status = "needs_review"
│   └─ Carte Trello → "Review" (pas "Done" car needs_review)
│
├─ Slot 2 : "Campagne Google Ads"       → Paid Media Agent
│   ├─ Produit config campagne JSON
│   ├─ DeliverableType = campaign_config (detecte via "campagne")
│   ├─ writeCampaignConfig() → ./output/deliverables/campaigns/campagne-google-ads-lancement.json
│   └─ Carte → "Done"
│
└─ Slot 3 : "Calendrier social media"   → Social Media Agent
    ├─ Produit calendrier editorial social
    ├─ writeDocument() → ./output/deliverables/docs/calendrier-social-media-lancement.md
    └─ Carte → "Done"

Cycle 2 — 3 slots liberes
│
├─ Slot 1 : "Sequence email nurturing"  → Email Agent
│   ├─ Produit workflow d'automation
│   ├─ writeDocument() → ./output/deliverables/docs/sequence-email-nurturing-pre-lancement.md
│   └─ Carte → "Done"
│
└─ Slot 2 : "Landing page produit"      → Content Agent
    ├─ Produit contenu de landing page
    ├─ DeliverableType = pull_request (detecte via "contenu" + contexte)
    ├─ createPullRequest()
    │   └─ PR : "[CONTENT] Landing page produit - contenu"
    └─ Carte → "Done"
```

**Points de decision automatises** :
- "Plan GTM" → `review_request` (contient "valider" dans les habitudes) → carte vers "Review" et non "Done"
- "Campagne" dans le titre → `campaign_config` → sortie JSON
- Aucun keyword special → `document` par defaut

**Livrables finaux** :
1. GitHub Issue "[Review] Plan Go-to-Market" + document local
2. `./output/deliverables/campaigns/campagne-google-ads-lancement.json`
3. `./output/deliverables/docs/calendrier-social-media-lancement.md`
4. `./output/deliverables/docs/sequence-email-nurturing-pre-lancement.md`
5. Pull Request GitHub "[CONTENT] Landing page produit"

---

### 4.3 Reporting automatise periodique

**Scenario** : Chaque mois, l'equipe cree des cartes recurrentes pour generer les rapports de performance.

**Cartes Trello** :

| Carte | Label | Agent | Type |
|-------|-------|-------|------|
| "Rapport analytics mensuel - Janvier" | `analytics` (orange) | Analytics | report |
| "Rapport performance Ads - Janvier" | `ads` (rouge) | Paid Media | report |
| "Rapport engagement social - Janvier" | `social` (violet) | Social Media | report |
| "Rapport SEO positions - Janvier" | `seo` (vert) | SEO Specialist | report |

**Execution** :

```
Cycle 1 — Toutes les cartes contiennent "rapport" → DeliverableType = report
│
├─ Slot 1 : Analytics Agent → rapport-analytics-mensuel-janvier.md
├─ Slot 2 : Paid Media Agent → rapport-performance-ads-janvier.md
├─ Slot 3 : Social Media Agent → rapport-engagement-social-janvier.md
│
Cycle 2
└─ Slot 1 : SEO Agent → rapport-seo-positions-janvier.md

Tous les fichiers dans : ./output/deliverables/reports/
Toutes les cartes → "Done"
```

**Flux de donnees entre agents** : Dans cette version, les agents sont **independants** — il n'y a pas de flux de donnees direct entre agents. Chaque agent recoit uniquement le contexte de sa carte Trello. Pour creer des dependances (ex: le rapport Strategy consolide les autres rapports), il faudrait creer la carte Strategy apres les autres et injecter les resultats dans sa description via l'API Trello.

**Livrables finaux** :
1. `./output/deliverables/reports/rapport-analytics-mensuel-janvier.md`
2. `./output/deliverables/reports/rapport-performance-ads-janvier.md`
3. `./output/deliverables/reports/rapport-engagement-social-janvier.md`
4. `./output/deliverables/reports/rapport-seo-positions-janvier.md`

---

### 4.4 Refonte d'identite de marque

**Scenario** : Le directeur marketing lance un projet de rebranding complet.

**Cartes Trello** :

| Carte | Label | Priorite | Agent | Type |
|-------|-------|----------|-------|------|
| "Audit de marque et perception" | `marque` (sky) + `urgent` | urgent | Brand Strategy | review_request |
| "Nouveau positionnement et messaging" | `marque` (sky) + `high` | high | Brand Strategy | review_request |
| "Redefinition tone of voice" | `contenu` (bleu) | medium | Content Strategist | document |
| "Adaptation strategie reseaux sociaux" | `social` (violet) | medium | Social Media | document |
| "Plan de communication rebranding" | `strategie` (noir) | medium | Marketing Strategy | review_request |

**Sequence** :

```
Cycle 1
│
├─ Slot 1 : "Audit de marque" (urgent)
│   ├─ Brand Strategy Agent
│   ├─ DeliverableType = review_request (contient "valider" / "review")
│   ├─ Ecrit document + cree GitHub Issue
│   │   Issue : "[Review] Audit de marque et perception"
│   │   Labels : ["review", "brand"]
│   ├─ status = "needs_review"
│   └─ Carte → "Review"
│       ⚠ Necessite validation humaine avant de continuer
│
├─ Slot 2 : "Nouveau positionnement" (high)
│   ├─ Brand Strategy Agent
│   ├─ review_request → Issue GitHub
│   └─ Carte → "Review"
│
└─ Slot 3 : "Redefinition tone of voice" (medium)
    ├─ Content Strategist Agent
    ├─ document → ./output/deliverables/docs/redefinition-tone-of-voice.md
    └─ Carte → "Done"

Cycle 2
│
├─ Slot 1 : "Adaptation strategie reseaux sociaux"
│   ├─ Social Media Agent
│   ├─ document → fichier local
│   └─ Carte → "Done"
│
└─ Slot 2 : "Plan de communication rebranding"
    ├─ Marketing Strategy Agent
    ├─ review_request → Issue GitHub
    │   Labels : ["review", "strategy"]
    └─ Carte → "Review"
```

**Points de decision automatises** :
- `review_request` → `AgentResult.status = "needs_review"` → carte vers **"Review"** (pas "Done")
- Cela cree un point de blocage humain : l'equipe doit valider sur GitHub et deplacer manuellement la carte vers "Done"
- Les taches `document` vont directement en "Done"

**Livrables finaux** :
1. GitHub Issue "[Review] Audit de marque" + document local
2. GitHub Issue "[Review] Nouveau positionnement" + document local
3. `./output/deliverables/docs/redefinition-tone-of-voice.md`
4. `./output/deliverables/docs/adaptation-strategie-reseaux-sociaux.md`
5. GitHub Issue "[Review] Plan de communication rebranding" + document local

---

### 4.5 Optimisation continue basee sur les performances

**Scenario** : L'orchestrateur tourne en continu. L'equipe ajoute des cartes au fil de l'eau et le systeme les traite automatiquement.

**Timeline** :

```
09:00:00  Orchestrator.start()
          ├─ Trello.initialize() → mappe les listes du board
          ├─ poll() initial → 0 tache
          └─ setInterval(poll, 30000)

09:00:30  poll() → 0 tache

09:01:00  L'equipe cree :
          "Optimiser landing page conversion"  [seo] [urgent, due: aujourd'hui]
          "A/B test objet email welcome"       [email]

09:01:30  poll()
          ├─ Detecte 2 cartes
          ├─ Priorite : "Optimiser landing" = urgent (due < 1 jour)
          │             "A/B test email" = medium (default)
          ├─ Tri : urgent en premier
          ├─ Slot 1 : SEO Agent → "Optimiser landing page"
          │   ├─ moveCard → "In Progress"
          │   ├─ callClaude() ...
          │   ├─ writeDocument() → report
          │   ├─ addComment() + addChecklist()
          │   └─ moveCard → "Done"
          │
          └─ Slot 2 : Email Agent → "A/B test objet email"
              ├─ moveCard → "In Progress"
              ├─ callClaude() ...
              ├─ writeDocument() → document
              └─ moveCard → "Done"

09:02:00  poll() → 0 tache (les 2 precedentes sont terminees)

09:05:00  L'equipe cree :
          "Analyse ROI campagne Meta Q1"  [analytics] [rapport]

09:05:30  poll()
          └─ Slot 1 : Analytics Agent → "Analyse ROI campagne Meta Q1"
              ├─ DeliverableType = report (contient "rapport"/"analyse")
              └─ → ./output/deliverables/reports/analyse-roi-campagne-meta-q1.md

09:06:00  poll() → 0 tache

          ... (continue indefiniment jusqu'a SIGINT/SIGTERM)

Ctrl+C
          ├─ process.on("SIGINT", shutdown)
          ├─ orchestrator.stop()  →  clearInterval(pollTimer)
          └─ process.exit(0)
```

**Mecanisme de retry automatique** :

```
09:10:00  Nouvelle carte "Rapport performance SEO"

09:10:30  poll()
          └─ SEO Agent → callClaude() → ERREUR 429 (rate limit)
              ├─ handleError()
              │   ├─ addComment() : "❌ Erreur : Claude API error: 429"
              │   └─ moveCard → "Todo"  (retour dans la file)
              └─ running.delete()

09:11:00  poll()
          └─ Re-detecte la carte dans "Todo"
              └─ SEO Agent → callClaude() → succes cette fois
                  └─ Carte → "Done"
```

---

## 5. Installation et configuration

```bash
git clone https://github.com/girardmaxime33000/claude.git
cd claude
npm install
cp .env.example .env
```

### Variables d'environnement

**Requises** :

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Cle API Anthropic (Claude) |
| `TRELLO_API_KEY` | Cle API Trello |
| `TRELLO_TOKEN` | Token Trello |
| `TRELLO_BOARD_ID` | ID du board Trello |
| `GITHUB_TOKEN` | Token GitHub |
| `GITHUB_OWNER` | Proprietaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |

**Optionnelles** :

| Variable | Default | Description |
|----------|---------|-------------|
| `POLL_INTERVAL_MS` | `30000` | Intervalle de polling (ms) |
| `MAX_CONCURRENT_AGENTS` | `3` | Agents en parallele max |
| `AUTO_ASSIGN` | `true` | Attribution automatique |

### Commandes

```bash
npm start                      # Polling continu (production)
npm run dev                    # Watch mode (dev)
npm run agent:run <card-id>    # Executer une carte specifique
npm run agent:poll             # Un seul cycle de polling
npm run agent:status           # Taches en cours
tsx src/cli.ts agents          # Lister les 8 agents
```

### Configuration du board Trello

Le systeme mappe automatiquement les listes par nom (FR et EN) :

| Stage | Noms reconnus |
|-------|---------------|
| `backlog` | `backlog` |
| `todo` | `a faire`, `todo`, `to do` |
| `in_progress` | `en cours`, `in progress`, `in_progress` |
| `review` | `review`, `en review`, `a valider` |
| `done` | `done`, `termine`, `fait` |

---

## 6. Reference technique

### Stack

| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js ES2022 |
| Langage | TypeScript 5.5 |
| Modele IA | `claude-sonnet-4-20250514` (4096 tokens) |
| Gestion taches | Trello REST API v1 |
| Code review | GitHub REST API v3 |
| Tests | Vitest |
| Linting | ESLint 9 |

### Structure du projet

```
src/
├── index.ts                 # Entrypoint — polling continu + graceful shutdown
├── cli.ts                   # CLI : run, poll, status, agents
├── agents/
│   └── base-agent.ts        # MarketingAgent : buildPrompt, callClaude, parseDeliverable
├── config/
│   ├── types.ts             # Types TS : AgentDomain, MarketingTask, Deliverable, etc.
│   ├── loader.ts            # loadConfig() : validation env vars
│   └── agents.ts            # AGENT_DEFINITIONS[] + AGENT_MAP
├── orchestrator/
│   └── orchestrator.ts      # Orchestrator : poll, processTask, handleResult/Error
├── deliverables/
│   └── manager.ts           # DeliverableManager : produce, writeDoc, createPR, createIssue
└── trello/
    └── client.ts            # TrelloClient : CRUD cartes, parseCard, detectDomain/Priority
```

---

## Licence

Projet prive — girardmaxime33000
