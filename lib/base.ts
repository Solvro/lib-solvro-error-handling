// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
interface JsonObject {
  [k: string]: JsonEncodable;
}

type JsonEncodable =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonEncodable[];

export type ExtraResponseFields = Record<
  Exclude<string, "error">,
  JsonEncodable
>;

/**
 * The expected structure for thrown errors
 */
export interface IBaseError {
  /**
   * Error message
   */
  message: string;
  /**
   * Error code, usually following the format of 'E_SOME_ERROR_CODE'
   *
   * Codes must start with `E_`.
   */
  code?: string;
  /**
   * Suggested HTTP response code to use when handling this error
   *
   * Codes below 500 imply silent=true, unless overriden.
   */
  status?: number;
  /**
   * List of validation issues
   */
  messages?: ValidationIssue[];
  /**
   * Error stack trace
   */
  stack?: string;
  /**
   * The error that caused this error
   */
  cause?: IBaseError;
  /**
   * Should this error stack be treated as sensitive?
   *
   * Sensitive errors only include the topmost error message in the error responses and don't include the contextStack property.
   * Error stacks start as non-sensitive, each layer may overwrite the setting by defining this prop.
   * If one layer marks the stack as sensitive and later one resets it to non-sensitive, the whole error stack is revealed.
   *
   * The final value for this property for the whole error stack is derived by traversing the entire error cause chain,
   * stopping when the first error with `sensitive` defined is found.
   */
  sensitive?: boolean;
  /**
   * Should this error stack be omitted from logs?
   *
   * This is intended to be used for regular expected errors. (such as errors caused by the client's bad request)
   * If an error has the `status` property defined, this property is treated as implicitly defined based on the `status` value:
   * - status values below 500 imply silent=true
   * - status values equal or above 500 imply silent=false
   * Errors may define both `status` and `silent` to override the implied value.
   *
   * The final value for this property for the whole error stack is derived by traversing the entire error cause chain,
   * stopping when the first error with `silent` or `status` defined is found.
   */
  silent?: boolean;
  /**
   * Fields to be added to the response.
   *
   * The final extra response fields will be calculated by collecting the fields set by each error layer.
   * If two layers define the same field, the value set by the top-most error will be used.
   * Object and array values will not be merged.
   */
  extraResponseFields?: ExtraResponseFields;
}

export interface ValidationIssue {
  message: string;
}

/**
 * Verifies that a given error conforms to the IBaseError interface. Only checks the topmost error.
 *
 * @param error the error to validate
 * @returns true if the topmost error conforms to the IBaseError interface
 */
export function shallowIsIBaseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    // code
    (!("code" in error) ||
      error.code === undefined ||
      typeof error.code === "string") &&
    // status
    (!("status" in error) ||
      error.status === undefined ||
      typeof error.status === "number") &&
    // messages
    (!("messages" in error) ||
      error.messages === undefined ||
      (Array.isArray(error.messages) &&
        error.messages.every(
          (value) =>
            typeof value === "object" &&
            value !== null &&
            "message" in value &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- why no type inferrence
            typeof value.message === "string",
        ))) &&
    // stack
    (!("stack" in error) ||
      error.stack === undefined ||
      typeof error.stack === "string") &&
    // sensitive
    (!("sensitive" in error) ||
      error.sensitive === undefined ||
      typeof error.sensitive === "boolean") &&
    // silent
    (!("silent" in error) ||
      error.silent === undefined ||
      typeof error.silent === "boolean") &&
    // extraResponseFields
    (!("extraResponseFields" in error) ||
      error.extraResponseFields === undefined ||
      (typeof error.extraResponseFields === "object" &&
        error.extraResponseFields !== null &&
        !("error" in error.extraResponseFields)))
  );
}

/**
 * Verifies that a given error conforms to the IBaseError interface, recursively checking all cause errors.
 *
 * @param error the error to validate
 * @returns true if the entire error stack conforms to the IBaseError interface
 */
export function isIBaseError(error: unknown): error is IBaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    shallowIsIBaseError(error) &&
    (!("cause" in error) ||
      error.cause === undefined ||
      isIBaseError(error.cause))
  );
}

/**
 * Attempts to adjust the given error to conform to the IBaseError interface
 *
 * This function will:
 * - stringify non-object errors
 * - reconstruct the error object if inconsistencies are detected, correcting them
 *   - some values may be deleted, some may be stringified, some JSON-serialized
 *
 * Note: results of this function are NOT guaranteed to be an instance of Error or BaseError!
 *
 * @param error the error to cast
 * @returns validated IBaseError. may be a different object than passed in.
 */
export function toIBaseError(error: unknown): IBaseError {
  if (typeof error !== "object" || error === null) {
    return {
      message: String(error),
    };
  }
  if (!shallowIsIBaseError(error)) {
    // something's wrong on this level, attempt to reconstruct an object with valid parts
    const reconstructed: IBaseError = {
      message:
        "message" in error && typeof error.message === "string"
          ? error.message
          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- oh typescript... you haven't seen anything yet
            (JSON.stringify(error) ??
            "<an error value so weird, that i've got zero idea how to handle it>"),
    };
    if ("code" in error && typeof error.code === "string") {
      reconstructed.code = error.code;
    }
    if ("status" in error && typeof error.status === "number") {
      reconstructed.status = error.status;
    }
    if ("messages" in error && Array.isArray(error.messages)) {
      reconstructed.messages = error.messages.map((message) => {
        if (typeof message === "string") {
          return { message };
        }
        if (typeof message === "object" && "message" in message) {
          return message as ValidationIssue;
        }
        return {
          message:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- TS hasn't seen anything yet lol
            JSON.stringify(message) ??
            "<the original validation message was really weird and could not be serialized>",
        };
      });
    }
    if ("stack" in error && typeof error.stack === "string") {
      reconstructed.stack = error.stack;
    }
    if ("sensitive" in error && typeof error.sensitive === "boolean") {
      reconstructed.sensitive = error.sensitive;
    }
    if ("silent" in error && typeof error.silent === "boolean") {
      reconstructed.silent = error.silent;
    }
    if ("cause" in error && error.cause !== undefined && error.cause !== null) {
      reconstructed.cause = toIBaseError(error.cause);
    }
    if (
      "extraResponseFields" in error &&
      error.extraResponseFields !== undefined &&
      error.extraResponseFields !== null &&
      typeof error.extraResponseFields === "object"
    ) {
      reconstructed.extraResponseFields = error.extraResponseFields as Record<
        string,
        JsonEncodable
      >;
      if ("error" in reconstructed.extraResponseFields) {
        delete reconstructed.extraResponseFields.error;
      }
    }
    return reconstructed;
  }
  // everything's good on this level, check below and cast
  if ("cause" in error) {
    if (error.cause === undefined || error.cause === null) {
      delete error.cause;
    } else {
      error.cause = toIBaseError(error.cause);
    }
  }
  return error as IBaseError;
}

/**
 * Parameter structure for creating BaseErrors
 */
export type BaseErrorOptions = Partial<{
  code: string;
  status: number;
  messages: (ValidationIssue | string)[];
  cause: unknown;
  sensitive: boolean;
  silent: boolean;
  extraResponseFields: ExtraResponseFields;
}>;

/**
 * A subclass of Error with a convienient constructor that allows for setting IBaseError properties
 *
 * Cause values will be reconstructed if they do not conform to the IBaseError interface.
 */
export class BaseError extends Error implements IBaseError {
  cause?: IBaseError;
  code?: string;
  status?: number;
  messages?: ValidationIssue[];
  sensitive?: boolean;
  silent?: boolean;
  extraResponseFields?: ExtraResponseFields;

  constructor(
    message: string,
    {
      code,
      status,
      messages,
      cause,
      sensitive,
      silent,
      extraResponseFields,
    }: BaseErrorOptions = {},
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.messages = messages?.map((issue) =>
      typeof issue === "string" ? { message: issue } : issue,
    );
    this.cause = cause === undefined ? undefined : toIBaseError(cause);
    this.sensitive = sensitive;
    this.silent = silent;
    this.extraResponseFields = extraResponseFields;
  }
}
