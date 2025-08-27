/**
 * User-friendly error message mappings
 * Provides human-readable messages for technical errors
 */

/**
 * Map of technical error patterns to user-friendly messages
 */
const ERROR_MAPPINGS: Record<string, string> = {
  // Network errors
  "Failed to fetch": "Impossible de se connecter au serveur. Vérifiez votre connexion internet.",
  "NetworkError": "Problème de connexion réseau. Veuillez réessayer.",
  "ECONNREFUSED": "Le serveur est temporairement indisponible. Veuillez réessayer plus tard.",
  "ETIMEDOUT": "La requête a pris trop de temps. Veuillez réessayer.",
  "ERR_NETWORK": "Erreur de réseau. Vérifiez votre connexion.",
  
  // Authentication errors
  "Unauthorized": "Vous devez vous connecter pour continuer.",
  "401": "Session expirée. Veuillez vous reconnecter.",
  "403": "Vous n'avez pas les permissions nécessaires.",
  "Invalid token": "Votre session a expiré. Veuillez vous reconnecter.",
  "Missing callbackToken": "Authentification requise pour cette action.",
  
  // GitHub specific errors
  "rate limit": "Limite d'API GitHub atteinte. Veuillez attendre quelques minutes.",
  "Repository not found": "Le dépôt GitHub n'a pas été trouvé. Vérifiez l'URL.",
  "Bad credentials": "Vos identifiants GitHub sont invalides. Veuillez vous reconnecter.",
  "github token": "Problème avec votre token GitHub. Veuillez vous reconnecter.",
  
  // Job/Processing errors
  "Job not found": "La tâche demandée n'existe pas ou a expiré.",
  "already processing": "Une génération est déjà en cours pour ce dépôt.",
  "Job already completed": "Cette tâche est déjà terminée.",
  "canceled": "La génération a été annulée.",
  
  // Worker service errors
  "Worker": "Problème avec le service de traitement. Notre équipe a été notifiée.",
  "Gateway error": "Erreur de passerelle. Veuillez réessayer dans quelques instants.",
  "Service unavailable": "Service temporairement indisponible. Veuillez réessayer.",
  
  // Convex/Database errors
  "Convex": "Erreur de base de données. Veuillez réessayer.",
  "mutation failed": "Impossible de sauvegarder les modifications. Veuillez réessayer.",
  "query failed": "Impossible de récupérer les données. Veuillez réessayer.",
  
  // Validation errors
  "Validation failed": "Les données fournies sont invalides. Vérifiez le formulaire.",
  "Invalid JSON": "Format de données incorrect.",
  "Missing required": "Des champs obligatoires sont manquants.",
  
  // File/Content errors
  "File too large": "Le fichier est trop volumineux.",
  "Invalid file type": "Type de fichier non supporté.",
  "Empty repository": "Le dépôt semble vide ou inaccessible.",
  
  // Generic errors
  "Internal server error": "Une erreur inattendue s'est produite. Notre équipe a été notifiée.",
  "Something went wrong": "Une erreur s'est produite. Veuillez réessayer.",
  "timeout": "L'opération a pris trop de temps. Veuillez réessayer.",
  "ENOENT": "Fichier ou ressource introuvable.",
};

/**
 * Get a user-friendly error message for a technical error
 * Falls back to the original message if no mapping exists
 */
export function getUserFriendlyError(error: unknown): string {
  // Extract error message
  let errorMessage = "Une erreur inattendue s'est produite.";
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error && typeof error === "object" && "message" in error) {
    errorMessage = String((error as { message: unknown }).message);
  }
  
  // Check for exact match first
  const exactMatch = ERROR_MAPPINGS[errorMessage];
  if (exactMatch) {
    return exactMatch;
  }
  
  // Check for partial matches (case-insensitive)
  const lowerErrorMessage = errorMessage.toLowerCase();
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MAPPINGS)) {
    if (lowerErrorMessage.includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // If no mapping found but it's a technical error, return a generic message
  if (isTechnicalError(errorMessage)) {
    return "Une erreur technique s'est produite. Veuillez réessayer ou contacter le support.";
  }
  
  // Return the original message if it seems user-friendly already
  return errorMessage;
}

/**
 * Check if an error message is technical (contains stack traces, file paths, etc.)
 */
function isTechnicalError(message: string): boolean {
  const technicalPatterns = [
    /at\s+\w+\s+\(/,  // Stack trace
    /:\d+:\d+/,       // Line:column numbers
    /\.(ts|js|tsx|jsx):/,  // File extensions
    /node_modules/,   // Node modules path
    /\/src\//,        // Source path
    /\berror\b.*\bcode\b/i,  // Error codes
    /ENOENT|EACCES|EPERM/,  // System error codes
  ];
  
  return technicalPatterns.some(pattern => pattern.test(message));
}

/**
 * Error categories for different types of errors
 */
export enum ErrorCategory {
  NETWORK = "network",
  AUTH = "auth",
  VALIDATION = "validation",
  PROCESSING = "processing",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

/**
 * Categorize an error for better handling
 */
export function categorizeError(error: unknown): ErrorCategory {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || 
      lowerMessage.includes("connection") || lowerMessage.includes("timeout")) {
    return ErrorCategory.NETWORK;
  }
  
  if (lowerMessage.includes("auth") || lowerMessage.includes("token") || 
      lowerMessage.includes("401") || lowerMessage.includes("403")) {
    return ErrorCategory.AUTH;
  }
  
  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid") || 
      lowerMessage.includes("required")) {
    return ErrorCategory.VALIDATION;
  }
  
  if (lowerMessage.includes("job") || lowerMessage.includes("processing") || 
      lowerMessage.includes("generation")) {
    return ErrorCategory.PROCESSING;
  }
  
  if (lowerMessage.includes("internal") || lowerMessage.includes("server") || 
      lowerMessage.includes("database")) {
    return ErrorCategory.SYSTEM;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Get retry suggestion based on error category
 */
export function getRetryMessage(category: ErrorCategory): string | null {
  switch (category) {
    case ErrorCategory.NETWORK:
      return "Vérifiez votre connexion et réessayez.";
    case ErrorCategory.AUTH:
      return "Veuillez vous reconnecter et réessayer.";
    case ErrorCategory.VALIDATION:
      return "Corrigez les erreurs et réessayez.";
    case ErrorCategory.PROCESSING:
      return "Attendez quelques instants et réessayez.";
    case ErrorCategory.SYSTEM:
      return "Réessayez dans quelques minutes.";
    default:
      return "Veuillez réessayer.";
  }
}