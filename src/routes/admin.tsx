import { createFileRoute } from "@tanstack/react-router";
import AdminPanel from "@/components/generated/AdminPanel";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});
