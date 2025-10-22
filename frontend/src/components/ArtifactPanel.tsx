import type { FC } from "react";

import type { ChatArtifact } from "../types/chat";

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
        <article key={artifact.id} className={`artifact-card artifact-card--${artifact.type}`}>
          <header>
            <h3>{artifact.title ?? "Untitled Artifact"}</h3>
            {artifact.description && <p className="artifact-card__description">{artifact.description}</p>}
          </header>
          <div className="artifact-card__body">
            {renderArtifactBody(artifact)}
          </div>
        </article>
      ))}
    </section>
  );
};

const renderArtifactBody = (artifact: ChatArtifact) => {
  switch (artifact.type) {
    case "table":
      return renderTableArtifact(artifact);
    case "json":
      return <pre>{JSON.stringify(artifact.payload.data, null, 2)}</pre>;
    case "text":
      return <p>{String(artifact.payload.data ?? "")}</p>;
    case "chart":
    default:
      return (
        <pre className="artifact-card__placeholder">
          {JSON.stringify(artifact.payload.data, null, 2)}
        </pre>
      );
  }
};

const renderTableArtifact = (artifact: ChatArtifact) => {
  const rows = Array.isArray(artifact.payload.data) ? artifact.payload.data : [];
  const columns =
    (artifact.payload.schema && Array.isArray(artifact.payload.schema.columns)
      ? artifact.payload.schema.columns
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
