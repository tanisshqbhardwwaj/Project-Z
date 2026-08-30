import { vi } from "vitest";

vi.mock("next/server", () => import("./mocks/next-server"));
