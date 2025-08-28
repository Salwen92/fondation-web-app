export declare const updateRepositoryMetadata: import("convex/server").RegisteredMutation<"public", {
    lastAnalyzedAt?: number | undefined;
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    success: boolean;
} | null>>;
export declare const getRepositoryWithMetadata: import("convex/server").RegisteredQuery<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    isStale: boolean;
    _id: import("convex/values").GenericId<"repositories">;
    _creationTime: number;
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
} | null>>;
