"use client";

import { useMemo, useState } from "react";
import type { PathMap } from "../../lib/path-layout";

type Viewport = { x: number; y: number; width: number; height: number };

function viewportFor(map: PathMap, zoom: number, panX: number, panY: number) {
  const values = map.viewBox.split(" ").map(Number);
  const [baseX, baseY, baseWidth, baseHeight] = values;
  if (
    baseX === undefined ||
    baseY === undefined ||
    baseWidth === undefined ||
    baseHeight === undefined
  ) {
    return map.viewBox;
  }
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const x = baseX + (baseWidth - width) / 2 + panX * width;
  const y = baseY + (baseHeight - height) / 2 + panY * height;
  return `${x} ${y} ${width} ${height}`;
}

export function PassiveTreeCanvas({
  map,
  comparing,
}: {
  map: PathMap | null;
  comparing: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewBox = useMemo(
    () => (map === null ? "0 0 1 1" : viewportFor(map, zoom, pan.x, pan.y)),
    [map, pan.x, pan.y, zoom],
  );

  if (map === null) {
    return (
      <p>
        This local map needs node positions. The numbered list is the allocation
        order.
      </p>
    );
  }

  const xs = map.points.map((point) => point.x);
  const ys = map.points.map((point) => point.y);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    1,
  );
  const radius = span * 0.045;
  const panBy = (x: number, y: number) =>
    setPan((current) => ({ x: current.x + x, y: current.y + y }));
  const fitPath = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <section
      className="passive-tree-canvas"
      aria-labelledby="passive-map-heading"
    >
      <div className="passive-tree-canvas-heading">
        <div>
          <p className="eyebrow">Path map</p>
          <h4 id="passive-map-heading">Local passive tree view</h4>
        </div>
        <p aria-live="polite">{Math.round(zoom * 100)}% zoom</p>
      </div>
      <div className="map-controls" aria-label="Passive map controls">
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(current * 1.25, 4))}
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(current / 1.25, 0.5))}
        >
          Zoom out
        </button>
        <button type="button" onClick={() => panBy(-0.2, 0)}>
          Pan left
        </button>
        <button type="button" onClick={() => panBy(0.2, 0)}>
          Pan right
        </button>
        <button type="button" onClick={() => panBy(0, -0.2)}>
          Pan up
        </button>
        <button type="button" onClick={() => panBy(0, 0.2)}>
          Pan down
        </button>
        <button type="button" onClick={fitPath}>
          Fit path
        </button>
      </div>
      <svg
        className="path-map"
        viewBox={viewBox}
        role="img"
        aria-label="Interactive local sketch of the selected passive path"
      >
        {map.edges.map((edge) => {
          const from = map.points.find((point) => point.id === edge.from);
          const to = map.points.find((point) => point.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.kind}-${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={radius * 0.35}
              className={`path-edge path-edge-${edge.kind}`}
            />
          );
        })}
        {map.points.map((point) => (
          <g key={`${point.role}-${point.id}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              className={`path-node path-node-${point.role}`}
            >
              <title>
                {point.step === null
                  ? "Already allocated"
                  : `Step ${point.step}`}
                : {point.name} ({point.id})
              </title>
            </circle>
            <text
              x={point.x}
              y={point.y}
              fontSize={radius}
              className="path-step"
            >
              {point.step ?? "·"}
            </text>
          </g>
        ))}
      </svg>
      <p>
        Gray is already allocated. Blue is the path shown above.
        {comparing
          ? " Purple is shared with the second selected path. Orange is only on that second path. Step numbers follow the first selected path."
          : ""}
      </p>
    </section>
  );
}
