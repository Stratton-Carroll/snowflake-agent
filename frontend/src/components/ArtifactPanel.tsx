import type { FC, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Maximize2 } from "lucide-react";
import { VegaLite } from "react-vega";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "../lib/utils";
import type { ChatArtifact, KeyFigure } from "../types/chat";

interface ArtifactPanelProps {
  artifacts: ChatArtifact[];
}

export const ArtifactPanel: FC<ArtifactPanelProps> = ({ artifacts }) => {
  if (artifacts.length === 0) {
    return (
      <section className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600/40 bg-slate-900/40 text-sm text-slate-400 backdrop-blur">
        <p>No artifacts for this conversation yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </section>
  );
};

const ArtifactCard: FC<{ artifact: ChatArtifact }> = ({ artifact }) => {
  const views = useMemo(() => buildArtifactViews(artifact), [artifact]);
  const [activeView, setActiveView] = useState<string>(views[0]?.id ?? "summary");
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setActiveView(views[0]?.id ?? "summary");
  }, [views]);

  const copyPayload = views.find((view) => view.id === activeView)?.copyPayload ?? null;
  const metadataChips = useMemo(() => extractMetadataChips(artifact), [artifact]);
  const hasTabs = views.length > 1;

  const handleCopy = async () => {
    if (!copyPayload || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(copyPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy artifact payload", error);
    }
  };

  return (
    <Card className="border-slate-700/50 bg-slate-900/70">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle>{artifact.title ?? "Untitled Artifact"}</CardTitle>
          {artifact.headline && <CardDescription className="text-sky-300">{artifact.headline}</CardDescription>}
        </div>
        <Badge variant="accent" className="self-start text-[0.65rem] tracking-[0.18em] text-white">
          {artifact.type.toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {artifact.description && <p className="text-sm leading-6 text-slate-300">{artifact.description}</p>}
        {metadataChips.length > 0 && <MetadataChips chips={metadataChips} />}
        <Tabs value={activeView} onValueChange={setActiveView}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hasTabs ? (
              <TabsList className="flex flex-wrap gap-2 bg-slate-900/80">
                {views.map((view) => (
                  <TabsTrigger key={view.id} value={view.id}>
                    {view.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : (
              <Badge variant="outline" className="bg-slate-900/60 text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">
                {views[0]?.label ?? "View"}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              {copyPayload && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Maximize2 className="h-4 w-4" />
                    Fullscreen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{artifact.title ?? "Untitled Artifact"}</DialogTitle>
                    {artifact.headline && <DialogDescription>{artifact.headline}</DialogDescription>}
                  </DialogHeader>
                  <DialogBody className="flex flex-col gap-4 bg-slate-950/20">
                    {copyPayload && (
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    )}
                    {artifact.description && (
                      <p className="text-sm leading-6 text-slate-300">{artifact.description}</p>
                    )}
                    {metadataChips.length > 0 && <MetadataChips chips={metadataChips} variant="dialog" />}
                    <ArtifactViewsContent variant="dialog" views={views} />
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <ArtifactViewsContent variant="card" views={views} />
        </Tabs>
      </CardContent>
    </Card>
  );
};

type ArtifactView = {
  id: string;
  label: string;
  render: (context: { variant: "card" | "dialog" }) => ReactNode;
  copyPayload?: string;
  scroll?: boolean;
  containerClass?: {
    card?: string;
    dialog?: string;
  };
};

const ArtifactViewsContent: FC<{
  variant: "card" | "dialog";
  views: ArtifactView[];
}> = ({ variant, views }) => {
  return (
    <>
      {views.map((view) => (
        <TabsContent
          key={view.id}
          value={view.id}
          className={cn(
            "mt-4 rounded-2xl border border-slate-700/40 bg-slate-900/70 p-0 shadow-inner",
            view.scroll ?? true
              ? variant === "dialog"
                ? "max-h-[68vh]"
                : "max-h-[360px]"
              : variant === "dialog"
                ? "h-[72vh] max-h-[72vh]"
                : "h-[420px] min-h-[420px]",
            view.containerClass?.[variant],
          )}
        >
          {view.scroll ?? true ? (
            <ScrollArea className="h-full w-full rounded-2xl">
              <div className="h-full w-full p-5">{view.render({ variant })}</div>
            </ScrollArea>
          ) : (
            <div className="flex h-full w-full items-stretch justify-stretch p-5">{view.render({ variant })}</div>
          )}
        </TabsContent>
      ))}
    </>
  );
};

const MetadataChips: FC<{ chips: Array<{ label: string; value: string }>; variant?: "card" | "dialog" }> = ({
  chips,
  variant = "card",
}) => (
  <ul
    className={cn(
      "flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em]",
      variant === "dialog" ? "pt-1 text-slate-400" : "text-slate-400",
    )}
  >
    {chips.map((chip) => (
      <li
        key={chip.label}
        className="flex items-center gap-2 rounded-full border border-sky-500/25 bg-slate-900/70 px-3 py-1 text-[0.68rem] font-semibold text-slate-200 shadow-inner shadow-sky-950/40"
      >
        <span className="text-[0.65rem] font-medium tracking-[0.2em] text-slate-400">{chip.label}</span>
        <span className="text-sm font-semibold tracking-normal text-slate-100">{chip.value}</span>
      </li>
    ))}
  </ul>
);

const buildArtifactViews = (artifact: ChatArtifact): ArtifactView[] => {
  const views: ArtifactView[] = [];
  const { payload } = artifact;

  if ((artifact.type === "metrics" || artifact.type === "insight") && (payload.key_figures?.length ?? 0) > 0) {
    views.push({
      id: "metrics",
      label: "Metrics",
      render: () => <MetricsView figures={payload.key_figures ?? []} />,
      copyPayload: safeStringify(payload.key_figures),
    });
  }

  if (payload.visualization?.spec) {
    views.push({
      id: "chart",
      label: "Chart",
      render: ({ variant }) => <ChartView spec={payload.visualization.spec} artifactId={artifact.id} variant={variant} />,
      copyPayload: safeStringify(payload.visualization.spec),
      scroll: false,
      containerClass: {
        card: "h-[420px] min-h-[420px]",
        dialog: "h-[75vh] max-h-[75vh]",
      },
    });
  }

  if (Array.isArray(payload.data) && payload.data.length > 0) {
    const rows = payload.data as Record<string, unknown>[];
    const columns =
      (Array.isArray(payload.schema?.columns) ? (payload.schema?.columns as string[]) : undefined) ?? inferColumns(rows);
    if (columns.length > 0) {
      views.push({
        id: "table",
        label: "Table",
        render: () => <TableView columns={columns} rows={rows} />,
        copyPayload: rowsToCsv(columns, rows),
        containerClass: {
          dialog: "max-h-[68vh]",
        },
      });
    }
  }

  if (artifact.type === "text" && typeof payload.data === "string") {
    views.push({
      id: "text",
      label: "Summary",
      render: () => <TextView text={payload.data} />,
      copyPayload: payload.data,
    });
  }

  if (!views.length && (artifact.description || typeof payload.data === "string")) {
    const fallbackText = typeof payload.data === "string" ? payload.data : artifact.description ?? "No data available.";
    views.push({
      id: "summary",
      label: "Summary",
      render: () => <TextView text={fallbackText} />,
      copyPayload: fallbackText,
    });
  }

  if (payload.data && typeof payload.data === "object") {
    views.push({
      id: "json",
      label: "JSON",
      render: () => <JsonView value={payload.data} />,
      copyPayload: safeStringify(payload.data),
      containerClass: {
        card: "max-h-[360px]",
        dialog: "max-h-[68vh]",
      },
    });
  }

  if (!views.length) {
    views.push({
      id: "overview",
      label: "Overview",
      render: () => <TextView text="Artifact does not contain renderable content." />,
      copyPayload: "Artifact does not contain renderable content.",
    });
  }

  return views;
};

const MetricsView: FC<{ figures: KeyFigure[] }> = ({ figures }) => {
  if (!figures.length) {
    return <EmptyState message="No headline metrics available." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4 shadow-inner shadow-slate-900/40"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{figure.label}</span>
          <span className="mt-2 block text-3xl font-semibold tracking-tight text-slate-50">{figure.value}</span>
          {figure.change && (
            <span
              className={cn(
                "mt-2 inline-flex items-center text-sm font-medium",
                figure.change.startsWith("-") ? "text-rose-400" : "text-emerald-400",
              )}
            >
              {figure.change}
            </span>
          )}
          {figure.annotation && <span className="mt-2 block text-xs text-slate-400">{figure.annotation}</span>}
        </div>
      ))}
    </div>
  );
};

const ChartView: FC<{ spec: Record<string, unknown> | null | undefined; artifactId: string; variant: "card" | "dialog" }> = ({
  spec,
  artifactId,
  variant,
}) => {
  const height = variant === "dialog" ? 560 : 340;
  const sizedSpec = useMemo(() => {
    if (!spec) {
      return null;
    }
    const clone: Record<string, unknown> = { ...spec };
    clone.height = height;
    clone.width = "container";
    const rawAutosize = (spec as { autosize?: unknown }).autosize;
    const existingAutosize =
      typeof rawAutosize === "object" && rawAutosize !== null ? (rawAutosize as Record<string, unknown>) : {};
    clone.autosize = { ...existingAutosize, type: "fit", contains: "padding" };
    return clone;
  }, [spec, height]);

  if (!spec || !sizedSpec) {
    return <EmptyState message="Chart specification missing." />;
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950/60 shadow-inner shadow-slate-900/40",
        variant === "dialog" ? "min-h-[480px] h-[75vh] max-h-[820px]" : "min-h-[340px] h-[380px]",
      )}
    >
      <VegaLite
        key={`${artifactId}-chart`}
        spec={sizedSpec}
        actions={false}
        renderer="canvas"
        className="h-full w-full"
      />
    </div>
  );
};

const TableView: FC<{ columns: string[]; rows: Record<string, unknown>[] }> = ({ columns, rows }) => {
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return rows;
    }
    const { column, direction } = sortConfig;
    const modifier = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = normalizeComparable(a[column]);
      const bValue = normalizeComparable(b[column]);
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return 0;
    });
  }, [rows, sortConfig]);

  const handleSort = (column: string) => {
    setSortConfig((current) => {
      if (current?.column === column) {
        return { column, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-950/30 p-3">
      <div className="max-h-[280px] overflow-auto rounded-xl border border-slate-700/40">
        <table className="min-w-full border-collapse text-sm text-slate-100">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
            <tr>
              {columns.map((column) => {
                const isActive = sortConfig?.column === column;
                const sortDirection = isActive ? sortConfig?.direction ?? "asc" : undefined;
                return (
                  <th
                    key={column}
                    scope="col"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort(column)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSort(column);
                      }
                    }}
                    aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                    className={cn(
                      "cursor-pointer select-none border-b border-slate-800/60 px-4 py-2 text-left uppercase tracking-[0.18em] text-slate-400 transition",
                      isActive ? "text-slate-200" : "",
                    )}
                  >
                    <span>{column}</span>
                    <span className="ml-2 text-[0.65rem] text-slate-500">
                      {isActive ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={`${index}-${columns[0]}`} className="border-b border-slate-800/40 last:border-none">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-2 text-sm text-slate-200">
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
        Showing {sortedRows.length.toLocaleString()} row{sortedRows.length === 1 ? "" : "s"}
      </footer>
    </div>
  );
};

const TextView: FC<{ text: string }> = ({ text }) => (
  <p className="text-sm leading-7 text-slate-200/95">{text}</p>
);

const JsonView: FC<{ value: unknown }> = ({ value }) => (
  <pre className="max-h-[360px] overflow-auto rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-xs leading-6 text-slate-200">
    {safeStringify(value)}
  </pre>
);

const EmptyState: FC<{ message: string }> = ({ message }) => (
  <p className="text-sm text-slate-300/80">{message}</p>
);

const extractMetadataChips = (artifact: ChatArtifact): Array<{ label: string; value: string }> => {
  const chips: Array<{ label: string; value: string }> = [];

  if (artifact.payload?.metadata) {
    Object.entries(artifact.payload.metadata).forEach(([key, value]) => {
      if (typeof value === "number" || typeof value === "string") {
        chips.push({
          label: key.replace(/_/g, " ").toUpperCase(),
          value: typeof value === "number" ? value.toLocaleString() : value,
        });
      }
    });
  }

  return chips;
};

const inferColumns = (rows: unknown[]): string[] => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const sample = rows[0];
  if (typeof sample !== "object" || sample === null) {
    return [];
  }
  return Object.keys(sample as Record<string, unknown>);
};

const formatCellValue = (value: unknown): string => {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const rowsToCsv = (columns: string[], rows: Record<string, unknown>[]): string => {
  const escapeCell = (value: unknown) => {
    if (value == null) return "";
    const valueStr = String(value);
    if (/[",\n]/.test(valueStr)) {
      return `"${valueStr.replace(/"/g, '""')}"`;
    }
    return valueStr;
  };

  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(row[column])).join(",")).join("\n");
  return `${header}\n${body}`;
};

const safeStringify = (value: unknown) => JSON.stringify(value, null, 2);

const normalizeComparable = (value: unknown): number | string => {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();

  const asString = String(value);
  const asNumber = Number(asString);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }

  const parsedDate = Date.parse(asString);
  if (!Number.isNaN(parsedDate)) {
    return parsedDate;
  }

  return asString.toLowerCase();
};
