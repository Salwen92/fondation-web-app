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
export class ProgressParser {
  
  // Core workflow steps for 6-step documentation process
  private static readonly WORKFLOW_STEPS = {
    fr: ["Extraction des abstractions", "Analyse des relations", "Ordonnancement des chapitres", 
         "Génération des chapitres", "Révision des chapitres", "Création des tutoriels"],
    en: ["Extracting abstractions", "Analyzing relationships", "Ordering chapters", 
         "Generating chapters", "Reviewing chapters", "Creating tutorials"]
  };

  // Default keyword mapping for JSON logs
  private static readonly DEFAULT_MAPPING: ProgressMapping = {
    "Starting codebase analysis": "Étape 1/6: Initialisation de l'analyse",
    "Extracting core abstractions": "Étape 1/6: Extraction des abstractions",
    "Analyzing relationships": "Étape 2/6: Analyse des relations",
    "Determining optimal chapter order": "Étape 3/6: Ordonnancement des chapitres",
    "Generating chapter content": "Étape 4/6: Génération des chapitres",
    "Reviewing and enhancing": "Étape 5/6: Révision des chapitres",
    "Analysis complete": "Étape 6/6: Finalisation de l'analyse"
  };

  // Action word mappings for workflow step detection
  private static readonly ACTION_MAPPINGS = [
    { words: ["extracting", "extraction"], step: 1, desc: "Extraction des abstractions" },
    { words: ["analyzing", "analysis"], step: 2, desc: "Analyse des relations" },
    { words: ["ordering", "organizing", "determining"], step: 3, desc: "Ordonnancement des chapitres" },
    { words: ["generating", "writing", "creating"], step: 4, desc: "Génération des chapitres" },
    { words: ["reviewing", "enhancing"], step: 5, desc: "Révision des chapitres" },
    { words: ["building", "tutorial"], step: 6, desc: "Création des tutoriels" }
  ];

  /**
   * Parse single progress message from CLI output
   */
  static parseMessage(message: string, customMapping?: ProgressMapping): string | null {
    const trimmed = message.trim();
    if (!trimmed) return null;

    // 1. French step patterns: "Étape 2/6: Description"
    const frenchMatch = trimmed.match(/Étape (\d+)\/(\d+):?\s*(.*)/i);
    if (frenchMatch) return trimmed; // Already formatted

    // 2. English step patterns: "Step 2/6: Description" or "Step 2 of 6: Description"  
    const englishMatch = trimmed.match(/Step (\d+)(?:\/(\d+)| of (\d+)):?\s*(.*)/i);
    if (englishMatch) {
      const step = parseInt(englishMatch[1]);
      const total = parseInt(englishMatch[2] || englishMatch[3] || "6");
      const desc = englishMatch[4] || this.getStepName(step - 1, 'en') || "";
      return this.formatStep(step, total, desc, 'fr'); // Convert to French format
    }

    // 3. Progress ratios: "3/6 completed" or "Processing 2 of 6" (check before numbered patterns)
    const ratioMatch = trimmed.match(/(?:Processing\s+)?(\d+)(?:\s*\/\s*|\s+of\s+)(\d+)(?:\s+.*)?/i);
    if (ratioMatch) {
      const step = parseInt(ratioMatch[1]);
      const total = parseInt(ratioMatch[2]);
      const desc = this.getStepName(step - 1, 'fr') || `Étape ${step}`;
      return this.formatStep(step, total, desc, 'fr');
    }

    // 4. Numbered steps: "Step 1:" or "1. Description" 
    const numberedMatch = trimmed.match(/(?:Step\s+)?(\d+)[:.]?\s*(.*)/i);
    if (numberedMatch) {
      const step = parseInt(numberedMatch[1]);
      const desc = numberedMatch[2] || this.getStepName(step - 1, 'fr') || "";
      if (step >= 1 && step <= 6) {
        return this.formatStep(step, 6, desc, 'fr');
      }
    }

    // 5. Progress indicators: "[PROGRESS] Description"
    const progressMatch = trimmed.match(/\[(?:DEV-)?PROGRESS\]\s*(.*)/i);
    if (progressMatch) return progressMatch[1].trim();

    // 6. JSON logs with keyword mapping
    if (trimmed.startsWith("{") && trimmed.includes('"msg"')) {
      try {
        const logData = JSON.parse(trimmed);
        const msg = logData.msg || "";
        const mapping = customMapping || this.DEFAULT_MAPPING;
        
        for (const [keyword, frenchMsg] of Object.entries(mapping)) {
          if (msg.includes(keyword)) return frenchMsg;
        }
      } catch {} // Ignore malformed JSON
    }

    // 7. Action word detection
    const lowerMessage = trimmed.toLowerCase();
    for (const mapping of this.ACTION_MAPPINGS) {
      if (mapping.words.some(word => lowerMessage.includes(word))) {
        return this.formatStep(mapping.step, 6, mapping.desc, 'fr');
      }
    }

    return null; // No pattern matched
  }

  /**
   * Parse multiline CLI output and call progress callback for each match
   */
  static parseMultilineOutput(
    text: string,
    onProgress?: (message: string) => Promise<void>,
    customMapping?: ProgressMapping
  ): void {
    const lines = text.split("\n");
    for (const line of lines) {
      const result = this.parseMessage(line, customMapping);
      if (result) {
        onProgress?.(result).catch(console.error);
      }
    }
  }

  /**
   * Format progress step message
   */
  static formatStep(step: number, total: number, description: string, lang: ProgressLanguage = 'fr'): string {
    if (lang === 'fr') {
      return `Étape ${step}/${total}: ${description}`;
    } else {
      return `Step ${step}/${total}: ${description}`;
    }
  }

  /**
   * Get workflow step name by index
   */
  static getStepName(stepIndex: number, lang: ProgressLanguage = 'fr'): string | undefined {
    return this.WORKFLOW_STEPS[lang][stepIndex];
  }

  /**
   * Get all workflow steps
   */
  static getWorkflowSteps(lang: ProgressLanguage = 'fr'): string[] {
    return [...this.WORKFLOW_STEPS[lang]];
  }

  /**
   * Get default progress mapping
   */
  static getDefaultProgressMapping(): ProgressMapping {
    return { ...this.DEFAULT_MAPPING };
  }

  /**
   * Create custom progress mapping
   */
  static createProgressMapping(customMappings: ProgressMapping): ProgressMapping {
    return { ...this.DEFAULT_MAPPING, ...customMappings };
  }
}

export default ProgressParser;