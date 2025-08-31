/**
 * Internationalization (i18n) service for Fondation
 * Centralized translation management for French UI
 */

/**
 * Job status translations
 */
export const jobStatusTranslations = {
  completed: "Terminé",
  failed: "Échoué", 
  canceled: "Annulé",
  pending: "En attente",
  running: "En cours",
  cloning: "Clonage",
  analyzing: "Analyse",
  gathering: "Collecte",
} as const;

/**
 * Progress message translations
 * Maps English progress keywords to French translations
 */
export const progressTranslations = {
  initializing: "Initialisation...",
  cloning: "Clonage du dépôt...",
  analyzing: "Analyse en cours...",
  analysis: "Analyse en cours...",
  gathering: "Collecte des informations...",
  generating: "Génération du cours...",
  processing: "Traitement...",
  running: "En cours d'exécution...",
} as const;

/**
 * UI text translations
 */
export const uiTranslations = {
  // Common actions
  generate: "Générer",
  regenerate: "Régénérer", 
  cancel: "Annuler",
  retry: "Réessayer",
  view: "Voir",
  loading: "Chargement...",
  
  // Course generation
  generateCourse: "Générer le Cours",
  regenerateCourse: "Régénérer le cours", 
  viewCourse: "Voir le Cours",
  generation: "Génération...",
  
  // Status messages
  unknown: "Inconnu",
  processing: "Traitement",
  
  // Time estimates
  estimatedMinutes: "minutes estimées",
  
  // Accessibility labels
  generateCourseFor: (repoName: string) => `Générer le cours de documentation pour ${repoName}`,
  regenerateCourseFor: (repoName: string) => `Régénérer le cours pour ${repoName}`,
  viewCourseFor: (repoName: string) => `Voir le cours généré pour le dépôt ${repoName}`,
  cancelGenerationFor: (repoName: string) => `Annuler la génération en cours pour ${repoName}`,
  viewSourceFor: (repoName: string) => `Voir le code source du dépôt ${repoName} sur GitHub`,
  
  // Progress descriptions
  generationInProgress: (repoName: string) => `Génération en cours pour ${repoName}. Veuillez patienter.`,
  retryGeneration: (repoName: string) => `Réessayer la génération du cours pour ${repoName}`,
  progressDescription: (current: number, total: number) => 
    `Progression de génération: étape ${current} sur ${total}`,
} as const;

/**
 * Translate job status to French
 */
export function translateStatus(status: string | undefined): string {
  if (!status) { return uiTranslations.unknown; }
  
  const normalizedStatus = status.toLowerCase() as keyof typeof jobStatusTranslations;
  return jobStatusTranslations[normalizedStatus] ?? status;
}

/**
 * Translate progress message to French
 * Handles partial matches and keyword detection
 */
export function translateProgress(progress: string | undefined): string {
  if (!progress) { return uiTranslations.processing; }
  
  const lowerProgress = progress.toLowerCase();
  
  // Find matching keyword in the progress message
  for (const [keyword, translation] of Object.entries(progressTranslations)) {
    if (lowerProgress.includes(keyword)) {
      return translation;
    }
  }
  
  // If no match found, return original or fallback
  return progress || uiTranslations.processing;
}

/**
 * Get UI text translation
 */
export function t(key: keyof typeof uiTranslations): string {
  return uiTranslations[key] as string;
}

/**
 * Type-safe translation keys
 */
export type TranslationKey = keyof typeof uiTranslations;
export type JobStatus = keyof typeof jobStatusTranslations;
export type ProgressKeyword = keyof typeof progressTranslations;