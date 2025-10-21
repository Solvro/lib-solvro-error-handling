// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { BaseError } from "../lib/base.ts";
import { analyzeErrorStack } from "../lib/reporting.ts";

describe("reporting.ts", () => {
  describe("analyzeErrorStack", () => {
    it("simple error", () => {
      const error = new BaseError("hi");

      const report = analyzeErrorStack(error);

      expect(report).to.deep.include({
        message: "hi",
        code: "E_UNEXPECTED_ERROR",
        status: 500,
        causeStack: ["hi"],
        sensitive: false,
        silent: false,
      });
    });

    it("nested error", () => {
      const error = new BaseError("hi", { cause: "helo" });

      const report = analyzeErrorStack(error);

      expect(report).to.deep.include({
        message: "hi",
        code: "E_UNEXPECTED_ERROR",
        status: 500,
        causeStack: ["hi", "helo"],
        sensitive: false,
        silent: false,
      });
    });

    it("error with props", () => {
      const error = new BaseError("hi", {
        code: "E_LO_ŻELO",
        status: 418,
        silent: true,
      });

      const report = analyzeErrorStack(error);

      expect(report).to.deep.include({
        message: "hi",
        code: "E_LO_ŻELO",
        status: 418,
        causeStack: ["hi"],
        sensitive: false,
        silent: true,
      });
    });

    it("nested error with props", () => {
      const error = new BaseError("helo", {
        code: "E_BRUH_MOMENT",
        silent: false,
        messages: [{ message: "bruh" }, { message: "elo żelo" }],
        cause: new BaseError("hi", {
          code: "E_LO_ŻELO",
          status: 418,
          silent: true,
          sensitive: true,
        }),
      });

      const report = analyzeErrorStack(error);
      expect(report).to.deep.include({
        message: "helo",
        code: "E_BRUH_MOMENT",
        status: 418,
        causeStack: ["helo", "hi"],
        sensitive: true,
        silent: false,
        validationIssues: [{ message: "bruh" }, { message: "elo żelo" }],
      });
    });

    it("error with extra identifiers", () => {
      const error = new BaseError("helo", {
        code: "E_BRUH_MOMENT",
        silent: false,
        messages: [{ message: "bruh" }],
        cause: new BaseError("hi", {
          code: "E_LO_ŻELO",
          status: 418,
          silent: true,
          sensitive: true,
          extraErrorIdentifiers: {
            "prop2": 2
          }
        }),
        extraErrorIdentifiers: {
          "prop1": 1
        }
      });

      const report = analyzeErrorStack(error);
      expect(report).to.deep.include({
        extraErrorIdentifiers: {
          "prop1": 1,
          "prop2": 2
        }
      });
    });

    it("error with extra duplicate identifiers", () => {
      const error = new BaseError("helo", {
        code: "E_BRUH_MOMENT",
        silent: false,
        messages: [{ message: "bruh" }],
        cause: new BaseError("hi", {
          code: "E_LO_ŻELO",
          status: 418,
          silent: true,
          sensitive: true,
          extraErrorIdentifiers: {
            "prop1": 2
          }
        }),
        extraErrorIdentifiers: {
          "prop1": 1
        }
      });

      const report = analyzeErrorStack(error);
      expect(report).to.deep.include({
        extraErrorIdentifiers: {
          "prop1": 1, // Should only have the top-most value
        }
      });
    });
  });
});
