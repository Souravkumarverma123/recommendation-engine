import { describe, expect, it } from "vitest";

import { detectLanguage, isHindiScript } from "./language";

describe("isHindiScript / detectLanguage (ticket #13)", () => {
  it("detects plain English text as English", () => {
    expect(isHindiScript("500 ergonomic office chairs")).toBe(false);
    expect(detectLanguage("500 ergonomic office chairs")).toBe("en");
  });

  it("detects Devanagari text as Hindi", () => {
    const spec = "कार्यालय के लिए 500 एर्गोनॉमिक कुर्सियाँ चाहिए";
    expect(isHindiScript(spec)).toBe(true);
    expect(detectLanguage(spec)).toBe("hi");
  });

  it("detects Hindi even when a canonical BIS designation is embedded in it", () => {
    const spec = "IS 456 के अनुसार आरसीसी निर्माण कार्य";
    expect(detectLanguage(spec)).toBe("hi");
  });

  it("treats a bare designation or empty string as English", () => {
    expect(detectLanguage("IS 456:2000")).toBe("en");
    expect(detectLanguage("")).toBe("en");
  });
});
