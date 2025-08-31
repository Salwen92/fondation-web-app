/**
 * Translation utilities for the application
 * Centralized translation functions to maintain consistency
 */

/**
 * Translate progress messages to French
 */
export function translateProgress(progress: string | undefined): string {
  if (!progress) { return "Traitement"; }
  
  const lowerProgress = progress.toLowerCase();
  
  if (lowerProgress.includes("initializing")) { return "Initialisation..."; }
  if (lowerProgress.includes("cloning")) { return "Clonage du dépôt..."; }
  if (lowerProgress.includes("analyzing") || lowerProgress.includes("analysis")) { return "Analyse en cours..."; }
  if (lowerProgress.includes("gathering")) { return "Collecte des informations..."; }
  if (lowerProgress.includes("generating")) { return "Génération du cours..."; }
  if (lowerProgress.includes("processing")) { return "Traitement..."; }
  if (lowerProgress.includes("running")) { return "En cours d'exécution..."; }
  
  // If no match, return the original or default
  return progress || "Traitement";
}

/**
 * Translate job status to French
 */
export function translateStatus(status: string | undefined): string {
  switch (status) {
    case "completed":
      return "Terminé";
    case "failed":
      return "Échoué";
    case "canceled":
      return "Annulé";
    case "pending":
      return "En attente";
    case "running":
      return "En cours";
    case "cloning":
      return "Clonage";
    case "analyzing":
      return "Analyse";
    case "gathering":
      return "Collecte";
    default:
      return status ?? "Inconnu";
  }
}

/**
 * Get status emoji for visual representation
 */
export function getStatusEmoji(status: string | undefined): string {
  switch (status) {
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "canceled":
      return "🚫";
    case "pending":
    case "running":
    case "cloning":
    case "analyzing":
    case "gathering":
      return "⏳";
    default:
      return "❓";
  }
}