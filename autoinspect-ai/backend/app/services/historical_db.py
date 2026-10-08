import sqlite3
import os
import json
import logging
from typing import List, Optional
from app.models.historical_schemas import (
    HistoricalDefectPoint,
    HistoricalInspectionRecord,
)

logger = logging.getLogger("autoinspect.historical")

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
DB_PATH = os.path.join(DB_DIR, "inspection_history.db")


class HistoricalDatabaseManager:
    """
    SQLite storage for genuine inspection records and defect spatial coordinates.
    Supports multi-component architecture (Brake Rotor Polar HUD & Car Bonnet Press Die Grid).
    """

    @classmethod
    def get_connection(cls) -> sqlite3.Connection:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def init_db(cls):
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS inspections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    part_id TEXT UNIQUE,
                    component_type TEXT DEFAULT 'brake_rotor',
                    timestamp TEXT,
                    image_filename TEXT,
                    overall_status TEXT,
                    defect_count INTEGER,
                    condition TEXT,
                    wear_index_score REAL,
                    dtv_value_um REAL,
                    runout_value_um REAL,
                    parallelism_value_um REAL,
                    highest_rpn INTEGER,
                    primary_process_code TEXT,
                    station TEXT
                );
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS defect_points (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    inspection_id INTEGER,
                    component_type TEXT DEFAULT 'brake_rotor',
                    defect_type TEXT,
                    process_code TEXT,
                    severity TEXT,
                    confidence REAL,
                    dx_normalized REAL,
                    dy_normalized REAL,
                    r_normalized REAL,
                    theta_degrees REAL,
                    clock_hour REAL,
                    panel_x_normalized REAL,
                    panel_y_normalized REAL,
                    zone_name TEXT,
                    area_pct REAL,
                    bbox_json TEXT,
                    mask_polygon_json TEXT,
                    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
                );
            """)

            # Dynamic migrations for backward compatibility
            columns_to_add = [
                ("inspections", "component_type", "TEXT DEFAULT 'brake_rotor'"),
                ("defect_points", "component_type", "TEXT DEFAULT 'brake_rotor'"),
                ("defect_points", "mask_polygon_json", "TEXT"),
                ("defect_points", "panel_x_normalized", "REAL"),
                ("defect_points", "panel_y_normalized", "REAL"),
            ]
            for table, col, col_type in columns_to_add:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};")
                except Exception:
                    pass

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_comp ON inspections(component_type);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_defect_process_code ON defect_points(process_code);")
            conn.commit()

    @classmethod
    def clear_all_records(cls):
        """Wipes historical inspection records and resets the database."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM defect_points;")
            cursor.execute("DELETE FROM inspections;")
            conn.commit()
        logger.info("Historical database wiped clean.")

    @classmethod
    def log_inspection(cls, record: HistoricalInspectionRecord) -> int:
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO inspections (
                    part_id, component_type, timestamp, image_filename, overall_status, defect_count,
                    condition, wear_index_score, dtv_value_um, runout_value_um,
                    parallelism_value_um, highest_rpn, primary_process_code, station
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                record.part_id,
                record.component_type or "brake_rotor",
                record.timestamp,
                record.image_filename,
                record.overall_status,
                record.defect_count,
                record.condition,
                record.wear_index_score,
                record.dtv_value_um,
                record.runout_value_um,
                record.parallelism_value_um,
                record.highest_rpn,
                record.primary_process_code,
                record.station
            ))
            inspection_id = cursor.lastrowid

            for d in record.defects:
                cursor.execute("""
                    INSERT INTO defect_points (
                        inspection_id, component_type, defect_type, process_code, severity,
                        confidence, dx_normalized, dy_normalized, r_normalized,
                        theta_degrees, clock_hour, panel_x_normalized, panel_y_normalized,
                        zone_name, area_pct, bbox_json, mask_polygon_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    inspection_id,
                    d.component_type or record.component_type or "brake_rotor",
                    d.defect_type,
                    d.process_code,
                    d.severity,
                    d.confidence,
                    d.dx_normalized,
                    d.dy_normalized,
                    d.r_normalized,
                    d.theta_degrees,
                    d.clock_hour,
                    d.panel_x_normalized,
                    d.panel_y_normalized,
                    d.zone_name,
                    d.area_pct,
                    json.dumps(d.bbox),
                    json.dumps(d.mask_polygon) if d.mask_polygon else None
                ))

            conn.commit()
            return inspection_id

    @classmethod
    def get_recent_inspections(
        cls,
        limit: int = 100,
        component_type: Optional[str] = None
    ) -> List[HistoricalInspectionRecord]:
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            if component_type:
                cursor.execute("""
                    SELECT * FROM inspections
                    WHERE component_type = ?
                    ORDER BY datetime(timestamp) DESC
                    LIMIT ?;
                """, (component_type, limit))
            else:
                cursor.execute("""
                    SELECT * FROM inspections
                    ORDER BY datetime(timestamp) DESC
                    LIMIT ?;
                """, (limit,))

            rows = cursor.fetchall()
            records = []
            for r in rows:
                insp_id = r["id"]
                cursor.execute("SELECT * FROM defect_points WHERE inspection_id = ?;", (insp_id,))
                d_rows = cursor.fetchall()
                defects = [
                    HistoricalDefectPoint(
                        defect_type=dr["defect_type"],
                        process_code=dr["process_code"],
                        severity=dr["severity"],
                        confidence=dr["confidence"],
                        component_type=dr["component_type"] if "component_type" in dr.keys() and dr["component_type"] else "brake_rotor",
                        dx_normalized=dr["dx_normalized"] if "dx_normalized" in dr.keys() and dr["dx_normalized"] is not None else 0.0,
                        dy_normalized=dr["dy_normalized"] if "dy_normalized" in dr.keys() and dr["dy_normalized"] is not None else 0.0,
                        r_normalized=dr["r_normalized"] if "r_normalized" in dr.keys() and dr["r_normalized"] is not None else 0.0,
                        theta_degrees=dr["theta_degrees"] if "theta_degrees" in dr.keys() and dr["theta_degrees"] is not None else 0.0,
                        clock_hour=dr["clock_hour"] if "clock_hour" in dr.keys() and dr["clock_hour"] is not None else 12.0,
                        panel_x_normalized=dr["panel_x_normalized"] if "panel_x_normalized" in dr.keys() else None,
                        panel_y_normalized=dr["panel_y_normalized"] if "panel_y_normalized" in dr.keys() else None,
                        zone_name=dr["zone_name"] if "zone_name" in dr.keys() and dr["zone_name"] else "Swept Friction Band",
                        area_pct=dr["area_pct"],
                        bbox=json.loads(dr["bbox_json"]) if dr["bbox_json"] else [],
                        mask_polygon=json.loads(dr["mask_polygon_json"]) if "mask_polygon_json" in dr.keys() and dr["mask_polygon_json"] else None
                    )
                    for dr in d_rows
                ]

                c_type = r["component_type"] if "component_type" in r.keys() and r["component_type"] else "brake_rotor"

                records.append(HistoricalInspectionRecord(
                    id=r["id"],
                    part_id=r["part_id"],
                    component_type=c_type,
                    timestamp=r["timestamp"],
                    image_filename=r["image_filename"],
                    overall_status=r["overall_status"],
                    defect_count=r["defect_count"],
                    condition=r["condition"],
                    wear_index_score=r["wear_index_score"],
                    dtv_value_um=r["dtv_value_um"],
                    runout_value_um=r["runout_value_um"],
                    parallelism_value_um=r["parallelism_value_um"],
                    highest_rpn=r["highest_rpn"],
                    primary_process_code=r["primary_process_code"],
                    station=r["station"],
                    defects=defects
                ))

            return records


# Initialize DB on module import
HistoricalDatabaseManager.init_db()
