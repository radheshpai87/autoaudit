"use client";

import { useId, useMemo, useState } from "react";
import type { MachineHeatmapBin, MachineHeatmapData } from "../../lib/api";

const CANVAS = { width: 620, height: 560, cx: 310, cy: 280, radius: 196 };

function coordinateScale(bin: MachineHeatmapBin) {
  const width = bin.image_width ?? 0;
  const height = bin.image_height ?? 0;
  return width > 0 && height > 0 ? 400 / Math.max(width, height) : 400;
}

function project(dx: number, dy: number, bin: MachineHeatmapBin) {
  const scale = coordinateScale(bin);
  const width = bin.image_width ?? 1;
  const height = bin.image_height ?? 1;
  return {
    x: CANVAS.cx + dx * width * scale,
    y: CANVAS.cy + dy * height * scale,
  };
}

function clockPoint(hour: number, radius: number) {
  const radians = ((hour % 12) * 30 * Math.PI) / 180;
  return {
    x: CANVAS.cx + Math.sin(radians) * radius,
    y: CANVAS.cy - Math.cos(radians) * radius,
  };
}

function imageBox(bin: MachineHeatmapBin) {
  const width = bin.image_width ?? 0;
  const height = bin.image_height ?? 0;
  if (!width || !height || bin.bbox?.length !== 4) return null;
  return bin.bbox.map((value, index) => Math.round((value + 0.5) * (index % 2 === 0 ? width : height)));
}

function pointColor(severity?: string) {
  if (severity === "critical" || severity === "high") return "#fb574f";
  if (severity === "medium") return "#f59e0b";
  return "#43d2e6";
}

function DefectContour({ bin, index, selected, onSelect }: {
  bin: MachineHeatmapBin;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const center = project(bin.dx, bin.dy, bin);
  const color = pointColor(bin.severity);
  const polygonPoints = bin.mask_polygon?.length
    ? bin.mask_polygon.map(([x, y]) => {
        const point = project(x, y, bin);
        return `${point.x},${point.y}`;
      }).join(" ")
    : "";
  const box = imageBox(bin);
  const screenBox = box && bin.image_width && bin.image_height
    ? {
        x: CANVAS.cx + ((box[0] / bin.image_width) - 0.5) * bin.image_width * coordinateScale(bin),
        y: CANVAS.cy + ((box[1] / bin.image_height) - 0.5) * bin.image_height * coordinateScale(bin),
        width: ((box[2] - box[0]) / Math.max(bin.image_width, bin.image_height)) * 400,
        height: ((box[3] - box[1]) / Math.max(bin.image_width, bin.image_height)) * 400,
      }
    : null;
  const label = clockPoint(bin.clock_hour, Math.min(222, Math.max(124, Math.hypot(center.x - CANVAS.cx, center.y - CANVAS.cy) + 28)));
  const exactTitle = `${bin.defect_type} · ${bin.clock_hour.toFixed(1)} o'clock · Δx ${bin.dx.toFixed(4)}, Δy ${bin.dy.toFixed(4)} · ${(bin.intensity * 100).toFixed(1)}% confidence`;

  return <g className={`aa-heat-point ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-label={exactTitle} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}>
    <title>{exactTitle}</title>
    {polygonPoints
      ? <polygon points={polygonPoints} fill={`${color}55`} stroke={color} strokeWidth={selected ? 2.4 : 1.5} strokeLinejoin="round" />
      : screenBox && <rect x={screenBox.x} y={screenBox.y} width={Math.max(screenBox.width, 3)} height={Math.max(screenBox.height, 3)} fill={`${color}40`} stroke={color} strokeWidth={selected ? 2.4 : 1.5} />}
    <line x1={center.x} y1={center.y} x2={label.x} y2={label.y} stroke={color} strokeOpacity=".75" strokeWidth="1" />
    <circle cx={center.x} cy={center.y} r={selected ? 6 : 4.5} fill="#fff" stroke={color} strokeWidth="2.5" />
    <circle cx={center.x} cy={center.y} r="10" fill="transparent" />
    <rect x={label.x - 19} y={label.y - 11} width="38" height="18" rx="5" fill="#070c19" stroke={color} strokeOpacity=".7" />
    <text x={label.x} y={label.y + 2.5} textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="800">{bin.clock_hour.toFixed(1)}h</text>
    <text x={center.x + 9} y={center.y - 8} fill="#fff" fontSize="9" fontWeight="700">{index + 1}</text>
  </g>;
}

export function RotorHeatmap({ machineHeatmaps }: { machineHeatmaps: Record<string, MachineHeatmapData> }) {
  const machines = Object.entries(machineHeatmaps);
  const svgId = useId().replace(/:/g, "");
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(0);
  const selected = machineHeatmaps[selectedCode] ?? machines.find(([, data]) => data.bins.length > 0)?.[1] ?? machines[0]?.[1];
  const points = selected?.bins ?? [];
  const activePoint = points[Math.min(selectedPoint, Math.max(points.length - 1, 0))];
  const clockTicks = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const hour = index === 0 ? 12 : index;
    const outer = clockPoint(hour, CANVAS.radius + 12);
    const inner = clockPoint(hour, CANVAS.radius - (index % 3 === 0 ? 15 : 7));
    const label = clockPoint(hour, CANVAS.radius + 36);
    return { hour, outer, inner, label };
  }), []);

  if (!machines.length) return <div className="aa-backend-empty">The backend has not returned machine heatmap data.</div>;

  return <section className="panel aa-rotor-heatmap" aria-label="Backend machine defect heatmap">
    <div className="aa-section-heading aa-heatmap-heading">
      <div><h2>Spatial Rotor Defect Heatmap</h2><p>YOLO mask outlines, pixel bbox coordinates, and clock positions from backend history</p></div>
      <div className="aa-heatmap-total"><b>{selected?.total_defects ?? 0}</b><span>defect points · {selected?.total_samples ?? 0} inspections</span></div>
    </div>
    {selected && <div className="aa-heatmap-workspace">
      <aside className="aa-heatmap-stations" aria-label="Select production machine or station">
        <div className="aa-heatmap-stations-title">PRODUCTION STATIONS</div>
        {machines.map(([code, data]) => <button key={code} type="button" className={`aa-heatmap-station ${selected.machine_code === code ? "active" : ""}`} onClick={() => { setSelectedCode(code); setSelectedPoint(0); }} aria-pressed={selected.machine_code === code}>
          <span className="aa-heatmap-station-top"><b>{code}</b><strong>{data.total_defects} {data.total_defects === 1 ? "flaw" : "flaws"}</strong></span>
          <span className="aa-heatmap-station-name">{data.station}</span>
          <span className="aa-heatmap-station-signature">{data.signature_summary || "No defect signature description"}</span>
        </button>)}
        <div className="aa-heatmap-coordinate-note"><b>Coordinate reference</b><span>Pixel boxes and angles come from backend YOLO detections. Contours use the returned segmentation masks. Δx / Δy are normalized offsets from the uploaded image center; the rotor plot assumes a centered rotor.</span></div>
      </aside>

      <div className="aa-heatmap-main">
        <div className="aa-heatmap-main-head"><div><b>{selected.machine_code} · {selected.station}</b><span>Historical fleet heatmap</span></div><span className="aa-heatmap-dataset">{selected.total_defects} DETECTED</span></div>
        {activePoint && <div className="aa-heatmap-active-defect"><span className="aa-heatmap-alert-dot"/><b>{activePoint.defect_type}</b><span>Clock position <strong>{activePoint.clock_hour.toFixed(1)} o&apos;clock</strong> · θ {activePoint.theta_bin.toFixed(1)}°</span></div>}

        <div className="aa-heatmap-canvas-wrap">
          <svg className="aa-rotor-svg" viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} role="img" aria-label={`${selected.machine_code} polar rotor heatmap with ${selected.total_defects} backend defect points`}>
            <defs>
              <radialGradient id={`${svgId}-metal`} cx="45%" cy="37%"><stop offset="0" stopColor="#526176"/><stop offset=".62" stopColor="#303d52"/><stop offset="1" stopColor="#172236"/></radialGradient>
              <radialGradient id={`${svgId}-hub`}><stop offset="0" stopColor="#0b1322"/><stop offset="1" stopColor="#111a2b"/></radialGradient>
              <clipPath id={`${svgId}-rotor-clip`}><circle cx={CANVAS.cx} cy={CANVAS.cy} r={CANVAS.radius - 2}/></clipPath>
            </defs>
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r={CANVAS.radius} fill={`url(#${svgId}-metal)`} stroke="#637287" strokeWidth="2" />
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r="188" fill="none" stroke="#a7b4c4" strokeOpacity=".35" strokeDasharray="4 5" />
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r="145" fill="none" stroke="#a7b4c4" strokeOpacity=".22" />
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r="113" fill="none" stroke="#a7b4c4" strokeOpacity=".3" strokeDasharray="4 5" />
            {clockTicks.map(({ hour, outer, inner, label }) => <g key={hour}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#b8c3d1" strokeOpacity={hour % 3 === 0 ? ".45" : ".2"} strokeWidth={hour % 3 === 0 ? 1.2 : .8}/>
              <text x={label.x} y={label.y + 4} textAnchor="middle" fill="#9aa8bb" fontSize="11" fontWeight={hour % 3 === 0 ? "700" : "500"}>{hour}h</text>
            </g>)}
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r="58" fill={`url(#${svgId}-hub)`} stroke="#718096" strokeWidth="1.4" />
            <circle cx={CANVAS.cx} cy={CANVAS.cy} r="35" fill="#080e1b" stroke="#43516a" strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const point = clockPoint(angle / 30, 83);
              return <circle key={angle} cx={point.x} cy={point.y} r="7" fill="#0a1020" stroke="#6b7a90" strokeWidth="1.2"/>;
            })}
            <g clipPath={`url(#${svgId}-rotor-clip)`}>{points.map((bin, index) => <DefectContour key={`${bin.top_process_code}-${bin.clock_hour}-${bin.defect_type}-${index}`} bin={bin} index={index} selected={index === selectedPoint} onSelect={() => setSelectedPoint(index)} />)}</g>
            <text x={CANVAS.cx} y={CANVAS.cy + 4} textAnchor="middle" fill="#8fa0b6" fontSize="9" fontWeight="800" letterSpacing="1">HUB</text>
          </svg>
        </div>

        <div className="aa-heatmap-legend"><span><i className="contour"/>YOLO segmentation contour</span><span><i className="centroid"/>Bounding-box center</span><span>Angle is measured clockwise from 12 o&apos;clock</span></div>
        {points.length > 0 ? <div className="aa-heatmap-points" aria-label="Exact defect coordinates">
          <div className="aa-heatmap-points-heading"><b>DEFECT COORDINATES</b><span>{points.length} backend detection{points.length === 1 ? "" : "s"}</span></div>
          {points.map((bin, index) => {
            const bbox = imageBox(bin);
            const centerX = bbox ? (bbox[0] + bbox[2]) / 2 : null;
            const centerY = bbox ? (bbox[1] + bbox[3]) / 2 : null;
            return <button key={`${bin.top_process_code}-${bin.clock_hour}-${index}`} type="button" className={`aa-heatmap-point-row ${index === selectedPoint ? "active" : ""}`} onClick={() => setSelectedPoint(index)}>
              <span className="aa-heatmap-point-number">{index + 1}</span>
              <span className="aa-heatmap-point-name"><b>{bin.defect_type}</b><small>{bin.severity ? `${bin.severity.toUpperCase()} · ` : ""}{(bin.intensity * 100).toFixed(1)}% confidence</small></span>
              <span className="aa-heatmap-point-coord"><b>{bin.clock_hour.toFixed(1)} o&apos;clock · θ {bin.theta_bin.toFixed(1)}°</b><small>Δx {bin.dx >= 0 ? "+" : ""}{bin.dx.toFixed(4)} · Δy {bin.dy >= 0 ? "+" : ""}{bin.dy.toFixed(4)}</small></span>
              {bbox && <span className="aa-heatmap-point-bbox"><b>Center ({centerX?.toFixed(1)}, {centerY?.toFixed(1)}) px · bbox</b><small>{bbox[0]}, {bbox[1]} → {bbox[2]}, {bbox[3]} px</small></span>}
            </button>;
          })}
        </div> : <div className="aa-heatmap-empty">No defect locations have been recorded for this station.</div>}
      </div>
    </div>}
  </section>;
}
