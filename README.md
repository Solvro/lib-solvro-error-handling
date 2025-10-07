# Solvro error handling

A small utility library that makes rich error handling easier.

## Contents

### base

Contains the definition of the `BaseError` interface and class.

All errors are expected to conform to the `IBaseError` interface.
Non-conformant errors can be corrected/reconstructed using the `toIBaseError` function.
`isIBaseError` can be used to verify that an error correctly implements `IBaseError`.

The `BaseError` interface and class allows errors to contain information about the error code, the suggested response code (if the error is to be sent over HTTP), whether the error should be logged or sent over a network with full details, and more.

See the documentation (in code) for more details.

### install-context

This module should be side-effect imported as early as possible.

This module registers the `addErrorContext` function on all `Promise`s, inspired by Rust's [`anyhow` library](https://docs.rs/anyhow/latest/anyhow/).

The following code using `addErrorContext`...

```ts
await someAsyncFunction().addErrorContext("Failed to make some request");
```

can be written without this library like this:

```ts
try {
  await someAsyncFunction();
} catch (e) {
  throw new Error("Failed to make some request", { cause: e });
}
```

(but that code is much uglier)

`addErrorContext` can also take in a function as a parameter, in which case it will be called only if the promise rejects. Use this to lazily create context strings with parameters, like this:

```ts
for (const item of someArray) {
  await someAsyncFunction(item).addErrorContext(
    () => `Failed to run the function on an item with ID ${item.id}`,
  );
}
```

The context value can also be an object instead of a simple string, with the same allowed properties as the `BaseError` constructor options. This allows you to easily set response codes for errors thrown from functions.

```ts
await fetchSomeRecordFromTheDatabase().addErrorContext({
  message: "Record not found",
  status: 404,
  code: "E_RECORD_NOT_FOUND",
  silent: true,
});
```

### Reporting

This module contains functions used for analyzing error stacks and reporting them to the console or sending as a JSON response.

The `analyzeErrorStack` function takes any `IBaseError`, analyzing it and returning an `ErrorReport`.

This `ErrorReport` can then be passed to `prepareReportForLogging` or `serializeErrorReport`.

The `prepareReportForLogging` function converts an `ErrorReport` to a multi-line string, intended to be logged. The returned string will include the full context stack and stack trace, even if the final `ErrorReport` had `sensitive` or `silent` set.

The `serializeErrorReport` function strips out unnecessary information (and the `causeStack`, if `sensitive` is set), and returns a JSON response, intended to be sent to the client.

These functions can be used to create a full error handler, such as this one for adonis:

```ts
export default class HttpExceptionHandler extends ExceptionHandler {
  async handle(error: unknown, ctx: HttpContext) {
    const report = analyzeErrorStack(toIBaseError(error));
    const payload = serializeErrorReport(report, {
      includeStackTrace: !app.inProduction,
    });
    ctx.response.status(report.status).send(payload);
  }

  async report(error: unknown, ctx: HttpContext) {
    const report = analyzeErrorStack(toIBaseError(error));
    if (report.silent) {
      return;
    }
    logger.error(
      `Error thrown while handling route ${ctx.route?.pattern ?? "<unknown>"}: ${prepareReportForLogging(report)}`,
    );
  }
}
```

## License

This library is licensed under MPL-2.0.
