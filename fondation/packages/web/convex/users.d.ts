export declare const createOrUpdateUser: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    avatarUrl?: string | undefined;
    githubId: string;
    username: string;
}, Promise<import("convex/values").GenericId<"users">>>;
export declare const getUserByGithubId: import("convex/server").RegisteredQuery<"public", {
    githubId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    email?: string | undefined;
    avatarUrl?: string | undefined;
    githubAccessToken?: string | undefined;
    githubId: string;
    username: string;
    createdAt: number;
} | null>>;
export declare const getCurrentUser: import("convex/server").RegisteredQuery<"public", {
    githubId?: string | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    email?: string | undefined;
    avatarUrl?: string | undefined;
    githubAccessToken?: string | undefined;
    githubId: string;
    username: string;
    createdAt: number;
} | null>>;
export declare const getDashboardStats: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    totalRepositories: number;
    totalDocsGenerated: number;
    activeJobs: number;
    successRate: number;
    recentRepositories: number;
    recentDocs: number;
}>>;
/**
 * Securely store or update a user's GitHub access token
 * The token will be encrypted before storage
 */
export declare const updateGitHubToken: import("convex/server").RegisteredMutation<"public", {
    githubId: string;
    accessToken: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get a user's GitHub access token (will be decrypted if encrypted)
 * Returns null if no token is stored
 */
export declare const getGitHubToken: import("convex/server").RegisteredQuery<"public", {
    githubId: string;
}, Promise<string | null>>;
//# sourceMappingURL=users.d.ts.map