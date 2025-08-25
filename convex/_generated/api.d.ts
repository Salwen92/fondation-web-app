/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as cloudRun from "../cloudRun.js";
import type * as docs from "../docs.js";
import type * as jobs from "../jobs.js";
import type * as repositories from "../repositories.js";
import type * as scalewayWorker from "../scalewayWorker.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cloudRun: typeof cloudRun;
  docs: typeof docs;
  jobs: typeof jobs;
  repositories: typeof repositories;
  scalewayWorker: typeof scalewayWorker;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
