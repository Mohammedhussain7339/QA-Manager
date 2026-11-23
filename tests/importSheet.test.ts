import { describe, it, expect } from "vitest";
import { buildRows, caseKey, parseCsv } from "../src/lib/importSheet";

const csv = "Title,,,,,,\r\nComponent;Sub Component;Test Case;Login/Logout;Behaviour;Case No.;Status\r\n" +
  'Navbar;Logo;"Click logo; home";Both;Goes Home;1;Passed\r\n;;Hover logo;Login;Pointer;2;\r\n;Search;Type keyword;Logout;Shows results;3;Failed\r\nCart;;Add item;Login/Logout;;5;\r\n';

describe("sheet import", () => {
  const rows = buildRows(parseCsv(csv), true, new Set([caseKey("Navbar", "Search", "Type keyword")]), ["Navbar", "Cart"]).rows;
  it("finds the header below a title row and parses quoted delimiters", () => {
    expect(rows[0].testCase).toBe("Click logo; home");
  });
  it("fills down blank Component and Sub Component", () => {
    expect(rows[1].component).toBe("Navbar");
    expect(rows[1].subComponent).toBe("Logo");
  });
  it("maps Login/Logout values", () => {
    expect(rows.map((r) => r.loginState)).toEqual(["Both", "Login", "Logout", "Both"]);
  });
  it("marks duplicates and invalid rows", () => {
    expect(rows[2].status).toBe("duplicate");
    expect(rows[3].status).toBe("invalid");
  });
  it("reports missing required columns", () => {
    expect(buildRows([["A", "B"], ["x", "y"]], true, new Set(), []).missing).toHaveLength(3);
  });
});
