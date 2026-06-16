import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  draft:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  planning:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  on_hold:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  superseded:
    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
  submitted:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  delayed:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function Badge({
  status,
  label,
  className,
}: {
  status?: string;
  label?: string;
  className?: string;
}) {
  const colorClass = status
    ? statusColors[status] ?? "bg-gray-100 text-gray-600"
    : "bg-gray-100 text-gray-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        colorClass,
        className
      )}
    >
      {label ?? status?.replace(/_/g, " ")}
    </span>
  );
}