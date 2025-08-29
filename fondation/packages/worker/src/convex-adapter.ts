// Runtime Convex API adapter
// Supports both stub mode (for building) and runtime injection (for production)

let runtimeAPI: any = null;

// Initialize with real Convex API at runtime
export function initializeConvexAPI(realAPI: any) {
  runtimeAPI = realAPI;
  console.log("✅ Convex API initialized with runtime API");
}

// Proxy function that uses runtime API if available, otherwise falls back to stub
const createAPIProxy = (namespace: string, methodName: string, type: "query" | "mutation") => {
  const proxy = (() => {
    if (runtimeAPI) {
      return runtimeAPI[namespace][methodName];
    }
    console.warn(`🚧 Convex API not yet configured - ${namespace}:${methodName} stub called`);
    return null;
  }) as any;
  
  // Add properties to make it look like a Convex function reference
  proxy._name = `${namespace}:${methodName}`;
  proxy._type = type;
  return proxy;
};

export const api = {
  jobs: {
    claimJob: createAPIProxy("jobs", "claimJob", "query"),
    updateProgress: createAPIProxy("jobs", "updateProgress", "mutation"),
    complete: createAPIProxy("jobs", "complete", "mutation"),
    fail: createAPIProxy("jobs", "fail", "mutation"),
    heartbeat: createAPIProxy("jobs", "heartbeat", "mutation"),
    retryOrFail: createAPIProxy("jobs", "retryOrFail", "mutation")
  },
  queue: {
    updateJobProgress: createAPIProxy("queue", "updateJobProgress", "mutation"),
    completeJob: createAPIProxy("queue", "completeJob", "mutation"),
    failJob: createAPIProxy("queue", "failJob", "mutation"),
    heartbeat: createAPIProxy("queue", "heartbeat", "mutation"),
    claimOne: createAPIProxy("queue", "claimOne", "query"),
    complete: createAPIProxy("queue", "complete", "mutation"),
    retryOrFail: createAPIProxy("queue", "retryOrFail", "mutation")
  },
  repositories: {
    getByUrl: createAPIProxy("repositories", "getByUrl", "query"),
    getByRepositoryId: createAPIProxy("repositories", "getByRepositoryId", "query")
  },
  docs: {
    upsertMany: createAPIProxy("docs", "upsertMany", "mutation"),
    upsertFromJob: createAPIProxy("docs", "upsertFromJob", "mutation")
  }
};

export const internal = {
  jobs: {
    claimJobInternal: async (args: any) => {
      console.warn("🚧 Convex API not yet configured - using stub");
      return null;
    }
  }
};

// Stub Id type
export type Id<T extends string> = string;