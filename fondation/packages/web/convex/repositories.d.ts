export declare const fetchGitHubRepositories: import("convex/server").RegisteredAction<"public", {
    userId: import("convex/values").GenericId<"users">;
    accessToken: string;
}, Promise<{
    githubRepoId: string;
    name: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
}[]>>;
export declare const getByGithubId: import("convex/server").RegisteredQuery<"internal", {
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
}, Promise<{
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
        issues: number;
        stars: number;
        forks: number;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"internal", {
    description?: string | undefined;
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string;
}, Promise<import("convex/values").GenericId<"repositories">>>;
export declare const update: import("convex/server").RegisteredMutation<"internal", {
    description?: string | undefined;
    id: import("convex/values").GenericId<"repositories">;
    name: string;
    fullName: string;
    defaultBranch: string;
}, Promise<void>>;
export declare const listUserRepositories: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
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
        issues: number;
        stars: number;
        forks: number;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string;
}[]>>;
export declare const getByFullName: import("convex/server").RegisteredQuery<"public", {
    fullName: string;
}, Promise<{
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
        issues: number;
        stars: number;
        forks: number;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string;
}[]>>;
export declare const getByRepositoryId: import("convex/server").RegisteredQuery<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
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
        issues: number;
        stars: number;
        forks: number;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string;
} | null>>;
export declare const triggerAnalyze: import("convex/server").RegisteredMutation<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    jobId: import("convex/values").GenericId<"jobs">;
    callbackToken: string;
    repository: {
        fullName: string;
        defaultBranch: string;
    };
}>>;
