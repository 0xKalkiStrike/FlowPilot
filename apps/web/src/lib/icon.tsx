import type React from "react";
import * as icons from "lucide-react";
import { Box, type LucideProps } from "lucide-react";

/** Resolves a node-registry icon name (a lucide-react export name) to its
 * component, falling back to a generic box icon for any name that doesn't
 * exist in the installed lucide-react version. */
export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? Box;
  return <Icon {...props} />;
}
