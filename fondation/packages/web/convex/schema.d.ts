declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        avatarUrl?: string | undefined;
        githubAccessToken?: string | undefined;
        githubId: string;
        username: string;
        createdAt: number;
    }, {
        githubId: import("convex/values").VString<string, "required">;
        username: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        githubAccessToken: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "githubId" | "username" | "email" | "avatarUrl" | "githubAccessToken" | "createdAt">, {
        by_github_id: ["githubId", "_creationTime"];
    }, {}, {}>;
    repositories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        lastFetched?: number | undefined;
        lastAnalyzedAt?: number | undefined;
        languages?: {
            primary: string;
            all: {
                bytes: number;
                name: string;
                percentage: number;
            }[];
        } | undefined;
        stats?: {
            stars: number;
            forks: number;
            issues: number;
        } | undefined;
        userId: import("convex/values").GenericId<"users">;
        githubRepoId: string;
        name: string;
        fullName: string;
        defaultBranch: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        githubRepoId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        fullName: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        defaultBranch: import("convex/values").VString<string, "required">;
        lastFetched: import("convex/values").VFloat64<number | undefined, "optional">;
        lastAnalyzedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        languages: import("convex/values").VObject<{
            primary: string;
            all: {
                bytes: number;
                name: string;
                percentage: number;
            }[];
        } | undefined, {
            primary: import("convex/values").VString<string, "required">;
            all: import("convex/values").VArray<{
                bytes: number;
                name: string;
                percentage: number;
            }[], import("convex/values").VObject<{
                bytes: number;
                name: string;
                percentage: number;
            }, {
                name: import("convex/values").VString<string, "required">;
                percentage: import("convex/values").VFloat64<number, "required">;
                bytes: import("convex/values").VFloat64<number, "required">;
            }, "required", "bytes" | "name" | "percentage">, "required">;
        }, "optional", "primary" | "all">;
        stats: import("convex/values").VObject<{
            stars: number;
            forks: number;
            issues: number;
        } | undefined, {
            stars: import("convex/values").VFloat64<number, "required">;
            forks: import("convex/values").VFloat64<number, "required">;
            issues: import("convex/values").VFloat64<number, "required">;
        }, "optional", "stars" | "forks" | "issues">;
    }, "required", "userId" | "githubRepoId" | "name" | "fullName" | "description" | "defaultBranch" | "lastFetched" | "lastAnalyzedAt" | "languages" | "stats" | "languages.primary" | "languages.all" | "stats.stars" | "stats.forks" | "stats.issues">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    jobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string | undefined;
        runAt?: number | undefined;
        attempts?: number | undefined;
        maxAttempts?: number | undefined;
        lockedBy?: string | undefined;
        leaseUntil?: number | undefined;
        dedupeKey?: string | undefined;
        lastError?: string | undefined;
        updatedAt?: number | undefined;
        completedAt?: number | undefined;
        progress?: string | undefined;
        currentStep?: number | undefined;
        totalSteps?: number | undefined;
        result?: string | {
            data?: string | undefined;
            message?: string | undefined;
            success: boolean;
        } | null | undefined;
        docsCount?: number | undefined;
        cancelRequested?: boolean | undefined;
        runId?: string | undefined;
        regenerationStats?: {
            inserted: number;
            updated: number;
            skipped: number;
            rejected: number;
            deleted: number;
        } | undefined;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        repositoryId: import("convex/values").GenericId<"repositories">;
        status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
        prompt: string;
        callbackToken: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        repositoryId: import("convex/values").VId<import("convex/values").GenericId<"repositories">, "required">;
        status: import("convex/values").VUnion<"pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"claimed", "required">, import("convex/values").VLiteral<"cloning", "required">, import("convex/values").VLiteral<"analyzing", "required">, import("convex/values").VLiteral<"gathering", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"canceled", "required">, import("convex/values").VLiteral<"dead", "required">], "required", never>;
        prompt: import("convex/values").VString<string, "required">;
        callbackToken: import("convex/values").VString<string, "required">;
        runAt: import("convex/values").VFloat64<number | undefined, "optional">;
        attempts: import("convex/values").VFloat64<number | undefined, "optional">;
        maxAttempts: import("convex/values").VFloat64<number | undefined, "optional">;
        lockedBy: import("convex/values").VString<string | undefined, "optional">;
        leaseUntil: import("convex/values").VFloat64<number | undefined, "optional">;
        dedupeKey: import("convex/values").VString<string | undefined, "optional">;
        lastError: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        progress: import("convex/values").VString<string | undefined, "optional">;
        currentStep: import("convex/values").VFloat64<number | undefined, "optional">;
        totalSteps: import("convex/values").VFloat64<number | undefined, "optional">;
        result: import("convex/values").VUnion<string | {
            data?: string | undefined;
            message?: string | undefined;
            success: boolean;
        } | null | undefined, [import("convex/values").VObject<{
            data?: string | undefined;
            message?: string | undefined;
            success: boolean;
        }, {
            success: import("convex/values").VBoolean<boolean, "required">;
            message: import("convex/values").VString<string | undefined, "optional">;
            data: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "data" | "success" | "message">, import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "optional", "data" | "success" | "message">;
        error: import("convex/values").VString<string | undefined, "optional">;
        docsCount: import("convex/values").VFloat64<number | undefined, "optional">;
        cancelRequested: import("convex/values").VBoolean<boolean | undefined, "optional">;
        runId: import("convex/values").VString<string | undefined, "optional">;
        regenerationStats: import("convex/values").VObject<{
            inserted: number;
            updated: number;
            skipped: number;
            rejected: number;
            deleted: number;
        } | undefined, {
            inserted: import("convex/values").VFloat64<number, "required">;
            updated: import("convex/values").VFloat64<number, "required">;
            skipped: import("convex/values").VFloat64<number, "required">;
            rejected: import("convex/values").VFloat64<number, "required">;
            deleted: import("convex/values").VFloat64<number, "required">;
        }, "optional", "inserted" | "updated" | "skipped" | "rejected" | "deleted">;
    }, "required", "error" | "createdAt" | "userId" | "repositoryId" | "status" | "prompt" | "callbackToken" | "runAt" | "attempts" | "maxAttempts" | "lockedBy" | "leaseUntil" | "dedupeKey" | "lastError" | "updatedAt" | "completedAt" | "progress" | "currentStep" | "totalSteps" | "result" | "docsCount" | "cancelRequested" | "runId" | "regenerationStats" | "result.data" | "result.success" | "result.message" | "regenerationStats.inserted" | "regenerationStats.updated" | "regenerationStats.skipped" | "regenerationStats.rejected" | "regenerationStats.deleted">, {
        by_user: ["userId", "_creationTime"];
        by_repository: ["repositoryId", "_creationTime"];
        by_status_runAt: ["status", "runAt", "_creationTime"];
        by_leaseUntil: ["leaseUntil", "_creationTime"];
        by_dedupeKey: ["dedupeKey", "_creationTime"];
    }, {}, {}>;
    docs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        runId?: string | undefined;
        sourceKey?: string | undefined;
        normalizedAt?: number | undefined;
        createdAt: number;
        repositoryId: import("convex/values").GenericId<"repositories">;
        jobId: import("convex/values").GenericId<"jobs">;
        slug: string;
        title: string;
        chapterIndex: number;
        content: string;
        kind: "yaml" | "chapter" | "tutorial" | "toc";
    }, {
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs">, "required">;
        repositoryId: import("convex/values").VId<import("convex/values").GenericId<"repositories">, "required">;
        slug: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        chapterIndex: import("convex/values").VFloat64<number, "required">;
        kind: import("convex/values").VUnion<"yaml" | "chapter" | "tutorial" | "toc", [import("convex/values").VLiteral<"chapter", "required">, import("convex/values").VLiteral<"tutorial", "required">, import("convex/values").VLiteral<"toc", "required">, import("convex/values").VLiteral<"yaml", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        sourceKey: import("convex/values").VString<string | undefined, "optional">;
        runId: import("convex/values").VString<string | undefined, "optional">;
        normalizedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "repositoryId" | "updatedAt" | "runId" | "jobId" | "slug" | "title" | "chapterIndex" | "content" | "sourceKey" | "normalizedAt" | "kind">, {
        by_job: ["jobId", "_creationTime"];
        by_repository: ["repositoryId", "_creationTime"];
        by_source_key: ["sourceKey", "_creationTime"];
    }, {}, {}>;
    jobLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        jobId: import("convex/values").GenericId<"jobs">;
        ts: number;
        seq: number;
        level: "error" | "info";
        msg: string;
    }, {
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs">, "required">;
        ts: import("convex/values").VFloat64<number, "required">;
        seq: import("convex/values").VFloat64<number, "required">;
        level: import("convex/values").VUnion<"error" | "info", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        msg: import("convex/values").VString<string, "required">;
    }, "required", "jobId" | "ts" | "seq" | "level" | "msg">, {
        by_job: ["jobId", "_creationTime"];
        by_job_seq: ["jobId", "seq", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
