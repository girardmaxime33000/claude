# Skills — AI Marketing Agents

Reference des competences et capacites de chaque agent du systeme multi-agents marketing.

---

## Vue d'ensemble

Le systeme dispose de **8 agents specialises**, chacun couvrant un domaine du marketing digital. Ils sont orchestres via Trello et executes par Claude (Anthropic). Chaque agent recoit une tache, l'analyse et produit un livrable actionnable.

---

## Agents et competences

### SEO Specialist (`seo`)

**Label Trello** : vert

| Competence | Description |
|------------|-------------|
| `keyword_research` | Recherche et analyse de mots-cles (volume, difficulte, intention de recherche) |
| `technical_audit` | Audit technique SEO — Core Web Vitals, crawlabilite, structure du site |
| `content_optimization` | Optimisation on-page : titres, metas, structure Hn, maillage interne |
| `competitor_analysis` | Analyse concurrentielle SEO (positions, domaines referents, gaps) |
| `backlink_strategy` | Strategie de netlinking et acquisition de backlinks |

**Livrables types** : audits techniques, listes de mots-cles priorises, plans d'optimisation on-page.

---

### Content Strategist (`content`)

**Label Trello** : bleu

| Competence | Description |
|------------|-------------|
| `editorial_calendar` | Creation de calendriers editoriaux multi-canaux |
| `content_writing` | Redaction d'articles, landing pages, newsletters |
| `content_audit` | Audit de contenu existant (qualite, performance, gaps) |
| `tone_of_voice` | Definition de tone of voice et guidelines editoriales |
| `content_repurposing` | Adaptation de contenu cross-canal (blog → social, video → article, etc.) |

**Livrables types** : articles prets a publier, calendriers editoriaux, guidelines de contenu.

---

### Paid Media (`ads`)

**Label Trello** : rouge

| Competence | Description |
|------------|-------------|
| `campaign_setup` | Conception de campagnes Google Ads, Meta Ads, LinkedIn Ads |
| `ad_copywriting` | Redaction d'annonces et creatifs publicitaires |
| `budget_optimization` | Optimisation de budgets, encheres et allocation |
| `audience_targeting` | Ciblage d'audiences, remarketing, lookalikes |
| `performance_reporting` | Reporting de performance, ROAS, CPA, CTR |

**Livrables types** : configurations de campagnes (JSON), copies d'annonces, rapports de performance.

---

### Analytics (`analytics`)

**Label Trello** : orange

| Competence | Description |
|------------|-------------|
| `dashboard_creation` | Creation de dashboards et rapports automatises |
| `data_analysis` | Analyse de donnees marketing, tendances, anomalies |
| `conversion_tracking` | Configuration de tracking, funnels de conversion |
| `attribution_modeling` | Modelisation d'attribution multi-touch |
| `reporting` | Rapports periodiques avec KPIs et recommandations |

**Livrables types** : rapports d'analyse, configurations de tracking, dashboards.

---

### Social Media (`social`)

**Label Trello** : violet

| Competence | Description |
|------------|-------------|
| `social_strategy` | Strategie social media multi-plateforme |
| `community_management` | Guidelines de community management, templates de reponse |
| `social_calendar` | Calendriers de publication avec contenus et visuels |
| `influencer_strategy` | Strategie d'influence, identification de partenaires |
| `social_listening` | Veille concurrentielle et social listening |

**Livrables types** : strategies sociales, calendriers de publication, rapports d'engagement.

---

### Email Marketing (`email`)

**Label Trello** : jaune

| Competence | Description |
|------------|-------------|
| `email_campaigns` | Conception de campagnes email (newsletters, promos, transactionnels) |
| `automation_workflows` | Workflows d'automation et sequences de nurturing |
| `segmentation` | Segmentation d'audiences et personnalisation |
| `ab_testing` | Strategies d'A/B testing (sujets, contenus, CTA) |
| `deliverability` | Optimisation de deliverabilite et conformite RGPD |

**Livrables types** : templates email, workflows d'automation, strategies de segmentation.

---

### Brand Strategy (`brand`)

**Label Trello** : ciel

| Competence | Description |
|------------|-------------|
| `brand_positioning` | Positionnement de marque et proposition de valeur |
| `brand_guidelines` | Creation de brand guidelines (ton, visuels, messaging) |
| `competitive_analysis` | Analyse concurrentielle et mapping de positionnement |
| `brand_messaging` | Plateforme de marque, messages cles, taglines |
| `brand_audit` | Audit de perception de marque |

**Livrables types** : documents de strategie de marque, guidelines, analyses concurrentielles.

---

### Marketing Strategy (`strategy`)

**Label Trello** : noir

| Competence | Description |
|------------|-------------|
| `marketing_plan` | Elaboration de plans marketing annuels/trimestriels |
| `budget_allocation` | Allocation budgetaire et ROI previsionnel |
| `market_research` | Etudes de marche et analyse d'opportunites |
| `growth_strategy` | Strategie de croissance et Go-to-Market |
| `okr_definition` | Definition d'OKRs et KPIs marketing |

**Livrables types** : plans marketing, analyses de marche, recommandations strategiques.

---

## Types de livrables

Chaque agent peut produire les formats suivants selon la tache :

| Type | Format | Usage |
|------|--------|-------|
| `document` | Markdown | Documents structures avec metadonnees |
| `report` | Markdown | Rapports d'analyse detailles |
| `pull_request` | GitHub PR | Branche + commit + PR formatee |
| `review_request` | GitHub Issue | Issue avec label "review" |
| `campaign_config` | JSON | Configuration de campagne structuree |

---

## Routage des taches

L'orchestrateur assigne automatiquement les taches aux agents en analysant :

1. **Labels Trello** — La couleur du label determine le domaine
2. **Mots-cles** — Le titre et la description sont parses pour detecter le domaine
3. **Type de livrable** — Le format attendu peut orienter vers un agent specifique

### Priorites

Les taches sont traitees dans l'ordre : `urgent` > `high` > `medium` > `low`.

### Concurrence

Jusqu'a `MAX_CONCURRENT_AGENTS` (defaut : 3) agents en parallele. Les taches supplementaires sont mises en file d'attente.

---

## Generation inter-agents

A partir d'un objectif de haut niveau, le systeme decompose automatiquement la tache et genere des prompts specialises pour chaque agent concerne.

```bash
# Generer et creer les cartes automatiquement
npm run agent:generate "Lancer une campagne de notoriete pour notre produit SaaS"

# Previsualiser sans creer de cartes
npm run agent:preview "Ameliorer notre strategie email marketing"
```

Chaque prompt genere contient :
- Les instructions specifiques pour l'agent cible
- Le contexte necessaire
- Le type de livrable attendu
- Les criteres d'acceptation
