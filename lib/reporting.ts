// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
import type { ExtraErrorIdentifiers, ExtraResponseFields, IBaseError, ValidationIssue } from "./base.ts";





/**
 * Result of error stack analysis
 */
export interface ErrorReport {
  /**
   * Message of the top-level error
   */
  message: string;
  /**
   * Most recently set error code in the stack
   *
   * 'E_UNEXPECTED_ERROR' is used if no error in the error cause chain defines a `code` property.
   */
  code: string;
  /**
   * Most recently set response status code
   *
   * 500 is used if no error in the error cause chain defines a `status` property.
   */
  status: number;
  /**
   * List of validation errors as most recently defined
   */
  validationIssues?: ValidationIssue[];
  /**
   * List of all error messages in the cause stack (starting from the top-level error)
   */
  causeStack: string[];
  /**
   * Stack trace of the root cause error (bottom of the stack)
   */
  rootStackTrace: string[];
  /**
   * Most recently set value of the sensitive property
   */
  sensitive: boolean;
  /**
   * Most recently set value of the silent property
   */
  silent: boolean;
  /**
   * Final extra response field set
   */
  extraResponseFields: ExtraResponseFields;
  /**
   * Final extra error identifiers set
   */
  extraErrorIdentifiers: ExtraErrorIdentifiers;
}

/**
 * Analyze the given error stack and output an ErrorReport
 *
 * ErrorReport values can be stripped down and sent as a response, or can be used to generate a log entry using `prepareReportForLogging()`
 *
 * @param topError the IBaseError error stack
 * @returns an ErrorReport representing the given error stack
 */
export function analyzeErrorStack(topError: IBaseError): ErrorReport {
  let currentError: IBaseError = {cause: topError} as IBaseError;
  let lastStack: string | undefined;
  const result: Partial<ErrorReport> & {
    causeStack: string[];
    extraResponseFields: ExtraResponseFields;
    extraErrorIdentifiers: ExtraErrorIdentifiers;
  } = {
    causeStack: [],
    extraResponseFields: {},
    extraErrorIdentifiers: {},
  };
  while (currentError.cause !== undefined) {
    currentError = currentError.cause;
    result.causeStack.push(currentError.message);
    result.status ??= currentError.status;
    result.code ??= currentError.code;
    result.validationIssues ??= currentError.messages;
    result.sensitive ??= currentError.sensitive;
    result.silent ??=
      currentError.silent ??
      (currentError.status !== undefined
        ? currentError.status < 500
        : undefined);
    if (currentError.extraResponseFields !== undefined) {
      for (const [key, value] of Object.entries(
        currentError.extraResponseFields,
      )) {
        if (key !== "error" && !(key in result.extraResponseFields)) {
          result.extraResponseFields[key] = value;
        }
      }
    }
    if (currentError.extraErrorIdentifiers !== undefined) {
      for (const [key, value] of Object.entries(
        currentError.extraErrorIdentifiers,
      )) {
        if (!(key in result.extraErrorIdentifiers)) {
          result.extraErrorIdentifiers[key] = value;
        }
      }
    }
  }
  let cwd: string | undefined;
  try {
    cwd = process.cwd();
  } catch {}
  return {
    message: topError.message,
    status: result.status ?? 500,
    code: result.code ?? "E_UNEXPECTED_ERROR",
    validationIssues: result.validationIssues,
    causeStack: result.causeStack,
    sensitive: result.sensitive ?? false,
    silent: result.silent ?? false,
    rootStackTrace:
      lastStack?.split("\n").flatMap((line) => {
        line = line.trim();
        if (!line.startsWith("at ")) {
          return [];
        }
        line = line
          // each stack trace line starts with "at", trim that
          .replace(/^at\s+/, "")
          // strip the file:// protocol in file paths
          .replace("file://", "");
        if (cwd !== undefined) {
          line = line
            // cwd + node_modules => external dependency, trim out the path leaving the package name at the start
            .replace(`${cwd}/node_modules/`, "")
            // replace cwd with . to make the path relative
            .replace(cwd, ".");
        }
        return line;
      }) ?? [],
    extraResponseFields: result.extraResponseFields,
    extraErrorIdentifiers: result.extraErrorIdentifiers,
  };
}

interface PrepareErrorOptions {
  /**
   * If true (or not defined), includes the error code and response status in the log.
   *
   * This is intended for logging errors from HTTP request handling, as these values don't have a meaning outside of that context.
   */
  includeCodeAndStatus: boolean;
}

const defaultPrepareErrorOptions: PrepareErrorOptions = {
  includeCodeAndStatus: true,
};

/**
 * Generates a log entry from an ErrorReport
 *
 * @param report the error report to log
 * @param options logging options
 * @returns a log entry for the given error report
 */
export function prepareReportForLogging(
  report: ErrorReport,
  options = defaultPrepareErrorOptions,
): string {
  return [
    report.message,
    ...(options.includeCodeAndStatus
      ? [`Error code: ${report.code}, status: ${report.status}`]
      : []),
    "Cause stack:",
    ...report.causeStack.map((c) => `    ${c}`),
    "Root stack trace:",
    ...report.rootStackTrace.map((f) => `    ${f}`),
    "Extra error identifiers:",
    ...Object.entries(report.extraErrorIdentifiers).map(([k, v]) => {
      return `    ${k}: ${JSON.stringify(v)}`;
    })
  ].join("\n");
}

export interface ErrorResponse {
  error: SerializedErrorReport;
}

/**
 * A representation of the server error stack, as serialized to a JSON response
 */
export interface SerializedErrorReport {
  /**
   * Message of the top-level error
   */
  message: string;
  /**
   * Most recently set error code in the error stack
   *
   * This value is derived by traversing the error stack, from the top-level error, down the error cause chain.
   * The first `code` field defined on an error becomes the value of this property.
   * 'E_UNEXPECTED_ERROR' is used if no error in the error cause chain defines a `code` property.
   */
  code: string;
  /**
   * List of validation errors for 'E_VALIDATION_ERROR' errors.
   */
  validationIssues?: ValidationIssue[];
  /**
   * Error message of each error cause in the error stack, ordered from top to bottom of the stack
   *
   * Includes the top-level error message as the first item.
   * Will be undefined if the first error in the stack that defines a `sensitive` property has it set to `true`.
   * This is intended to be used for errors that should intentionally be left opaque for security purposes, such as errors from auth endpoints.
   * "Sensitive" errors will still be fully logged.
   */
  causeStack?: string[];
  /**
   * Stack trace of the deepest error in the cause stack (the root error cause)
   *
   * Not available in production.
   */
  rootStackTrace?: string[];
}

export interface SerializeErrorReportOptions {
  /**
   * If true, includes the stack trace in the response
   */
  includeStackTrace: boolean;
}

const serializeDefaults: SerializeErrorReportOptions = {
  includeStackTrace: false,
};

/**
 * Prepare an error report for serialization as a HTTP response
 *
 * @param report the report to serialize
 * @param options serialization options
 * @returns an error response object, ready for serialization
 */
export function serializeErrorReport(
  report: ErrorReport,
  options: Partial<SerializeErrorReportOptions> = {},
): ErrorResponse {
  const fullOptions = {
    ...serializeDefaults,
    ...options,
  };

  return {
    error: {
      message: report.message,
      code: report.code,
      validationIssues: report.validationIssues,
      causeStack: report.sensitive ? undefined : report.causeStack,
      rootStackTrace: fullOptions.includeStackTrace
        ? report.rootStackTrace
        : undefined,
    },
    ...report.extraResponseFields,
  };
}
