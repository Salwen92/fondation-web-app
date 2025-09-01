/**
 * ProgressParser Unit Tests (Simplified)
 * 
 * Phase 4 Testing: Focused test suite for the simplified progress parser
 * Tests core functionality while maintaining comprehensive coverage
 */

import { describe, it, expect } from "bun:test";
import { ProgressParser, type ProgressLanguage, type ProgressMapping } from "./progress-parser.js";

describe("ProgressParser", () => {
  
  describe("Progress Message Parsing", () => {
    it("should parse French step patterns", () => {
      expect(ProgressParser.parseMessage("Étape 2/6: Analyse des relations")).toBe("Étape 2/6: Analyse des relations");
      expect(ProgressParser.parseMessage("Étape 1/6 Extraction des abstractions")).toBe("Étape 1/6 Extraction des abstractions");
      expect(ProgressParser.parseMessage("étape 3/6: ordonnancement")).toBe("étape 3/6: ordonnancement");
    });
    
    it("should parse English step patterns and convert to French format", () => {
      expect(ProgressParser.parseMessage("Step 4/6: Generating chapters")).toBe("Étape 4/6: Generating chapters");
      expect(ProgressParser.parseMessage("Step 2 of 6: Analyzing relationships")).toBe("Étape 2/6: Analyzing relationships");
    });
    
    it("should parse numbered step patterns", () => {
      expect(ProgressParser.parseMessage("2: Analyzing code structure")).toBe("Étape 2/6: Analyzing code structure");
      expect(ProgressParser.parseMessage("1. Extracting abstractions")).toBe("Étape 1/6: Extracting abstractions");
      expect(ProgressParser.parseMessage("Step 3")).toBe("Étape 3/6: Ordonnancement des chapitres");
    });
    
    it("should parse progress ratios", () => {
      expect(ProgressParser.parseMessage("3/6 completed")).toBe("Étape 3/6: Ordonnancement des chapitres");
      expect(ProgressParser.parseMessage("Processing 2 of 6 chapters")).toBe("Étape 2/6: Analyse des relations");
    });
    
    it("should parse progress indicators", () => {
      expect(ProgressParser.parseMessage("[PROGRESS] Analyzing codebase")).toBe("Analyzing codebase");
      expect(ProgressParser.parseMessage("[DEV-PROGRESS] Development mode")).toBe("Development mode");
    });
    
    it("should parse JSON logs with keyword mapping", () => {
      const jsonLog = '{"msg": "Starting codebase analysis", "level": "info"}';
      expect(ProgressParser.parseMessage(jsonLog)).toBe("Étape 1/6: Initialisation de l'analyse");
      
      const customMapping = { "Custom process": "Étape personnalisée" };
      const customLog = '{"msg": "Custom process started", "level": "info"}';
      expect(ProgressParser.parseMessage(customLog, customMapping)).toBe("Étape personnalisée");
    });
    
    it("should detect action words and map to workflow steps", () => {
      expect(ProgressParser.parseMessage("Generating comprehensive documentation")).toBe("Étape 4/6: Génération des chapitres");
      expect(ProgressParser.parseMessage("Analyzing and processing code")).toBe("Étape 2/6: Analyse des relations");
      expect(ProgressParser.parseMessage("Extracting core abstractions")).toBe("Étape 1/6: Extraction des abstractions");
    });
    
    it("should return null for unmatched patterns", () => {
      expect(ProgressParser.parseMessage("")).toBeNull();
      expect(ProgressParser.parseMessage("   ")).toBeNull();
      expect(ProgressParser.parseMessage("Random log message")).toBeNull();
      expect(ProgressParser.parseMessage("Step abc: Invalid")).toBeNull();
    });
    
    it("should handle malformed JSON gracefully", () => {
      expect(ProgressParser.parseMessage('{"msg": incomplete json')).toBeNull();
    });
  });

  describe("Multiline Output Parsing", () => {
    it("should parse multiple lines and call progress callback", async () => {
      const output = [
        "Starting analysis...",
        "Étape 1/6: Extraction des abstractions", 
        "[PROGRESS] Processing files",
        '{"msg": "Analyzing relationships", "level": "info"}',
        "Step 3: Ordering chapters"
      ].join("\n");
      
      const messages: string[] = [];
      const callback = async (msg: string) => messages.push(msg);
      
      ProgressParser.parseMultilineOutput(output, callback);
      
      // Allow async callbacks to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(messages.length).toBeGreaterThan(0);
      expect(messages).toContain("Étape 1/6: Extraction des abstractions");
      expect(messages).toContain("Processing files");
      expect(messages).toContain("Étape 2/6: Analyse des relations");
    });
  });

  describe("Utility Methods", () => {
    it("should format step messages correctly", () => {
      expect(ProgressParser.formatStep(3, 6, "Test step", "fr")).toBe("Étape 3/6: Test step");
      expect(ProgressParser.formatStep(2, 6, "Test step", "en")).toBe("Step 2/6: Test step");
    });
    
    it("should get step names by index", () => {
      expect(ProgressParser.getStepName(0, "fr")).toBe("Extraction des abstractions");
      expect(ProgressParser.getStepName(0, "en")).toBe("Extracting abstractions");
      expect(ProgressParser.getStepName(10, "fr")).toBeUndefined();
    });
    
    it("should return workflow steps", () => {
      const frenchSteps = ProgressParser.getWorkflowSteps("fr");
      const englishSteps = ProgressParser.getWorkflowSteps("en");
      
      expect(frenchSteps).toHaveLength(6);
      expect(englishSteps).toHaveLength(6);
      expect(frenchSteps[0]).toBe("Extraction des abstractions");
      expect(englishSteps[0]).toBe("Extracting abstractions");
    });
    
    it("should handle progress mappings", () => {
      const defaultMapping = ProgressParser.getDefaultProgressMapping();
      expect(defaultMapping).toHaveProperty("Starting codebase analysis");
      
      const custom = { "Test": "Étape test" };
      const combined = ProgressParser.createProgressMapping(custom);
      expect(combined).toHaveProperty("Test");
      expect(combined).toHaveProperty("Starting codebase analysis");
    });
  });

  describe("Backwards Compatibility", () => {
    it("should maintain API compatibility with BaseStrategy", () => {
      // Test that all methods used by BaseStrategy still exist
      expect(typeof ProgressParser.parseMultilineOutput).toBe("function");
      expect(typeof ProgressParser.getDefaultProgressMapping).toBe("function");
      expect(typeof ProgressParser.getWorkflowSteps).toBe("function");
    });
    
    it("should preserve French UI message format", () => {
      const jsonMessage = '{"msg": "Analyzing relationships", "level": "info"}';
      const result = ProgressParser.parseMessage(jsonMessage);
      expect(result).toMatch(/^Étape \d+\/\d+:/);
      expect(result).toContain("Analyse des relations");
    });
  });
});