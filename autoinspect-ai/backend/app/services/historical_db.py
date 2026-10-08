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
    Never seeds fake pre-baked data on startup.
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
                    defect_type TEXT,
                    process_code TEXT,
                    severity TEXT,
                    confidence REAL,
                    dx_normalized REAL,
                    dy_normalized REAL,
                    r_normalized REAL,
                    theta_degrees REAL,
                    clock_hour REAL,
                    zone_name TEXT,
                    area_pct REAL,
                    bbox_json TEXT,
                    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
                );
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp);")
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
                    part_id, timestamp, image_filename, overall_status, defect_count,
                    condition, wear_index_score, dtv_value_um, runout_value_um,
                    parallelism_value_um, highest_rpn, primary_process_code, station
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                record.part_id,
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
                        inspection_id, defect_type, process_code, severity,
                        confidence, dx_normalized, dy_normalized, r_normalized,
                        theta_degrees, clock_hour, zone_name, area_pct, bbox_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    inspection_id,
                    d.defect_type,
                    d.process_code,
                    d.severity,
                    d.confidence,
                    d.dx_normalized,
                    d.dy_normalized,
                    d.r_normalized,
                    d.theta_degrees,
                    d.clock_hour,
                    d.zone_name,
                    d.area_pct,
                    json.dumps(d.bbox)
                ))

            conn.commit()
            return inspection_id

    @classmethod
    def get_recent_inspections(cls, limit: int = 100) -> List[HistoricalInspectionRecord]:
        with cls.get_connection() as conn:
            cursor = conn.cursor()
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
                        dx_normalized=dr["dx_normalized"] if "dx_normalized" in dr.keys() else 0.0,
                        dy_normalized=dr["dy_normalized"] if "dy_normalized" in dr.keys() else 0.0,
                        r_normalized=dr["r_normalized"],
                        theta_degrees=dr["theta_degrees"],
                        clock_hour=dr["clock_hour"] if "clock_hour" in dr.keys() else 12.0,
                        zone_name=dr["zone_name"] if "zone_name" in dr.keys() else "Swept Friction Band",
                        area_pct=dr["area_pct"],
                        bbox=json.loads(dr["bbox_json"]) if dr["bbox_json"] else []
                    )
                    for dr in d_rows
                ]

                records.append(HistoricalInspectionRecord(
                    id=r["id"],
                    part_id=r["part_id"],
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
