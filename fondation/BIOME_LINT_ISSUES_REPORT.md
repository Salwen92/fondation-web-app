# 🔍 Biome Lint Issues Report
*Generated: December 4, 2024*

## ⚠️ Overall Status: **NEEDS ATTENTION**

### 📊 Summary
- **Total Errors:** 171
- **Total Warnings:** 78  
- **Total Issues:** 249
- **Fixable Issues:** ~95% (Most can be auto-fixed)

---

## 📦 Package-by-Package Breakdown

| Package | Errors | Warnings | Total | Status |
|---------|--------|----------|-------|--------|
| **CLI** | 3 | 2 | 5 | ✅ Good |
| **Web** | 71 | 32 | 103 | ⚠️ Needs work |
| **Worker** | 77 | 23 | 100 | ⚠️ Needs work |
| **Shared** | 8 | 0 | 8 | ✅ Good |
| **Convex** | 12 | 20 | 32 | ⚠️ Moderate |
| **Total** | **171** | **78** | **249** | |

---

## 🔝 Top Lint Rule Violations

### **Most Common Issues**

| Rule | Count | Category | Severity | Auto-Fix |
|------|-------|----------|----------|----------|
| `noConsole` | 8 | suspicious | Error | ✅ Yes |
| `useBlockStatements` | 4 | style | Warning | ✅ Yes |
| `noExplicitAny` | 2 | suspicious | Error | ❌ No |
| `useParseIntRadix` | 2 | correctness | Error | ✅ Yes |
| `noUnusedVariables` | 2 | correctness | Error | ✅ Yes* |
| `noUnusedImports` | 2 | correctness | Error | ✅ Yes |

*\*Can be prefixed with underscore if intentionally unused*

---

## 📝 Issue Categories

### **1. Suspicious Code (10+ issues)**
- **`noConsole`**: Debug console statements left in code
  - Example: `console.log()`, `console.error()`, `console.warn()`
  - Fix: Remove or replace with proper logging
  
- **`noExplicitAny`**: Using `any` type disables type checking
  - Example: `const data: any = {}`
  - Fix: Define proper types

### **2. Correctness Issues (6+ issues)**
- **`useParseIntRadix`**: Missing radix parameter in parseInt
  - Example: `Number.parseInt(value)` 
  - Fix: `Number.parseInt(value, 10)`
  
- **`noUnusedVariables`**: Variables declared but never used
  - Fix: Remove or prefix with underscore

- **`noUnusedImports`**: Imports that aren't used
  - Fix: Remove unused imports

### **3. Style Issues (4+ issues)**
- **`useBlockStatements`**: Missing curly braces
  - Example: `if (condition) return value;`
  - Fix: `if (condition) { return value; }`

---

## 🔧 Quick Fix Commands

### **Auto-fix all fixable issues:**
```bash
# Fix everything at once (use with caution)
bun run lint:fix

# Or fix by package
cd packages/web && bun run lint:fix
cd packages/worker && bun run lint:fix
cd packages/cli && bun run lint:fix
cd packages/shared && bun run lint:fix
bun run lint:convex --fix
```

### **Check specific packages:**
```bash
bun run lint:cli     # Check CLI package
bun run lint:web     # Check Web package  
bun run lint:worker  # Check Worker package
bun run lint:convex  # Check Convex functions
```

---

## 🎯 Priority Actions

### **High Priority (Security/Correctness)**
1. Fix `noExplicitAny` - Type safety issues (2 instances)
2. Fix `useParseIntRadix` - Potential parsing bugs (2 instances)
3. Fix `noUnusedVariables` - Code clarity (2 instances)

### **Medium Priority (Code Quality)**
1. Remove `console.*` statements (8 instances)
2. Add block statements for clarity (4 instances)

### **Low Priority (Cleanup)**
1. Remove unused imports (2 instances)

---

## 📈 Package-Specific Issues

### **Web Package (103 issues)**
- Main problems: React hooks, unused imports, console statements
- Recommendation: Run auto-fix first, then review remaining issues

### **Worker Package (100 issues)**  
- Main problems: Console logging, unused variables
- Recommendation: Replace console.log with proper logging system

### **Convex (32 issues)**
- Main problems: Missing radix, console statements, any types
- Recommendation: Manual review needed for `any` types

### **CLI Package (5 issues)**
- Very clean, minor issues only
- Quick manual fix recommended

### **Shared Package (8 issues)**
- Minimal issues, mostly unused exports
- Review if exports are needed by other packages

---

## ✅ Resolution Plan

### **Step 1: Auto-fix safe issues**
```bash
bun run lint:fix
```
This will automatically fix ~95% of issues including:
- Missing radix parameters
- Missing block statements  
- Console statements removal
- Unused imports

### **Step 2: Manual fixes needed for:**
1. `noExplicitAny` - Define proper TypeScript types
2. Some `noUnusedVariables` - Decide if needed or remove
3. Review auto-fix changes to ensure correctness

### **Step 3: Verify fixes**
```bash
bun run lint
bun run typecheck
bun run build
```

---

## 📊 Expected After Fix

| Package | Remaining Issues | 
|---------|-----------------|
| CLI | 0-1 |
| Web | 5-10 |
| Worker | 5-10 |
| Shared | 0-2 |
| Convex | 2-5 |
| **Total** | **~15-30** |

Most remaining issues will be:
- Intentional console.log for debugging
- Complex type definitions needing manual review
- Business logic dependent code

---

## 💡 Recommendations

1. **Run auto-fix**: Most issues are automatically fixable
2. **Setup pre-commit hooks**: Prevent new lint issues
3. **Configure exceptions**: Add biome-ignore comments for intentional violations
4. **Consider relaxing rules**: Some rules like `noConsole` might be too strict for development

---

*Report generated after configuration standardization (commit: 46cb021)*