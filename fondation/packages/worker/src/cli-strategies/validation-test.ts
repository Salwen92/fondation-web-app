/**
 * Strategy Validation Test
 * 
 * Compares original vs refactored strategies to ensure identical behavior.
 * This test validates that the Template Method pattern refactoring preserves
 * exact functionality while reducing code duplication.
 */

import { DevelopmentCLIStrategy as OriginalDevStrategy } from "./development-strategy-original.js";
import { ProductionCLIStrategy as OriginalProdStrategy } from "./production-strategy-original.js";
import { DevelopmentCLIStrategy as RefactoredDevStrategy } from "./development-strategy.js";
import { ProductionCLIStrategy as RefactoredProdStrategy } from "./production-strategy.js";

/**
 * Validation test results
 */
interface ValidationComparison {
  strategy: string;
  originalValidation: { valid: boolean; errors: string[] };
  refactoredValidation: { valid: boolean; errors: string[] };
  identical: boolean;
  differences?: string[];
}

/**
 * Compare validation behavior between original and refactored strategies
 */
export async function validateStrategies(testCliPath: string): Promise<ValidationComparison[]> {
  const results: ValidationComparison[] = [];
  
  // Test Development Strategy
  const originalDev = new OriginalDevStrategy(testCliPath);
  const refactoredDev = new RefactoredDevStrategy(testCliPath);
  
  const originalDevValidation = await originalDev.validate();
  const refactoredDevValidation = await refactoredDev.validate();
  
  results.push({
    strategy: "Development",
    originalValidation: originalDevValidation,
    refactoredValidation: refactoredDevValidation,
    identical: compareValidationResults(originalDevValidation, refactoredDevValidation),
    differences: findValidationDifferences(originalDevValidation, refactoredDevValidation)
  });
  
  // Test Production Strategy
  const originalProd = new OriginalProdStrategy(testCliPath);
  const refactoredProd = new RefactoredProdStrategy(testCliPath);
  
  const originalProdValidation = await originalProd.validate();
  const refactoredProdValidation = await refactoredProd.validate();
  
  results.push({
    strategy: "Production",
    originalValidation: originalProdValidation,
    refactoredValidation: refactoredProdValidation,
    identical: compareValidationResults(originalProdValidation, refactoredProdValidation),
    differences: findValidationDifferences(originalProdValidation, refactoredProdValidation)
  });
  
  return results;
}

/**
 * Compare validation results for equality
 */
function compareValidationResults(
  original: { valid: boolean; errors: string[] },
  refactored: { valid: boolean; errors: string[] }
): boolean {
  if (original.valid !== refactored.valid) {
    return false;
  }
  
  if (original.errors.length !== refactored.errors.length) {
    return false;
  }
  
  // Check if all errors match (order-independent)
  for (const error of original.errors) {
    if (!refactored.errors.includes(error)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Find differences between validation results
 */
function findValidationDifferences(
  original: { valid: boolean; errors: string[] },
  refactored: { valid: boolean; errors: string[] }
): string[] {
  const differences: string[] = [];
  
  if (original.valid !== refactored.valid) {
    differences.push(`Valid flag differs: original=${original.valid}, refactored=${refactored.valid}`);
  }
  
  const originalErrors = new Set(original.errors);
  const refactoredErrors = new Set(refactored.errors);
  
  // Errors in original but not in refactored
  for (const error of originalErrors) {
    if (!refactoredErrors.has(error)) {
      differences.push(`Missing in refactored: "${error}"`);
    }
  }
  
  // Errors in refactored but not in original
  for (const error of refactoredErrors) {
    if (!originalErrors.has(error)) {
      differences.push(`Added in refactored: "${error}"`);
    }
  }
  
  return differences;
}

/**
 * Run validation tests and report results
 */
export async function runValidationTests(): Promise<void> {
  console.log("🧪 Running Strategy Validation Tests...\n");
  
  // Test with both source and bundled CLI paths
  const testPaths = [
    "@fondation/cli/src/cli.ts",
    "@fondation/cli/dist/cli.bundled.mjs"
  ];
  
  for (const testPath of testPaths) {
    console.log(`📋 Testing with CLI path: ${testPath}\n`);
    
    const results = await validateStrategies(testPath);
    
    for (const result of results) {
      console.log(`${result.strategy} Strategy:`);
      console.log(`  ✅ Original Valid: ${result.originalValidation.valid} (${result.originalValidation.errors.length} errors)`);
      console.log(`  🔄 Refactored Valid: ${result.refactoredValidation.valid} (${result.refactoredValidation.errors.length} errors)`);
      console.log(`  ${result.identical ? '✅' : '❌'} Behavior Identical: ${result.identical}`);
      
      if (!result.identical && result.differences) {
        console.log(`  🔍 Differences:`);
        for (const diff of result.differences) {
          console.log(`    - ${diff}`);
        }
      }
      console.log();
    }
  }
}

/**
 * Main execution for standalone testing
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationTests().catch(console.error);
}