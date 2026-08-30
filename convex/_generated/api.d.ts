/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attempts from "../attempts.js";
import type * as auth from "../auth.js";
import type * as clearData from "../clearData.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as questions from "../questions.js";
import type * as quizzes from "../quizzes.js";
import type * as router from "../router.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  attempts: typeof attempts;
  auth: typeof auth;
  clearData: typeof clearData;
  comments: typeof comments;
  http: typeof http;
  migrations: typeof migrations;
  questions: typeof questions;
  quizzes: typeof quizzes;
  router: typeof router;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
