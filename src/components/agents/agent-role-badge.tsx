import type { AgentRole } from "@/types/database";
import { AGENT_ROLE_LABELS, AGENT_ROLE_TONES } from "@/lib/agents";
import { Badge } from "@/components/ui/badge";

/** `ListingStatusBadge` / `CustomerStatusBadge` ile aynı desen. */
export function AgentRoleBadge({
  role,
  size = "sm",
}: {
  role: AgentRole;
  size?: "sm" | "md";
}) {
  return (
    <Badge variant={AGENT_ROLE_TONES[role]} size={size}>
      {AGENT_ROLE_LABELS[role]}
    </Badge>
  );
}
