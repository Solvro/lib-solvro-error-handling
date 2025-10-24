// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
import {
  FORBIDDEN_ERROR_FIELDS,
  isIBaseError,
  shallowIsIBaseError,
  toIBaseError,
} from "../lib/base.ts";

const VALUE_TYPES = {
  string: "elo żelo",
  number: 2137,
  boolean: false,
  null: null,
  undefined, // cursed
  "empty object": {},
  "arbitrary object": { elo: "żelo" },
  array: [],
};
type ValueTypes = keyof typeof VALUE_TYPES;

function forAllTypes(
  except: ValueTypes[],
  // eslint-disable-next-line unicorn/prevent-abbreviations
  fn: (name: ValueTypes, value: unknown) => void,
) {
  for (const [name, value] of Object.entries(VALUE_TYPES) as [
    ValueTypes,
    unknown,
  ][]) {
    if (except.includes(name)) {
      continue;
    }
    fn(name, value);
  }
}

describe("base.ts", () => {
  describe("shallowIsIBaseError", () => {
    describe("simple errors", () => {
      forAllTypes([], (name, value) => {
        it(`${name} is not a valid IBaseError`, () => {
          expect(shallowIsIBaseError(value)).to.be.equal(false);
        });
      });
    });

    describe("message param", () => {
      it("object with a string message is a valid IBaseError", () => {
        expect(shallowIsIBaseError({ message: "error" })).to.be.equal(true);
      });

      forAllTypes(["string"], (name, value) => {
        it(`object with ${name} as message is not a valid IBaseError`, () => {
          expect(shallowIsIBaseError({ message: value })).to.be.equal(false);
        });
      });
    });

    describe("code param", () => {
      it("object with message + string code is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({ message: "error", code: "E_ELO_ŻELO" }),
        ).to.be.equal(true);
      });

      forAllTypes(["string", "undefined"], (name, value) => {
        it(`object with message + ${name} as code is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", code: value }),
          ).to.be.equal(false);
        });
      });
    });

    describe("status param", () => {
      it("object with message + number as status is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({ message: "error", status: 500 }),
        ).to.be.equal(true);
      });

      forAllTypes(["number", "undefined"], (name, value) => {
        it(`object with message + ${name} as status is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", status: value }),
          ).to.be.equal(false);
        });
      });
    });

    describe("messages param", () => {
      it("object with message + empty array as messages is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({ message: "error", messages: [] }),
        ).to.be.equal(true);
      });

      it("object with message + array with 1 message obj as messages is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            messages: [{ message: "a" }],
          }),
        ).to.be.equal(true);
      });

      it("object with message + array with 2 message objs as messages is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            messages: [{ message: "a" }, { message: "b" }],
          }),
        ).to.be.equal(true);
      });

      forAllTypes(["array", "undefined"], (name, value) => {
        it(`object with message + ${name} as messages is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", messages: value }),
          ).to.be.equal(false);
        });
      });

      forAllTypes([], (name, value) => {
        it(`object with message + array of ${name} as messages is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", messages: [value] }),
          ).to.be.equal(false);
        });
      });

      forAllTypes(["string"], (name, value) => {
        it(`object with message + array of objects with ${name} message as messages is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({
              message: "error",
              messages: [{ message: value }],
            }),
          ).to.be.equal(false);
        });
      });

      forAllTypes([], (name, value) => {
        it(`object with message + ${name} as second messages obj is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({
              message: "error",
              messages: [{ message: "a" }, value],
            }),
          ).to.be.equal(false);
        });
      });

      forAllTypes(["string"], (name, value) => {
        it(`object with message + object with ${name} message as second messages obj is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({
              message: "error",
              messages: [{ message: "A" }, { message: value }],
            }),
          ).to.be.equal(false);
        });
      });
    });

    describe("stack param", () => {
      it("object with message + string stack is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            stack: "elo at żelo line 2137",
          }),
        ).to.be.equal(true);
      });

      forAllTypes(["string", "undefined"], (name, value) => {
        it(`object with message + ${name} as stack is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", stack: value }),
          ).to.be.equal(false);
        });
      });
    });

    describe("sensitive param", () => {
      it("object with message + bool sensitive is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            sensitive: true,
          }),
        ).to.be.equal(true);
      });

      forAllTypes(["boolean", "undefined"], (name, value) => {
        it(`object with message + ${name} as sensitive is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", sensitive: value }),
          ).to.be.equal(false);
        });
      });
    });

    describe("silent param", () => {
      it("object with message + bool silent is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            silent: true,
          }),
        ).to.be.equal(true);
      });

      forAllTypes(["boolean", "undefined"], (name, value) => {
        it(`object with message + ${name} as silent is not a valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({ message: "error", silent: value }),
          ).to.be.equal(false);
        });
      });
    });

    describe("extraResponseFields param", () => {
      it("object with message + empty object as extraResponseFields is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            extraResponseFields: {},
          }),
        ).to.be.equal(true);
      });

      it("object with message + arbitrary object as extraResponseFields is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            extraResponseFields: { elo: "żelo" },
          }),
        ).to.be.equal(true);
      });

      it("object with message + object with error field as extraResponseFields is not valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            extraResponseFields: { error: "żelo" },
          }),
        ).to.be.equal(false);
      });

      forAllTypes(
        ["empty object", "arbitrary object", "undefined"],
        (name, value) => {
          it(`object with message + ${name} as extraResponseFields is not a valid IBaseError`, () => {
            expect(
              shallowIsIBaseError({
                message: "error",
                extraResponseFields: value,
              }),
            ).to.be.equal(false);
          });
        },
      );
    });

    describe("extraErrorFields param", () => {
      it("object with message + empty object as extraErrorFields is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            extraErrorFields: {},
          }),
        ).to.be.equal(true);
      });

      it("object with message + arbitrary object as extraErrorFields is valid IBaseError", () => {
        expect(
          shallowIsIBaseError({
            message: "error",
            extraErrorFields: { elo: "żelo" },
          }),
        ).to.be.equal(true);
      });

      for (const field of FORBIDDEN_ERROR_FIELDS) {
        it(`object with message + object with ${field} field as extraErrorFields is not valid IBaseError`, () => {
          expect(
            shallowIsIBaseError({
              message: "error",
              extraErrorFields: { [field]: "żelo" },
            }),
          ).to.be.equal(false);
        });
      }

      forAllTypes(
        ["empty object", "arbitrary object", "undefined"],
        (name, value) => {
          it(`object with message + ${name} as extraErrorFields is not a valid IBaseError`, () => {
            expect(
              shallowIsIBaseError({
                message: "error",
                extraErrorFields: value,
              }),
            ).to.be.equal(false);
          });
        },
      );
    });

    describe("isIBaseError", () => {
      it("object with message + no cause is valid IBaseError", () => {
        expect(isIBaseError({ message: "Error" })).to.be.equal(true);
      });

      it("object with message + object with message as cause is valid IBaseError", () => {
        expect(
          isIBaseError({ message: "Error", cause: { message: "cause error" } }),
        ).to.be.equal(true);
      });

      forAllTypes(["undefined"], (name, value) => {
        it(`object with message + ${name} as cause is not valid IBaseError`, () => {
          expect(isIBaseError({ message: "Error", cause: value })).to.be.equal(
            false,
          );
        });
      });
    });

    describe("toIBaseError", () => {
      forAllTypes([], (name, value) => {
        it(`${name} cast to IBaseError is valid IBaseError`, () => {
          expect(isIBaseError(toIBaseError(value))).to.be.equal(true);
        });
      });

      it("simple valid IBaseError is returned unchanged", () => {
        const initial = {
          message: "hi",
          code: "E_LO_ŻELO",
          status: 418,
          messages: [{ message: "eeeee" }],
          stack: "elo at żelo line 2137",
          sensitive: false,
          silent: false,
        };
        const copied = structuredClone(initial);

        const converted = toIBaseError(initial);
        expect(converted).to.be.equal(initial);
        expect(converted).to.be.deep.equal(copied);
      });
    });
  });
});
