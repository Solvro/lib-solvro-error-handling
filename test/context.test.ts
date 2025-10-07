// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { wait } from "@solvro/utils/promises";

import { BaseError } from "../lib/base.ts";
import "../lib/install-context.ts";

async function delayedReject(error: unknown): Promise<never> {
  await wait(20);
  throw error;
}

async function delayedResolve<T>(value: T): Promise<T> {
  await wait(20);
  return value;
}

describe("install-context.ts", () => {
  it("calling addErrorContext on a promise that will resolve does not modify return value", async () => {
    const expected = "elo żelo";
    await expect(
      delayedResolve(expected).addErrorContext("context"),
    ).to.eventually.equal(expected);
  });

  it("calling addErrorContext on a promise that will resolve with a func does not call the func", async () => {
    const expected = "elo żelo";
    const context = chai.spy(() => "context");
    await expect(
      delayedResolve(expected).addErrorContext(context),
    ).to.eventually.equal(expected);
    expect(context).to.not.have.been.called();
  });

  it("calling addErrorContext on a promise that will reject wraps the error in BaseError", async () => {
    const context = "context";
    const error = new Error("hi");

    try {
      await delayedReject(error).addErrorContext(context);
      // eslint-disable-next-line unicorn/catch-error-name
    } catch (caught) {
      expect(caught).to.be.an.instanceof(BaseError);

      const baseError = caught as BaseError;
      expect(baseError.message).to.equal(context);
      expect(baseError.cause).to.equal(error);
      return;
    }
    expect.fail("addErrorContext caught error without rethrowing");
  });

  it("calling addErrorContext on a promise that will reject wraps the error in BaseError (func context)", async () => {
    const context = chai.spy(() => "context");
    const error = new Error("hi");

    try {
      await delayedReject(error).addErrorContext(context);
      // eslint-disable-next-line unicorn/catch-error-name
    } catch (caught) {
      expect(caught).to.be.an.instanceof(BaseError);

      const baseError = caught as BaseError;
      expect(baseError.message).to.equal("context");
      expect(baseError.cause).to.equal(error);
      expect(context).to.have.been.called.exactly(1);
      return;
    }
    expect.fail("addErrorContext caught error without rethrowing");
  });

  it("non-conformant errors get converted to IBaseError", async () => {
    const context = "context";
    const error = "hi";

    try {
      await delayedReject(error).addErrorContext(context);
      // eslint-disable-next-line unicorn/catch-error-name
    } catch (caught) {
      expect(caught).to.be.an.instanceof(BaseError);

      const baseError = caught as BaseError;
      expect(baseError.message).to.equal(context);
      expect(typeof baseError.cause).to.equal("object");
      expect(baseError.cause?.message).to.equal("hi");
      return;
    }
    expect.fail("addErrorContext caught error without rethrowing");
  });

  it("addErrorContext with object as context", async () => {
    const error = new Error("hi");
    const context = {
      message: "context",
      code: "E_LO_ŻELO",
    };

    try {
      await delayedReject(error).addErrorContext(context);
      // eslint-disable-next-line unicorn/catch-error-name
    } catch (caught) {
      expect(caught).to.be.an.instanceof(BaseError);

      const baseError = caught as BaseError;
      expect(baseError.message).to.equal(context.message);
      expect(baseError.code).to.equal(context.code);
      expect(baseError.cause).to.equal(error);
      return;
    }
    expect.fail("addErrorContext caught error without rethrowing");
  });

  it("addErrorContext with object as context (func context)", async () => {
    const error = new Error("hi");
    const context = {
      message: "context",
      code: "E_LO_ŻELO",
    };
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const contextFunc = chai.spy(() => context);

    try {
      await delayedReject(error).addErrorContext(contextFunc);
      // eslint-disable-next-line unicorn/catch-error-name
    } catch (caught) {
      expect(caught).to.be.an.instanceof(BaseError);

      const baseError = caught as BaseError;
      expect(baseError.message).to.equal(context.message);
      expect(baseError.code).to.equal(context.code);
      expect(baseError.cause).to.equal(error);
      expect(contextFunc).to.have.been.called.exactly(1);
      return;
    }
    expect.fail("addErrorContext caught error without rethrowing");
  });
});
