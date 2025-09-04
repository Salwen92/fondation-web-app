/**
 * Unified Progress Handler
 *
 * Single source of truth for all progress message handling, translation, and formatting.
 * Consolidates logic previously scattered across progress-parser.ts, worker.ts, and base-strategy.ts
 */

export interface ProgressInfo {
  step: number;
  totalSteps: number;
  message: string;
  status?: 'cloning' | 'analyzing' | 'gathering' | 'running' | 'completed' | 'failed';
}

// The 6 workflow steps in French (UI display)
const STEPS_FR = [
  'Extraction des abstractions principales',
  'Analyse des relations entre composants',
  "Détermination de l'ordre optimal des chapitres",
  'Génération du contenu des chapitres',
  'Révision et amélioration des chapitres',
  'Génération de tutoriels interactifs',
];

// English to French translations for CLI messages
const TRANSLATIONS: Record<string, string> = {
  'Extracting core abstractions from codebase': 'Extraction des abstractions principales',
  'Analyzing relationships between components': 'Analyse des relations entre composants',
  'Determining optimal chapter order': "Détermination de l'ordre optimal des chapitres",
  'Generating chapter content': 'Génération du contenu des chapitres',
  'Reviewing and enhancing chapters': 'Révision et amélioration des chapitres',
  'Generating interactive tutorials': 'Génération de tutoriels interactifs',
};

// Status messages in French
const STATUS_MESSAGES: Record<string, string> = {
  cloning: 'Clonage du dépôt...',
  analyzing: 'Analyse du code...',
  gathering: 'Sauvegarde des résultats...',
  running: 'Traitement en cours...',
  completed: 'Terminé',
  failed: 'Échec',
};

/**
 * Main entry point: Process any progress-related text and return normalized ProgressInfo
 */
export function processProgress(input: string): ProgressInfo | null {
  // Clean input
  const cleaned = cleanInput(input);

  // 1. Try to parse FONDATION_STEP format (most reliable)
  const fondationStep = parseFondationStep(cleaned);
  if (fondationStep) {
    return fondationStep;
  }

  // 2. Try to parse "Étape X/Y" format (already formatted)
  const frenchStep = parseFrenchStep(cleaned);
  if (frenchStep) {
    return frenchStep;
  }

  // 3. Try to parse JSON log format
  const jsonStep = parseJsonLog(input); // Use original for JSON
  if (jsonStep) {
    return jsonStep;
  }

  // 4. Check if it's a status message
  const statusMessage = parseStatusMessage(cleaned);
  if (statusMessage) {
    return statusMessage;
  }

  return null;
}

/**
 * Format progress for UI display
 */
export function formatForUI(info: ProgressInfo): string {
  if (info.step > 0) {
    return `Étape ${info.step}/${info.totalSteps}: ${info.message}`;
  }
  return info.message;
}

/**
 * Extract step number from progress info
 */
export function getStepNumber(info: ProgressInfo): number {
  return info.step;
}

/**
 * Clean input string from JSON artifacts and extra whitespace
 */
function cleanInput(input: string): string {
  return input
    .trim()
    .replace(/[}\]"]+$/, '') // Remove trailing JSON artifacts
    .replace(/^["{[]+/, '') // Remove leading JSON artifacts
    .trim();
}

/**
 * Parse FONDATION_STEP format: [FONDATION_STEP_X/Y] Description
 */
function parseFondationStep(text: string): ProgressInfo | null {
  const match = text.match(/\[FONDATION_STEP_(\d+)\/(\d+)\]\s*(.*)/i);
  if (!match) {
    return null;
  }

  const step = Number.parseInt(match[1], 10);
  const totalSteps = Number.parseInt(match[2], 10);
  let description = cleanInput(match[3] || '');

  // Translate if in English
  description = TRANSLATIONS[description] || description || STEPS_FR[step - 1] || description;

  return {
    step,
    totalSteps,
    message: description,
    status: 'running',
  };
}

/**
 * Parse French format: Étape X/Y: Description
 */
function parseFrenchStep(text: string): ProgressInfo | null {
  const match = text.match(/Étape\s+(\d+)\/(\d+):\s*(.*)/i);
  if (!match) {
    return null;
  }

  return {
    step: Number.parseInt(match[1], 10),
    totalSteps: Number.parseInt(match[2], 10),
    message: match[3] || '',
    status: 'running',
  };
}

/**
 * Parse JSON log format
 */
function parseJsonLog(text: string): ProgressInfo | null {
  if (!text.includes('{') || !text.includes('"msg"')) {
    return null;
  }

  try {
    // Extract JSON portion
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonStr = text.slice(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonStr);
    const msg = parsed.msg || '';

    // Check if message contains FONDATION_STEP
    if (msg.includes('FONDATION_STEP')) {
      return parseFondationStep(msg);
    }

    // Check for "Starting codebase analysis" (skip to avoid duplicate)
    if (msg.includes('Starting codebase analysis')) {
      return null; // Skip this to avoid duplicate Step 1
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse status messages
 */
function parseStatusMessage(text: string): ProgressInfo | null {
  const lowerText = text.toLowerCase();

  // Skip debug messages, JSON logs, and other non-status messages
  if (
    lowerText.includes('"debug"') ||
    lowerText.includes('"msg"') ||
    lowerText.includes('[debug]') ||
    lowerText.includes('sdk message') ||
    lowerText.includes('running prompt') ||
    lowerText.includes('prompt completed')
  ) {
    return null;
  }

  for (const [status, message] of Object.entries(STATUS_MESSAGES)) {
    if (lowerText.includes(status) || lowerText.includes(message.toLowerCase())) {
      return {
        step: 0,
        totalSteps: 6,
        message,
        status: status as
          | 'cloning'
          | 'analyzing'
          | 'gathering'
          | 'running'
          | 'completed'
          | 'failed',
      };
    }
  }

  return null;
}

/**
 * Process a line buffer (for streaming stdout)
 */
export function processLineBuffer(
  buffer: string,
  onProgress: (info: ProgressInfo) => void,
): string {
  const lines = buffer.split('\n');
  const remainder = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      const info = processProgress(line);
      if (info) {
        onProgress(info);
      }
    }
  }

  return remainder;
}
