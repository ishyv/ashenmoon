import { describe, expect, test } from "vitest";
import { bodyToWrappedPosition, mapWrappedMarkerToBody, wrapScriptBody } from "./monaco-mapping";

describe("monaco script wrapper mapping", () => {
  test("wraps a script body in an async function for TypeScript analysis", () => {
    const wrapped = wrapScriptBody("return ctx.guild.name;");

    expect(wrapped.code).toContain("async function __tx_script_main");
    expect(wrapped.code).toContain("return ctx.guild.name;");
    expect(wrapped.bodyStartLine).toBeGreaterThan(1);
  });

  test("strips imports of tx-discord-bot while preserving lines", () => {
    const body = `import {\n  ctx,\n  title\n} from "tx-discord-bot";\nreturn ctx.guild.name;`;
    const wrapped = wrapScriptBody(body);

    expect(wrapped.code).not.toContain("tx-discord-bot");
    expect(wrapped.code).toContain("return ctx.guild.name;");
    expect(wrapped.code.split("\n").length).toBe(
      wrapScriptBody("return ctx.guild.name;").code.split("\n").length + 4,
    );
  });

  test("maps body positions into the hidden wrapper", () => {
    const wrapped = wrapScriptBody("const x = 1;\nreturn x;");

    expect(bodyToWrappedPosition(wrapped, { lineNumber: 2, column: 7 })).toEqual({
      lineNumber: wrapped.bodyStartLine + 1,
      column: 7,
    });
  });

  test("maps hidden wrapper diagnostics back onto body lines", () => {
    const wrapped = wrapScriptBody("const x = 1;\nreturn x;");

    expect(
      mapWrappedMarkerToBody(wrapped, {
        startLineNumber: wrapped.bodyStartLine + 1,
        startColumn: 8,
        endLineNumber: wrapped.bodyStartLine + 1,
        endColumn: 9,
        message: "bad",
        severity: 8,
      }),
    ).toMatchObject({
      startLineNumber: 2,
      startColumn: 8,
      endLineNumber: 2,
      endColumn: 9,
    });
  });
});
