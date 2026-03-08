import { parseBatchInput } from "./parseBatch";

describe("parseBatchInput", () => {
  test("parses valid rows", () => {
    const input = `30979, Building Trades Australia\n1718, Performance Training Pty Limited`;
    const { rows, errors } = parseBatchInput(input);
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { rtoCode: "30979", rtoName: "Building Trades Australia" },
      { rtoCode: "1718", rtoName: "Performance Training Pty Limited" },
    ]);
  });

  test("ignores blank lines", () => {
    const input = `\n30979, Building Trades Australia\n\n1718, Performance Training\n`;
    const { rows, errors } = parseBatchInput(input);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  test("dedupes repeated RTO codes silently", () => {
    const input = `30979, Building Trades Australia\n30979, Building Trades Duplicate`;
    const { rows, errors } = parseBatchInput(input);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].rtoName).toBe("Building Trades Australia");
  });

  test("trims whitespace from code and name", () => {
    const input = `  30979  ,   Building Trades Australia   `;
    const { rows } = parseBatchInput(input);
    expect(rows[0]).toEqual({ rtoCode: "30979", rtoName: "Building Trades Australia" });
  });

  test("splits on first comma only — name may contain commas", () => {
    const input = `1718, Performance Training, Pty Limited`;
    const { rows, errors } = parseBatchInput(input);
    expect(errors).toHaveLength(0);
    expect(rows[0].rtoName).toBe("Performance Training, Pty Limited");
  });

  test("returns error for row missing comma", () => {
    const input = `30979 Building Trades Australia`;
    const { rows, errors } = parseBatchInput(input);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
  });

  test("returns error for empty RTO code", () => {
    const input = `, Building Trades Australia`;
    const { errors } = parseBatchInput(input);
    expect(errors[0].message).toMatch(/RTO code is empty/);
  });

  test("returns error for empty RTO name", () => {
    const input = `30979,`;
    const { errors } = parseBatchInput(input);
    expect(errors[0].message).toMatch(/RTO name is empty/);
  });

  test("returns empty result for blank input", () => {
    const { rows, errors } = parseBatchInput("   \n  \n  ");
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  test("mixes valid and invalid rows — collects both", () => {
    const input = `30979, Building Trades Australia\nbad row no comma\n1718, Performance Training`;
    const { rows, errors } = parseBatchInput(input);
    expect(rows).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
  });
});
