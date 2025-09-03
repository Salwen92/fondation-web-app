# Worker Simple Improvements

## Philosophy: Reliable Butler, Not Speed Demon

The worker is plumbing around the `claude analyze` command. It should be a reliable butler that schedules and monitors the analysis, never interfering with the core product.

**Current Performance: ~12 jobs/hour**  
**Goal: Same throughput, better reliability**

## Core Constraints (Never Violate)

1. **`claude analyze` is untouchable** - This is the product customers pay for
2. **No result caching** - Each analysis must be independent and fresh  
3. **No concurrency** - Shared Claude subscription depletes faster with parallel jobs
4. **No performance promises** - Focus on reliability over speed

## Three Simple Improvements (2 Weeks Total)

### 1. Adaptive Polling (Week 1: 3 days)

**Problem**: Fixed 5-second polling wastes database queries when idle

**Current Code** (`worker.ts:147`):
```typescript
await this.sleep(this.config.pollInterval); // Always 5000ms
```

**Simple Fix**: Gradual backoff when no jobs found
```typescript
class SimpleAdaptivePoller {
  private emptyPollCount = 0;
  private intervals = [5000, 10000, 20000, 30000]; // 5s → 30s max
  
  getNextInterval(): number {
    const index = Math.min(this.emptyPollCount, this.intervals.length - 1);
    const baseInterval = this.intervals[index];
    
    // Add 0-1000ms jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return baseInterval + jitter;
  }
  
  onJobFound(): void {
    this.emptyPollCount = 0; // Reset to fast polling
  }
  
  onNoJobFound(): void {
    this.emptyPollCount++;
  }
}
```

**Benefits**:
- Reduces database load during idle periods
- Maintains fast response when jobs are available
- Zero risk to job processing

**Implementation**: Replace polling loop in `worker.ts`

### 2. Proper Error Handling (Week 1-2: 4 days)

**Problem**: Silent error swallowing throughout codebase

**Current Code** (multiple locations):
```typescript
} catch (_error) {
  // Silent error swallowing
}
```

**Simple Fix**: Replace with structured logging
```typescript
import { maskSensitiveData } from './encryption'; // Use existing function

class WorkerLogger {
  async safeExecute<T>(
    operation: string, 
    fn: () => Promise<T>,
    jobId?: string
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      const safeError = maskSensitiveData(error.message);
      
      console.error(`Worker ${operation} failed`, {
        jobId,
        error: safeError,
        timestamp: new Date().toISOString(),
        workerId: this.config.workerId
      });
      
      return null;
    }
  }
}
```

**Benefits**:
- Visibility into what's actually failing
- Debugging capability for production issues
- Better error metrics for monitoring

**Implementation**: Replace ~12 silent catch blocks across worker files

### 3. Fast Job Validation (Week 2: 3 days)

**Problem**: Jobs fail after expensive git cloning and Claude quota usage

**Current Flow**:
1. Claim job from queue
2. Clone entire repository (30s-2min) 
3. Run `claude analyze` (uses quota)
4. **Then** discover job was invalid

**Simple Fix**: Validate before expensive operations
```typescript
class JobPreValidator {
  async validateBeforeProcessing(job: Job): Promise<ValidationResult> {
    // Quick checks that don't require git cloning:
    
    // 1. Repository still exists (GitHub API call - 200ms)
    const repoExists = await this.checkRepositoryExists(job.repositoryId);
    if (!repoExists) {
      return { valid: false, reason: 'Repository not found or deleted' };
    }
    
    // 2. User still has valid GitHub token
    const tokenValid = await this.validateGitHubToken(job.userId);
    if (!tokenValid) {
      return { valid: false, reason: 'User GitHub token expired' };
    }
    
    // 3. Repository isn't too large (GitHub API - get repo size)
    const repoSize = await this.getRepositorySize(job.repositoryId);
    if (repoSize > 5000) { // 5GB limit
      return { valid: false, reason: 'Repository too large for analysis' };
    }
    
    return { valid: true };
  }
}
```

**Benefits**:
- Fail fast before git cloning
- Preserve Claude quota for valid jobs
- Better user feedback on why jobs fail

**Implementation**: Add validation step in `processJob()` before cloning

## Implementation Plan

### Week 1
- **Day 1-2**: Add structured error logging (easiest win, helps debug other changes)
- **Day 3-5**: Implement adaptive polling

### Week 2  
- **Day 1-3**: Add job pre-validation
- **Day 4-5**: Testing and monitoring setup

## Success Metrics

**Not measuring performance improvements** - focus on reliability:

```yaml
reliability_metrics:
  - error_visibility: "Can debug production issues"
  - job_failure_rate: "Measure current baseline, then track"
  - invalid_job_detection: "Fail before git clone + Claude usage"
  
operational_metrics:
  - database_queries_during_idle: "Reduced (side effect of adaptive polling)"
  - worker_uptime: "No degradation"
  - job_processing_success_rate: "No degradation"
```

## What This Does NOT Do

❌ **Improve throughput** - Still ~12 jobs/hour  
❌ **Reduce Claude usage** - Same number of `analyze` calls  
❌ **Add concurrency** - Remains single-threaded  
❌ **Cache results** - Every analysis is fresh  
❌ **Modify analyze** - Core product unchanged  

## What This DOES Do

✅ **Improve reliability** - Better error handling and validation  
✅ **Reduce waste** - Fewer failed jobs after expensive operations  
✅ **Better debugging** - Visibility into production issues  
✅ **Resource efficiency** - Smarter polling when idle  

## Risk Assessment

**Low Risk Changes**: All changes are additive, no existing functionality removed

- **Adaptive Polling**: Pure optimization, fallback to old behavior if issues
- **Error Logging**: Only adds visibility, doesn't change error handling logic  
- **Job Validation**: Fails jobs earlier, same end result for invalid jobs

**Rollback Strategy**: Feature flags for each improvement, instant disable if needed

## Code Changes Required

### Files to Modify
```
packages/worker/src/
├── worker.ts          # Add adaptive polling
├── (all files)        # Replace silent error catches  
└── job-validator.ts   # New file for pre-validation
```

### Estimated Lines of Code
- **Adaptive Polling**: ~50 lines
- **Error Handling**: ~100 lines (across multiple files)
- **Job Validation**: ~150 lines

**Total**: ~300 lines of straightforward, boring code

## Conclusion

Three simple improvements that make the worker a more reliable butler:

1. **Smarter scheduling** (adaptive polling)
2. **Better reporting** (structured errors)  
3. **Faster failure detection** (job validation)

The `claude analyze` command remains untouched and perfect. The worker just gets better at its supporting role.

**Timeline**: 2 weeks  
**Risk**: Low  
**Expected Outcome**: Same throughput, fewer mystery failures, better operational visibility