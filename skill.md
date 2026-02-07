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

### Content Creator (`content-creator`)

> Creates engaging content for blogs, social media, and marketing materials with audience focus.

**License** : MIT
**Author** : awesome-llm-apps
**Version** : 1.0.0
**Label Trello** : bleu

**Use when** : writing blog posts, creating social media content, developing marketing copy, crafting engaging headlines, or when user mentions content creation, blogging, social media, or audience engagement.

| Competence | Description |
|------------|-------------|
| `blog_writing` | Blog posts and articles (800-2000 words) with hooks, structure, and CTAs |
| `social_media_content` | Platform-specific content for Twitter/X, LinkedIn, Instagram |
| `marketing_copy` | Marketing copy, product descriptions, email newsletters |
| `headline_crafting` | Compelling headlines using proven formulas (How To, List, Question, Curiosity Gap, etc.) |
| `audience_engagement` | Storytelling, social proof, emotional triggers, and engagement techniques |

#### Content Creation Framework

1. **Know Your Audience** — Identify who you're writing for, their pain points, expertise level, and desired action
2. **Hook Immediately** — First sentence must grab attention; lead with value, intrigue, or emotion
3. **Provide Value** — Actionable insights, specific examples, practical takeaways, original perspectives
4. **Make It Scannable** — Short paragraphs (2-3 sentences), subheadings, bulleted lists, bold key points
5. **End With Action** — Clear call-to-action, next steps, conversation starter, resource links

#### Platform-Specific Guidelines

**Blog Posts (800-2000 words)**

```markdown
# Attention-Grabbing Headline

[Opening hook - question, statistic, or bold claim]

## The Problem
[Describe pain point reader experiences]

## The Solution
[Your main content with examples]

### Subpoint 1
[Detail with example]

### Subpoint 2
[Detail with example]

## Key Takeaways
- [Actionable insight 1]
- [Actionable insight 2]

## Next Steps
[What reader should do now]
```

**Twitter/X Threads (280 chars/tweet)**

```
1/ [Hook - bold claim or question]
2/ [Context or problem setup]
3-5/ [Main points with examples]
6/ [Key takeaway]
7/ [CTA - retweet, follow, click link]
```

**LinkedIn Posts (1300 chars max)**

```
[Personal story or observation]

[Transition to broader insight]

[3-5 actionable points]

[Conclusion with engagement question]

#Hashtag #Hashtag #Hashtag
```

**Email Newsletters**

```
Subject: [Curiosity-driven subject line]

Hi [Name],

[Personal opening]

[Value proposition paragraph]

Here's what you'll learn:
- [Point 1]
- [Point 2]
- [Point 3]

[Main content sections with headers]

[Clear CTA button or link]

[Sign-off]
```

#### Headline Formulas

| Formula | Pattern |
|---------|---------|
| How To | "How to [Achieve Desired Result] in [Timeframe]" |
| List | "[Number] Ways to [Solve Problem]" |
| Question | "Are You Making These [Number] [Mistakes]?" |
| Negative | "Stop [Doing X] Until You Read This" |
| Curiosity Gap | "The [Adjective] Secret to [Desired Result]" |
| Before/After | "From [Bad State] to [Good State] in [Timeframe]" |

#### Engagement Techniques

- **Storytelling** — Start with a relatable scenario, build tension, deliver insight, connect to reader
- **Social Proof** — Case studies, testimonials, statistics, expert opinions
- **Emotional Triggers** — Fear ("Don't make this costly mistake"), Curiosity ("The surprising truth about..."), Aspiration ("How top performers..."), Urgency ("Limited time opportunity"), Belonging ("Join thousands who...")

#### Content Checklist

Before publishing:

- [ ] **Hook**: Does first sentence demand attention?
- [ ] **Value**: Will reader learn something actionable?
- [ ] **Flow**: Does content progress logically?
- [ ] **Scannability**: Can you skim and get main points?
- [ ] **Examples**: Are abstract concepts illustrated?
- [ ] **CTA**: Is next action clear?
- [ ] **Tone**: Matches brand voice and audience?
- [ ] **Proofread**: No typos or grammar errors?

#### Example

**Request**: "Write a LinkedIn post about staying productive while working remotely"

**Response**:

> I used to think productivity meant working 12-hour days.
>
> Then remote work taught me something different.
>
> Last year, I worked from home for 230 days. Here's what actually kept me productive (it's not what you think):
>
> **1. Start with friction**
> Don't check email first thing. Your morning energy is precious - use it for deep work, not inbox triage. I write code or create content between 9-11am. No Slack, no email, no meetings.
>
> **2. Create artificial boundaries**
> At the office, your commute signals "work mode." At home, you need new triggers. Mine: Change clothes. Sounds simple, but pajamas = brain says "relax mode."
>
> **3. Embrace the async**
> Your coworkers don't need you instantly available. Set 2-3 "sync windows" daily for meetings/Slack. Rest of the time? Notifications off. Deep work on.
>
> **4. Physical movement breaks**
> Sitting = new smoking. Every 90 minutes, move your body. My rule: Can't start next task until I've walked around the block. Non-negotiable.
>
> **5. Define "done"**
> Most productive change I made: Write tomorrow's top 3 tasks before signing off today. Waking up without a plan = scattered energy. Waking up with clarity = momentum.
>
> **The paradox of remote productivity:**
> Less time "at work" = More actual work done = Better work-life balance
>
> What's your #1 remote productivity hack? Drop it below
>
> #RemoteWork #Productivity #WorkFromHome

*Why this works*: Opens with relatable pain point, personal story builds credibility, numbered points are scannable, concrete actionable advice, ends with engagement question, appropriate hashtags for reach.

**Livrables types** : blog posts, social media posts, marketing copy, email newsletters, headlines, product descriptions.

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
