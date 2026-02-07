import type {
  AgentDomain,
  GeneratedPrompt,
  PromptGenerationRequest,
  DeliverableType,
} from "../config/types.js";
import { AGENT_DEFINITIONS, AGENT_MAP } from "../config/agents.js";
import { secureFetchOk, RateLimiter } from "../utils/http.js";
import { isValidDomain, isValidDeliverableType } from "../utils/validator.js";

/**
 * Shared rate limiter for Claude API calls from the prompt generator.
 */
const claudeRateLimiter = new RateLimiter(5, 2);

/**
 * Generates structured prompts and instructions that one agent
 * can use to delegate work to other agents via Trello cards.
 *
 * SECURITY patches applied:
 * - HAUTE-02: Rate limiting on Claude API calls
 * - HAUTE-05: Timeouts on all HTTP requests
 * - MOYENNE-04: Domain validation in parsed responses
 */
export class PromptGenerator {
  private anthropicApiKey: string;

  constructor(anthropicApiKey: string) {
    this.anthropicApiKey = anthropicApiKey;
  }

  async generateFromObjective(
    request: PromptGenerationRequest
  ): Promise<GeneratedPrompt[]> {
    const targetDomains = request.targetDomains?.length
      ? request.targetDomains
      : this.detectRelevantDomains(request.objective);

    const agentDescriptions = targetDomains
      .map((domain) => {
        const def = AGENT_MAP.get(domain);
        if (!def) return null;
        return `- **${def.name}** (${domain}): ${def.description}. Capacités: ${def.capabilities.join(", ")}`;
      })
      .filter(Boolean)
      .join("\n");

    const contextBlock = request.context
      ? Object.entries(request.context)
          .map(([k, v]) => `- **${k}**: ${v}`)
          .join("\n")
      : "Aucun contexte additionnel.";

    const metaPrompt = `Tu es un chef de projet marketing IA. Tu dois décomposer un objectif en tâches concrètes assignées à des agents spécialisés.

## Objectif à décomposer
${request.objective}

## Contexte
${contextBlock}

## Agents disponibles
${agentDescriptions}

## Instructions
Pour CHAQUE agent concerné, génère un bloc structuré avec exactement ce format (un bloc par agent) :

---TASK_START---
TARGET_DOMAIN: <domain>
TITLE: <titre court et actionnable de la tâche>
DELIVERABLE_TYPE: <document|pull_request|review_request|report|campaign_config>
INSTRUCTIONS:
<Instructions détaillées et spécifiques pour l'agent. Inclure :
- Ce qu'il doit produire exactement
- Les contraintes et standards à respecter
- Les données ou inputs disponibles
- Le format de sortie attendu>
CONTEXT_KEY_VALUES:
<key1>: <value1>
<key2>: <value2>
ACCEPTANCE_CRITERIA:
- <critère 1>
- <critère 2>
- <critère 3>
---TASK_END---

Génère uniquement les tâches pertinentes. Sois précis et actionnable.`;

    const response = await this.callClaude(metaPrompt);
    return this.parseGeneratedPrompts(response);
  }

  async generateForAgent(
    domain: AgentDomain,
    objective: string,
    context?: Record<string, string>
  ): Promise<GeneratedPrompt> {
    const agentDef = AGENT_MAP.get(domain);
    if (!agentDef) {
      throw new Error(`Unknown agent domain: ${domain}`);
    }

    const contextBlock = context
      ? Object.entries(context)
          .map(([k, v]) => `- **${k}**: ${v}`)
          .join("\n")
      : "Aucun contexte additionnel.";

    const metaPrompt = `Tu es un chef de projet. Tu dois rédiger des instructions précises pour un agent spécialisé.

## Agent cible
**${agentDef.name}** — ${agentDef.description}
Capacités : ${agentDef.capabilities.join(", ")}

## Objectif
${objective}

## Contexte
${contextBlock}

## Instructions
Génère un bloc structuré :

TITLE: <titre court et actionnable>
DELIVERABLE_TYPE: <document|pull_request|review_request|report|campaign_config>
INSTRUCTIONS:
<Instructions complètes et détaillées pour l'agent. Sois très spécifique sur :
- Le livrable attendu
- Le format et la structure
- Les données à utiliser
- Les standards de qualité>
ACCEPTANCE_CRITERIA:
- <critère 1>
- <critère 2>
- <critère 3>`;

    const response = await this.callClaude(metaPrompt);
    return this.parseSinglePrompt(domain, response);
  }

  buildFromTemplate(
    domain: AgentDomain,
    template: PromptTemplate,
    variables: Record<string, string>
  ): GeneratedPrompt {
    const agentDef = AGENT_MAP.get(domain);
    if (!agentDef) {
      throw new Error(`Unknown agent domain: ${domain}`);
    }

    let instructions = PROMPT_TEMPLATES[template] ?? template;
    let title = template.replace(/_/g, " ");

    for (const [key, value] of Object.entries(variables)) {
      instructions = instructions.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      title = title.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    return {
      targetDomain: domain,
      title,
      instructions,
      context: variables,
      expectedDeliverable: this.inferDeliverableType(template),
      acceptanceCriteria: this.defaultCriteria(domain),
    };
  }

  private detectRelevantDomains(objective: string): AgentDomain[] {
    const text = objective.toLowerCase();
    const domains: AgentDomain[] = [];

    const domainKeywords: Record<AgentDomain, string[]> = {
      seo: ["seo", "référencement", "mots-clés", "keywords", "backlink", "search"],
      content: ["contenu", "content", "article", "blog", "rédaction", "editorial"],
      ads: ["ads", "publicité", "campagne", "google ads", "meta ads", "paid"],
      analytics: ["analytics", "data", "dashboard", "tracking", "kpi", "metrics"],
      social: ["social", "réseaux sociaux", "instagram", "linkedin", "tiktok", "community"],
      email: ["email", "newsletter", "emailing", "crm", "automation", "nurturing"],
      brand: ["marque", "brand", "identité", "positionnement", "logo", "charte"],
      strategy: ["stratégie", "strategy", "plan", "budget", "growth", "marché"],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((kw) => text.includes(kw))) {
        domains.push(domain as AgentDomain);
      }
    }

    if (domains.length === 0) {
      domains.push("strategy");
    }

    return domains;
  }

  /**
   * Parse Claude's multi-task response into GeneratedPrompt[].
   * SECURITY: Validates domains and deliverable types (MOYENNE-04).
   */
  private parseGeneratedPrompts(response: string): GeneratedPrompt[] {
    const prompts: GeneratedPrompt[] = [];
    const taskBlocks = response.split("---TASK_START---").slice(1);

    for (const block of taskBlocks) {
      const content = block.split("---TASK_END---")[0] ?? block;

      const rawDomain = this.extractField(content, "TARGET_DOMAIN");
      const title = this.extractField(content, "TITLE");
      const rawDeliverableType = this.extractField(content, "DELIVERABLE_TYPE");
      const instructions = this.extractMultilineField(content, "INSTRUCTIONS");
      const contextLines = this.extractMultilineField(content, "CONTEXT_KEY_VALUES");
      const criteriaText = this.extractMultilineField(content, "ACCEPTANCE_CRITERIA");

      if (!title) continue;

      // MOYENNE-04: Validate domain
      if (!isValidDomain(rawDomain)) {
        console.warn(`[security] Invalid domain "${rawDomain}" in generated prompt, skipping.`);
        continue;
      }
      const domain = rawDomain;

      // Validate deliverable type with fallback
      const deliverableType: DeliverableType = isValidDeliverableType(rawDeliverableType)
        ? rawDeliverableType
        : "document";

      const context: Record<string, string> = {};
      for (const line of contextLines.split("\n")) {
        const match = /^([^:]+):\s*(.+)$/.exec(line.trim());
        if (match) {
          context[match[1].trim()] = match[2].trim();
        }
      }

      const acceptanceCriteria = criteriaText
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter(Boolean);

      prompts.push({
        targetDomain: domain,
        title,
        instructions,
        context,
        expectedDeliverable: deliverableType,
        acceptanceCriteria,
      });
    }

    return prompts;
  }

  private parseSinglePrompt(
    domain: AgentDomain,
    response: string
  ): GeneratedPrompt {
    const title = this.extractField(response, "TITLE") || "Tâche générée";
    const rawDeliverableType = this.extractField(response, "DELIVERABLE_TYPE");
    const instructions = this.extractMultilineField(response, "INSTRUCTIONS");
    const criteriaText = this.extractMultilineField(response, "ACCEPTANCE_CRITERIA");

    const deliverableType: DeliverableType = isValidDeliverableType(rawDeliverableType)
      ? rawDeliverableType
      : "document";

    const acceptanceCriteria = criteriaText
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);

    return {
      targetDomain: domain,
      title,
      instructions: instructions || response,
      context: {},
      expectedDeliverable: deliverableType,
      acceptanceCriteria,
    };
  }

  private extractField(text: string, field: string): string {
    const regex = new RegExp(`^${field}:\\s*(.+)$`, "m");
    return regex.exec(text)?.[1]?.trim() ?? "";
  }

  private extractMultilineField(text: string, field: string): string {
    const regex = new RegExp(
      `${field}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z_]+:|---TASK_END---|$)`,
      "m"
    );
    return regex.exec(text)?.[1]?.trim() ?? "";
  }

  /**
   * Call Claude API with rate limiting and timeout.
   * SECURITY: Rate-limited (HAUTE-02), timeout enforced (HAUTE-05).
   */
  private async callClaude(prompt: string): Promise<string> {
    await claudeRateLimiter.acquire();

    const response = await secureFetchOk(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system:
            "Tu es un chef de projet marketing IA expert. Tu décomposes des objectifs en tâches précises et actionnables pour des agents spécialisés.",
          messages: [{ role: "user", content: prompt }],
        }),
        timeoutMs: 120_000,
      }
    );

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  private inferDeliverableType(template: string): DeliverableType {
    if (template.includes("report") || template.includes("audit")) return "report";
    if (template.includes("campaign")) return "campaign_config";
    return "document";
  }

  private defaultCriteria(domain: AgentDomain): string[] {
    return [
      "Le livrable est complet et actionnable",
      `Le contenu est pertinent pour le domaine ${domain}`,
      "Les recommandations sont priorisées",
    ];
  }
}

// ============================================================
// Prompt Templates
// ============================================================

export type PromptTemplate =
  | "seo_audit"
  | "content_calendar"
  | "ad_campaign"
  | "analytics_report"
  | "social_strategy"
  | "email_sequence"
  | "brand_guidelines"
  | "marketing_plan";

const PROMPT_TEMPLATES: Record<string, string> = {
  seo_audit: `Réalise un audit SEO complet pour {{target}}.

Inclure :
1. Analyse technique (Core Web Vitals, crawlabilité, indexation)
2. Analyse on-page (titres, métas, structure Hn, contenu)
3. Analyse off-page (backlinks, autorité de domaine)
4. Recherche de mots-clés (top 20 opportunités)
5. Analyse concurrentielle (3 concurrents principaux)
6. Plan d'action priorisé avec estimation d'impact

Format : rapport structuré avec tableaux et recommandations actionnables.`,

  content_calendar: `Crée un calendrier éditorial pour {{period}} pour {{target}}.

Inclure :
1. Thématiques principales alignées avec la stratégie
2. {{frequency}} publications planifiées
3. Pour chaque contenu : titre, format, canal, mots-clés cibles, CTA
4. Mix de contenus (éducatif, promotionnel, engagement)
5. Dates de publication optimales
6. KPIs de suivi par contenu

Format : tableau éditorial complet prêt à l'usage.`,

  ad_campaign: `Conçois une campagne publicitaire pour {{objective}}.

Inclure :
1. Stratégie de campagne (objectif, KPIs, budget recommandé)
2. Ciblage d'audience (personas, segments, remarketing)
3. 3 variantes d'annonces (titre, description, CTA)
4. Structure de campagne (groupes d'annonces, mots-clés)
5. Recommandations d'enchères et de budget
6. Plan de test A/B

Format : configuration de campagne prête à l'implémentation.`,

  analytics_report: `Produis un rapport d'analyse pour {{target}} sur la période {{period}}.

Inclure :
1. Vue d'ensemble des KPIs principaux
2. Analyse du trafic (sources, tendances, segments)
3. Analyse de conversion (funnel, taux, points de friction)
4. Comparaison période précédente
5. Insights clés et anomalies détectées
6. Recommandations data-driven

Format : rapport avec métriques, graphiques et recommandations.`,

  social_strategy: `Élabore une stratégie social media pour {{target}}.

Inclure :
1. Audit de présence actuelle
2. Stratégie par plateforme ({{platforms}})
3. Calendrier de publication type (semaine)
4. Guidelines de ton et de contenu
5. Stratégie d'engagement et community management
6. KPIs et outils de suivi

Format : document stratégique complet avec guidelines.`,

  email_sequence: `Crée une séquence email pour {{objective}}.

Inclure :
1. Stratégie de la séquence (objectif, audience, durée)
2. {{email_count}} emails détaillés (objet, contenu, CTA, timing)
3. Logique de segmentation et personnalisation
4. Triggers et conditions d'envoi
5. Plan de test A/B (objets, CTAs)
6. Métriques de suivi

Format : séquence email complète prête à l'implémentation.`,

  brand_guidelines: `Crée les guidelines de marque pour {{target}}.

Inclure :
1. Positionnement et proposition de valeur
2. Personnalité de marque (archétype, traits)
3. Tone of voice et guidelines rédactionnelles
4. Guidelines visuelles (couleurs, typo, imagerie)
5. Do's and Don'ts
6. Exemples d'application par canal

Format : charte de marque structurée et illustrée.`,

  marketing_plan: `Élabore un plan marketing pour {{target}} pour {{period}}.

Inclure :
1. Analyse de situation (SWOT, marché, concurrence)
2. Objectifs SMART et OKRs
3. Stratégie par canal (acquisition, rétention, notoriété)
4. Budget prévisionnel et allocation
5. Planning de déploiement
6. Tableau de bord et KPIs de suivi

Format : plan marketing complet avec chiffres et planning.`,
};
