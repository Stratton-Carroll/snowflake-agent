import type { FC, ReactNode } from "react";
import { VegaLite } from "react-vega";

import type { ChatArtifact, KeyFigure } from "../types/chat";

interface ArtifactPanelProps {
  artifacts: ChatArtifact[];
}

export const ArtifactPanel: FC<ArtifactPanelProps> = ({ artifacts }) => {
  if (artifacts.length === 0) {
    return (
      <section className="artifact-panel artifact-panel--empty">
        <p>No artifacts for this conversation yet.</p>
      </section>
    );
  }

  return (
    <section className="artifact-panel">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </section>
  );
};

const ArtifactCard: FC<{ artifact: ChatArtifact }> = ({ artifact }) => {
  return (
    <article className={`artifact-card artifact-card--${artifact.type}`}>
      <header className="artifact-card__header">
        <div>
          <h3>{artifact.title ?? "Untitled Artifact"}</h3>
          {artifact.headline && <p className="artifact-card__headline">{artifact.headline}</p>}
        </div>
        <span className="artifact-card__type-label">{artifact.type.toUpperCase()}</span>
      </header>
      {artifact.description && <p className="artifact-card__description">{artifact.description}</p>}
      <div className="artifact-card__body">{renderArtifactBody(artifact)}</div>
    </article>
  );
};

const renderArtifactBody = (artifact: ChatArtifact): ReactNode => {
  switch (artifact.type) {
    case "metrics":
    case "insight":
      return renderMetricsArtifact(artifact);
    case "table":
      return renderTableArtifact(artifact);
    case "chart":
      return renderChartArtifact(artifact);
    case "json":
      return <pre>{JSON.stringify(artifact.payload.data, null, 2)}</pre>;
    case "text":
    default:
      return <p>{String(artifact.payload.data ?? "")}</p>;
  }
};

const renderMetricsArtifact = (artifact: ChatArtifact) => {
  const figures = artifact.payload.key_figures ?? [];
  if (figures.length === 0) {
    return <p>No headline metrics available.</p>;
  }
  return (
    <div className="artifact-card__metrics">
      {figures.map((figure: KeyFigure) => (
        <div key={figure.label} className="artifact-card__metric">
          <span className="artifact-card__metric-label">{figure.label}</span>
          <span className="artifact-card__metric-value">{figure.value}</span>
          {figure.change && <span className="artifact-card__metric-change">{figure.change}</span>}
          {figure.annotation && <span className="artifact-card__metric-annotation">{figure.annotation}</span>}
        </div>
      ))}
    </div>
  );
};

const renderChartArtifact = (artifact: ChatArtifact) => {
  const visualization = artifact.payload.visualization;
  if (!visualization?.spec) {
    return <p>Chart specification missing.</p>;
  }
  return (
    <div className="artifact-card__chart">
      <VegaLite
        spec={visualization.spec as Record<string, unknown>}
        actions={false}
        renderer="canvas"
        className="artifact-card__vega"
      />
    </div>
  );
};

const renderTableArtifact = (artifact: ChatArtifact) => {
  const rows = Array.isArray(artifact.payload.data) ? artifact.payload.data : [];
  const columns =
    (artifact.payload.schema && Array.isArray(artifact.payload.schema.columns)
      ? (artifact.payload.schema.columns as string[])
      : undefined) ?? inferColumns(rows);

  if (rows.length === 0 || columns.length === 0) {
    return <p>No rows returned.</p>;
  }

  return (
    <div className="artifact-card__table">
      <table>
        <thead>
          <tr>
            {columns.map((column: string) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: Record<string, unknown>, index: number) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{formatCellValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
