import type { ReactNode } from "react";
import { RoleWorkspaceShell } from "@/shared/ui/workspace/role-workspace-shell";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <RoleWorkspaceShell requiredRole="MANAGER">{children}</RoleWorkspaceShell>;
}
