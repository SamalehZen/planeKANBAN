import { layout, route } from "@react-router/dev/routes";
import type { RouteConfigEntry } from "@react-router/dev/routes";

export const extendedRoutes: RouteConfigEntry[] = [
  layout("./(all)/layout.tsx", [
    route("demo/voice-assistant", "./(all)/demo/voice-assistant/page.tsx"),
  ]),
];
