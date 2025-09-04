/**
 * Progress Parser Utility (Simplified)
 *
 * Centralized progress parsing for CLI output with multilingual support.
 * Reduces complexity while maintaining all functionality from the original 470-line version.
 */

export type ProgressLanguage = 'fr' | 'en';

export interface ProgressMapping {
  [key: string]: string;
}

/**
 * Simplified Progress Parser - handles all CLI progress message patterns
 */

// Core workflow steps for 6-step documentation process
const WORKFLOW_STEPS = {
  fr: [
    'Extraction des abstractions',
    'Analyse des relations',
    'Ordonnancement des chapitres',
    'Génération des chapitres',
    'Révision des chapitres',
    'Création des tutoriels',
  ],
  en: [
    'Extracting abstractions',
    'Analyzing relationships',
    'Ordering chapters',
    'Generating chapters',
    'Reviewing chapters',
    'Creating tutorials',
  ],
};

// Default keyword mapping for JSON logs
const DEFAULT_MAPPING: ProgressMapping = {
  // Removed "Starting codebase analysis" to prevent duplicate Step 1
  // FONDATION_STEP messages handle the actual step progression
  'Extracting core abstractions': 'Étape 1/6: Extraction des abstractions',
  'Analyzing relationships': 'Étape 2/6: Analyse des relations',
  'Determining optimal chapter order': 'Étape 3/6: Ordonnancement des chapitres',
  'Generating chapter content': 'Étape 4/6: Génération des chapitres',
  'Reviewing and enhancing': 'Étape 5/6: Révision des chapitres',
  'Analysis complete': "Étape 6/6: Finalisation de l'analyse",
};

/**
 * Parse single progress message from CLI output
 */
export function parseMessage(message: string, customMapping?: ProgressMapping): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  // 1. French step patterns: "Étape 2/6: Description"
  const frenchMatch = trimmed.match(/Étape (\d+)\/(\d+):?\s*(.*)/i);
  if (frenchMatch) {
    return trimmed; // Already formatted
  }

  // 2. FONDATION_STEP unique identifiers: "[FONDATION_STEP_2/6] Description"
  const fondationMatch = trimmed.match(/\[FONDATION_STEP_(\d+)\/(\d+)\]\s*(.*)/i);
  if (fondationMatch) {
    const step = Number.parseInt(fondationMatch[1], 10);
    const total = Number.parseInt(fondationMatch[2], 10);
    let desc = fondationMatch[3] || '';

    // Clean any trailing JSON artifacts before translation
    desc = desc.replace(/[}\]"]+$/, '').trim();

    // Translate common English phrases to French
    const translations: Record<string, string> = {
      'Extracting core abstractions from codebase': 'Extraction des abstractions principales',
      'Analyzing relationships between components': 'Analyse des relations entre composants',
      'Determining optimal chapter order': "Détermination de l'ordre optimal des chapitres",
      'Generating chapter content': 'Génération du contenu des chapitres',
      'Reviewing and enhancing chapters': 'Révision et amélioration des chapitres',
      'Generating interactive tutorials': 'Génération de tutoriels interactifs',
    };

    desc = translations[desc] || desc || getStepName(step - 1, 'fr') || '';
    return formatStep(step, total, desc, 'fr');
  }

  // 3. English step patterns: "Step 2/6: Description" or "Step 2 of 6: Description"
  const englishMatch = trimmed.match(/Step (\d+)(?:\/(\d+)| of (\d+)):?\s*(.*)/i);
  if (englishMatch) {
    const step = Number.parseInt(englishMatch[1], 10);
    const total = Number.parseInt(englishMatch[2] || englishMatch[3] || '6', 10);
    const desc = englishMatch[4] || getStepName(step - 1, 'en') || '';
    return formatStep(step, total, desc, 'fr'); // Convert to French format
  }

  // 3. Progress ratios: "3/6 completed" or "Processing 2 of 6" (check before numbered patterns)
  const ratioMatch = trimmed.match(/(?:Processing\s+)?(\d+)(?:\s*\/\s*|\s+of\s+)(\d+)(?:\s+.*)?/i);
  if (ratioMatch) {
    const step = Number.parseInt(ratioMatch[1], 10);
    const total = Number.parseInt(ratioMatch[2], 10);
    const desc = getStepName(step - 1, 'fr') || `Étape ${step}`;
    return formatStep(step, total, desc, 'fr');
  }

  // 4. Numbered steps: "Step 1:" or "1. Description"
  const numberedMatch = trimmed.match(/(?:Step\s+)?(\d+)[:.]?\s*(.*)/i);
  if (numberedMatch) {
    const step = Number.parseInt(numberedMatch[1], 10);
    const desc = numberedMatch[2] || getStepName(step - 1, 'fr') || '';
    if (step >= 1 && step <= 6) {
      return formatStep(step, 6, desc, 'fr');
    }
  }

  // 5. Progress indicators: "[PROGRESS] Description"
  const progressMatch = trimmed.match(/\[(?:DEV-)?PROGRESS\]\s*(.*)/i);
  if (progressMatch) {
    return progressMatch[1].trim();
  }

  // 6. JSON logs with keyword mapping
  if (trimmed.startsWith('{') && trimmed.includes('"msg"')) {
    try {
      const logData = JSON.parse(trimmed);
      const msg = logData.msg || '';
      const mapping = customMapping || DEFAULT_MAPPING;

      for (const [keyword, frenchMsg] of Object.entries(mapping)) {
        if (msg.includes(keyword)) {
          return frenchMsg;
        }
      }
    } catch {} // Ignore malformed JSON
  }

  // 7. Action word detection - DISABLED to prevent false matches with debug text
  // Using unique FONDATION_STEP identifiers instead for reliable parsing
  // const lowerMessage = trimmed.toLowerCase();
  // for (const mapping of this.ACTION_MAPPINGS) {
  //   if (mapping.words.some(word => lowerMessage.includes(word))) {
  //     return this.formatStep(mapping.step, 6, mapping.desc, 'fr');
  //   }
  // }

  return null; // No pattern matched
}

/**
 * Parse multiline CLI output and call progress callback for each match
 */
export function parseMultilineOutput(
  text: string,
  onProgress?: (message: string) => Promise<void>,
  customMapping?: ProgressMapping,
): void {
  const lines = text.split('\n');
  for (const line of lines) {
    const result = parseMessage(line, customMapping);
    if (result) {
      onProgress?.(result).catch(() => {
        // Progress callback error ignored
      });
    }
  }
}

/**
 * Format progress step message
 */
export function formatStep(
  step: number,
  total: number,
  description: string,
  lang: ProgressLanguage = 'fr',
): string {
  if (lang === 'fr') {
    return `Étape ${step}/${total}: ${description}`;
  }
  return `Step ${step}/${total}: ${description}`;
}

/**
 * Get workflow step name by index
 */
export function getStepName(stepIndex: number, lang: ProgressLanguage = 'fr'): string | undefined {
  return WORKFLOW_STEPS[lang][stepIndex];
}

/**
 * Get all workflow steps
 */
export function getWorkflowSteps(lang: ProgressLanguage = 'fr'): string[] {
  return [...WORKFLOW_STEPS[lang]];
}

/**
 * Get default progress mapping
 */
export function getDefaultProgressMapping(): ProgressMapping {
  return { ...DEFAULT_MAPPING };
}

/**
 * Create custom progress mapping
 */
export function createProgressMapping(customMappings: ProgressMapping): ProgressMapping {
  return { ...DEFAULT_MAPPING, ...customMappings };
}

// Named exports replace the previous ProgressParser class
export { parseMessage as default };
