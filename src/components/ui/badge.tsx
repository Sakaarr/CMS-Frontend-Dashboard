import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  planning: "bg-blue-100 text-blue-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  superseded: "bg-gray-100 text-gray-500",
  submitted: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  delayed: "bg-red-100 text-red-700",
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