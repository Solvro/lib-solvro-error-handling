// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
/* eslint-disable unicorn/no-useless-promise-resolve-reject */
/* eslint-disable @typescript-eslint/promise-function-async */
import { BaseError } from "./base.ts";
import type { BaseErrorOptions } from "./base.ts";

type ContextSpec =
  | string
  | ({ message: string } & Omit<BaseErrorOptions, "cause">);

declare global {
  interface Promise<T> {
    /**
     * Wraps the error (if any) in a BaseError, as defined by the ContextSpec
     *
     * The `context` argument may be a value or a function; functions will be lazily evaluated only if an error is thrown
     */
    addErrorContext: (context: ContextSpec | (() => ContextSpec)) => Promise<T>;
  }
}

globalThis.Promise.prototype.addErrorContext = function <T>(
  this: Promise<T>,
  context: ContextSpec | (() => ContextSpec),
): Promise<T> {
  return this.catch((error: unknown) => {
    if (typeof context === "function") {
      context = context();
    }
    if (typeof context === "string") {
      return Promise.reject(new BaseError(context, { cause: error }));
    }
    return Promise.reject(
      new BaseError(context.message, { ...context, cause: error }),
    );
  });
};
