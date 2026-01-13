import type { Route } from "./+types/page";

export const loader = async (_args: Route.LoaderArgs) => {
  return Response.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "plane-space",
  });
};

export default function HealthPage() {
  return null;
}
