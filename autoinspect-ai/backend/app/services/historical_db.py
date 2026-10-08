import sqlite3
import os
import json
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from app.models.historical_schemas import (
    HistoricalDefectPoint,
    HistoricalInspectionRecord,
    MachineSignatureWarning,
    HeatmapBin,
    MachineHeatmapData,
    HistoricalAnalyticsResponse,
)

logger = logging.getLogger("autoinspect.historical")

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
DB_PATH = os.path.join(DB_DIR, "inspection_history.db")


class HistoricalDatabaseManager:
    """
    Thread-safe SQLite storage for inspection records, defect spatial coordinates,
    and manufacturing telemetry trends.
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
                    r_normalized REAL,
                    theta_degrees REAL,
                    area_pct REAL,
                    bbox_json TEXT,
                    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
                );
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_defect_process_code ON defect_points(process_code);")
            conn.commit()

        # Seed realistic historical batch data if database is empty
        cls.ensure_seeded_data()

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
                        confidence, r_normalized, theta_degrees, area_pct, bbox_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    inspection_id,
                    d.defect_type,
                    d.process_code,
                    d.severity,
                    d.confidence,
                    d.r_normalized,
                    d.theta_degrees,
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
                        r_normalized=dr["r_normalized"],
                        theta_degrees=dr["theta_degrees"],
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

    @classmethod
    def ensure_seeded_data(cls):
        """
        Seeds 50 realistic historical inspection records representing production shifts.
        Includes a simulated incipient degradation trend on PU01 (gripper micro-dents)
        and DT16 (CBN grinding tool wear) so early warning can be demonstrated immediately.
        """
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM inspections;")
            count = cursor.fetchone()["cnt"]
            if count >= 30:
                return

        logger.info("Seeding initial 50 historical production line records...")
        now = datetime.now(timezone.utc)

        # Generate realistic past 50 inspections (1 every 15 minutes)
        import random
        random.seed(42)

        for i in range(50, 0, -1):
            part_time = (now - timedelta(minutes=i * 15)).isoformat()
            part_no = f"BD-202610-{(1000 + (50 - i)):04d}"

            # Trend simulation:
            # Over the last 15 parts, machine PU01 starts exhibiting micro-dents at 90 deg / 270 deg (robot gripper)
            # Machine DT16 also has increasing DTV drift from 2.0 to 4.2 um
            is_recent_anomaly = (50 - i) >= 35

            if is_recent_anomaly and random.random() < 0.75:
                # Incipient PU01 micro-impact dent defect
                # Gripper impacts typically happen at outer rim (r ~ 0.38 - 0.41) at opposite angles (90 or 270 deg)
                theta = random.choice([90.0, 270.0]) + random.uniform(-10.0, 10.0)
                r_norm = random.uniform(0.38, 0.41)
                defect = HistoricalDefectPoint(
                    defect_type="Surface Mechanical Impact Dent",
                    process_code="PU01",
                    severity="medium",
                    confidence=0.88 + random.uniform(-0.04, 0.04),
                    r_normalized=round(r_norm, 3),
                    theta_degrees=round((theta + 360) % 360, 1),
                    area_pct=round(random.uniform(0.18, 0.35), 2),
                    bbox=[round(r_norm * 100, 1), round(r_norm * 100, 1), 20.0, 20.0]
                )
                dtv = round(3.2 + (50 - i - 35) * 0.12 + random.uniform(-0.2, 0.2), 2)
                record = HistoricalInspectionRecord(
                    part_id=part_no,
                    timestamp=part_time,
                    image_filename=f"disc_{(50 - i):03d}.jpg",
                    overall_status="REVIEW",
                    defect_count=1,
                    condition="ALMOST_WORN",
                    wear_index_score=round(48.0 + (50 - i - 35) * 1.5, 1),
                    dtv_value_um=dtv,
                    runout_value_um=round(14.0 + random.uniform(0, 3), 1),
                    parallelism_value_um=round(24.0 + random.uniform(0, 4), 1),
                    highest_rpn=84,
                    primary_process_code="PU01",
                    station="Picking-up Station",
                    defects=[defect]
                )
            elif (50 - i) in [12, 28]:
                # Occasional CBN scoring line (DT16)
                defect = HistoricalDefectPoint(
                    defect_type="Concentric Grinding Scoring",
                    process_code="DT16",
                    severity="high",
                    confidence=0.91,
                    r_normalized=round(random.uniform(0.32, 0.36), 3),
                    theta_degrees=round(random.uniform(0, 360), 1),
                    area_pct=round(random.uniform(0.4, 0.7), 2),
                    bbox=[50.0, 50.0, 30.0, 30.0]
                )
                record = HistoricalInspectionRecord(
                    part_id=part_no,
                    timestamp=part_time,
                    image_filename=f"disc_{(50 - i):03d}.jpg",
                    overall_status="REVIEW",
                    defect_count=1,
                    condition="ALMOST_WORN",
                    wear_index_score=62.0,
                    dtv_value_um=4.6,
                    runout_value_um=16.2,
                    parallelism_value_um=28.5,
                    highest_rpn=126,
                    primary_process_code="DT16",
                    station="Grinding Station",
                    defects=[defect]
                )
            else:
                # Normal conforming disc (PASS)
                dtv = round(2.0 + random.uniform(-0.3, 0.3), 2)
                record = HistoricalInspectionRecord(
                    part_id=part_no,
                    timestamp=part_time,
                    image_filename=f"disc_{(50 - i):03d}.jpg",
                    overall_status="PASS",
                    defect_count=0,
                    condition="GOOD",
                    wear_index_score=round(12.0 + random.uniform(0, 8), 1),
                    dtv_value_um=dtv,
                    runout_value_um=round(11.0 + random.uniform(-1, 2), 1),
                    parallelism_value_um=round(16.0 + random.uniform(-2, 2), 1),
                    highest_rpn=0,
                    primary_process_code=None,
                    station=None,
                    defects=[]
                )

            cls.log_inspection(record)

        logger.info("Successfully seeded 50 historical quality telemetry records.")


# Initialize DB on module import
HistoricalDatabaseManager.init_db()
