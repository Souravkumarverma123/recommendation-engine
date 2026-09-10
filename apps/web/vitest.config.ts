import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// Web tests run in node by default; switch to `environment: "jsdom"` when a
// component test needs a DOM.
export default mergeConfig(baseConfig, {});
