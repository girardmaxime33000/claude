export type Locale = "fr" | "en";

export interface Translations {
  // CLI general
  cli: {
    unknownCommand: string;
    agentsTitle: string;
    agentDomain: string;
    agentPromptPrefix: string;
    agentCapabilities: string;
    statusTitle: string;
    statusEmpty: string;
    statusRunning: string;
    statusDuration: string;
    pollStart: string;
    pollComplete: string;
    pollNoTask: string;
    runStart: string;
    runComplete: string;
    runError: string;
    cardCreated: string;
    cardError: string;
    generateStart: string;
    generateComplete: string;
    generateError: string;
    previewTitle: string;
    previewCard: string;
    previewDomain: string;
    previewInstructions: string;
    previewDeliverable: string;
    previewCriteria: string;
  };

  // Orchestrator
  orchestrator: {
    starting: string;
    polling: string;
    dispatching: string;
    taskComplete: string;
    taskError: string;
    shutdown: string;
    maxConcurrent: string;
    queuedTask: string;
    slotFree: string;
  };

  // Deliverables
  deliverables: {
    created: string;
    prCreated: string;
    issueCreated: string;
    error: string;
  };

  // Errors
  errors: {
    missingConfig: string;
    invalidDomain: string;
    rateLimited: string;
    timeout: string;
    notFound: string;
    unauthorized: string;
  };
}

const fr: Translations = {
  cli: {
    unknownCommand: "Commande inconnue",
    agentsTitle: "Agents disponibles",
    agentDomain: "Domaine",
    agentPromptPrefix: "Prompt système",
    agentCapabilities: "Capacités",
    statusTitle: "Tâches en cours",
    statusEmpty: "Aucune tâche en cours.",
    statusRunning: "En cours",
    statusDuration: "Durée",
    pollStart: "Démarrage du cycle de polling…",
    pollComplete: "Cycle terminé.",
    pollNoTask: "Aucune tâche disponible.",
    runStart: "Exécution de la tâche",
    runComplete: "Tâche terminée avec succès.",
    runError: "Erreur lors de l'exécution",
    cardCreated: "Carte créée avec succès",
    cardError: "Erreur lors de la création de la carte",
    generateStart: "Génération des prompts en cours…",
    generateComplete: "Génération terminée.",
    generateError: "Erreur lors de la génération",
    previewTitle: "Prévisualisation des prompts générés",
    previewCard: "Carte",
    previewDomain: "Domaine",
    previewInstructions: "Instructions",
    previewDeliverable: "Livrable",
    previewCriteria: "Critères d'acceptation",
  },

  orchestrator: {
    starting: "Démarrage de l'orchestrateur…",
    polling: "Interrogation de Trello…",
    dispatching: "Assignation de la tâche à l'agent",
    taskComplete: "Tâche terminée",
    taskError: "Erreur lors du traitement de la tâche",
    shutdown: "Arrêt propre en cours…",
    maxConcurrent: "Nombre maximum d'agents atteint, mise en file d'attente",
    queuedTask: "Tâche mise en file d'attente",
    slotFree: "Slot libéré, traitement de la prochaine tâche",
  },

  deliverables: {
    created: "Livrable créé",
    prCreated: "Pull Request créée",
    issueCreated: "Issue GitHub créée",
    error: "Erreur lors de la création du livrable",
  },

  errors: {
    missingConfig: "Configuration manquante",
    invalidDomain: "Domaine invalide",
    rateLimited: "Limite de taux atteinte, nouvelle tentative…",
    timeout: "Délai d'attente dépassé",
    notFound: "Ressource introuvable",
    unauthorized: "Non autorisé — vérifiez vos clés API",
  },
};

const en: Translations = {
  cli: {
    unknownCommand: "Unknown command",
    agentsTitle: "Available agents",
    agentDomain: "Domain",
    agentPromptPrefix: "System prompt",
    agentCapabilities: "Capabilities",
    statusTitle: "Running tasks",
    statusEmpty: "No tasks currently running.",
    statusRunning: "Running",
    statusDuration: "Duration",
    pollStart: "Starting polling cycle…",
    pollComplete: "Cycle complete.",
    pollNoTask: "No tasks available.",
    runStart: "Running task",
    runComplete: "Task completed successfully.",
    runError: "Error during execution",
    cardCreated: "Card created successfully",
    cardError: "Error creating card",
    generateStart: "Generating prompts…",
    generateComplete: "Generation complete.",
    generateError: "Error during generation",
    previewTitle: "Preview of generated prompts",
    previewCard: "Card",
    previewDomain: "Domain",
    previewInstructions: "Instructions",
    previewDeliverable: "Deliverable",
    previewCriteria: "Acceptance criteria",
  },

  orchestrator: {
    starting: "Starting orchestrator…",
    polling: "Polling Trello…",
    dispatching: "Dispatching task to agent",
    taskComplete: "Task completed",
    taskError: "Error processing task",
    shutdown: "Graceful shutdown in progress…",
    maxConcurrent: "Maximum agent count reached, queuing task",
    queuedTask: "Task queued",
    slotFree: "Slot freed, processing next task",
  },

  deliverables: {
    created: "Deliverable created",
    prCreated: "Pull Request created",
    issueCreated: "GitHub Issue created",
    error: "Error creating deliverable",
  },

  errors: {
    missingConfig: "Missing configuration",
    invalidDomain: "Invalid domain",
    rateLimited: "Rate limit reached, retrying…",
    timeout: "Request timed out",
    notFound: "Resource not found",
    unauthorized: "Unauthorized — check your API keys",
  },
};

export const translations: Record<Locale, Translations> = { fr, en };
