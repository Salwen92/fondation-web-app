export declare const upsertFromJob: import("convex/server").RegisteredMutation<"public", {
    runId?: string | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
    jobId: import("convex/values").GenericId<"jobs">;
    files: {
        chapterIndex?: number | undefined;
        slug: string;
        title: string;
        content: string;
        kind: "chapter" | "tutorial" | "toc" | "yaml";
    }[];
    summary: {
        chaptersCount: number;
        tutorialsCount: number;
        generatedAt: number;
    };
}, Promise<{
    docsCount: number;
    docIds: any[];
    stats: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    };
}>>;
export declare const listByJobId: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"docs">;
    _creationTime: number;
    updatedAt?: number | undefined;
    runId?: string | undefined;
    sourceKey?: string | undefined;
    normalizedAt?: number | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
    createdAt: number;
    jobId: import("convex/values").GenericId<"jobs">;
    slug: string;
    title: string;
    chapterIndex: number;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
}[]>>;
export declare const getBySlug: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
    slug: string;
}, Promise<{
    _id: import("convex/values").GenericId<"docs">;
    _creationTime: number;
    updatedAt?: number | undefined;
    runId?: string | undefined;
    sourceKey?: string | undefined;
    normalizedAt?: number | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
    createdAt: number;
    jobId: import("convex/values").GenericId<"jobs">;
    slug: string;
    title: string;
    chapterIndex: number;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
} | null>>;
export declare const listByRepository: import("convex/server").RegisteredQuery<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    _id: import("convex/values").GenericId<"docs">;
    _creationTime: number;
    updatedAt?: number | undefined;
    runId?: string | undefined;
    sourceKey?: string | undefined;
    normalizedAt?: number | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
    createdAt: number;
    jobId: import("convex/values").GenericId<"jobs">;
    slug: string;
    title: string;
    chapterIndex: number;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
}[]>>;
export declare const normalizeExistingDocs: import("convex/server").RegisteredMutation<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    totalDocs: number;
    normalizedCount: number;
    message: string;
}>>;
export declare const cleanupDuplicates: import("convex/server").RegisteredMutation<"public", {
    dryRun?: boolean | undefined;
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    dryRun: boolean;
    message: string;
    total: number;
    duplicateGroups: number;
    deleted: number;
    kept: number;
    emptyDeleted: number;
}>>;
export declare const cleanupOldGenerations: import("convex/server").RegisteredMutation<"internal", {
    repositoryId: import("convex/values").GenericId<"repositories">;
    keepLatestJobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    deletedDocsCount: number;
    deletedJobsCount: number;
    deletedJobIds: string[];
}>>;
export declare const exportAll: import("convex/server").RegisteredQuery<"public", {
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"docs">;
    _creationTime: number;
    updatedAt?: number | undefined;
    runId?: string | undefined;
    sourceKey?: string | undefined;
    normalizedAt?: number | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
    createdAt: number;
    jobId: import("convex/values").GenericId<"jobs">;
    slug: string;
    title: string;
    chapterIndex: number;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
}[]>>;
//# sourceMappingURL=docs.d.ts.map