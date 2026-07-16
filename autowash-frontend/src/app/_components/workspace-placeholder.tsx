import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Code2 } from "lucide-react";
import { Card } from "@/shared/ui/ui/card";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { cn } from "@/shared/lib/utils";

type WorkspacePlaceholderProps = {
  workspace: "Customer" | "Staff" | "Admin" | "Auth";
  title: string;
  description: string;
  endpoints?: string[];
  links?: Array<{
    href: string;
    label: string;
  }>;
  badge?: string;
  children?: ReactNode;
};

const WORKSPACE_BADGE: Record<WorkspacePlaceholderProps["workspace"], string> = {
  Customer: "border-sky-200 bg-sky-50 text-sky-700",
  Staff: "border-violet-200 bg-violet-50 text-violet-700",
  Admin: "border-orange-200 bg-orange-50 text-orange-700",
  Auth: "border-slate-200 bg-slate-50 text-slate-700",
};

export function WorkspacePlaceholder({
  workspace,
  title,
  description,
  endpoints = [],
  links = [],
  badge,
  children,
}: WorkspacePlaceholderProps) {
  return (
    <WorkspacePage>
      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-6 py-5">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              WORKSPACE_BADGE[workspace],
            )}
          >
            {badge ?? workspace}
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-6 px-6 py-6">
          {children}
          {endpoints.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                API contract
              </div>
              <ul className="mt-3 grid gap-2">
                {endpoints.map((endpoint) => (
                  <li
                    key={endpoint}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground"
                  >
                    {endpoint}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {links.length > 0 ? (
            <nav className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"
                >
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </Card>
    </WorkspacePage>
  );
}
