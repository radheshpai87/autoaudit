"""SQLAlchemy-backed inspection history (PostgreSQL in production, SQLite locally)."""

import json
import logging
import os
from typing import List, Optional

from sqlalchemy import (
    Column, Float, ForeignKey, Integer, MetaData, String, Table, Text,
    case, create_engine, delete, func, insert, inspect, select, text, update,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.engine import Engine

from app.config import settings
from app.models.historical_schemas import HistoricalDefectPoint, HistoricalInspectionRecord

logger = logging.getLogger("autoinspect.historical")

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
DB_PATH = os.path.join(DB_DIR, "inspection_history.db")


def _database_url() -> str:
    configured = settings.DATABASE_URL or os.getenv("DATABASE_URL")
    if not configured:
        os.makedirs(DB_DIR, exist_ok=True)
        return f"sqlite:///{DB_PATH}"
    # Render, Heroku, and some secret stores commonly provide postgres:// URLs.
    if configured.startswith("postgres://"):
        configured = "postgresql://" + configured[len("postgres://"):]
    if configured.startswith("postgresql://"):
        configured = "postgresql+psycopg://" + configured[len("postgresql://"):]
    return configured


DATABASE_URL = _database_url()
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite:") else {}
if DATABASE_URL.startswith("postgresql") and "sslmode=" not in DATABASE_URL:
    _connect_args["sslmode"] = "require"
_pool_options = {} if DATABASE_URL.startswith("sqlite:") else {"pool_size": 5, "max_overflow": 10}
engine: Engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=_connect_args,
    **_pool_options,
)

metadata = MetaData()
inspections = Table(
    "inspections", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("part_id", String, unique=True, index=True),
    Column("timestamp", String, index=True),
    Column("image_filename", String),
    Column("overall_status", String),
    Column("defect_count", Integer),
    Column("condition", String),
    Column("wear_index_score", Float),
    Column("dtv_value_um", Float),
    Column("runout_value_um", Float),
    Column("parallelism_value_um", Float),
    Column("highest_rpn", Integer),
    Column("primary_process_code", String),
    Column("station", String),
    Column("batch_id", String, index=True),
    Column("inference_mode", String),
    Column("model_name", String),
    Column("top_failure_mode", String),
    Column("recommended_action", Text),
    Column("review_required", Integer, default=0, index=True),
    Column("review_status", String, default="not_required", index=True),
    Column("reviewed_by", String),
    Column("reviewed_at", String),
    Column("review_notes", Text),
    Column("raw_s3_key", String),
    Column("annotated_s3_key", String),
    Column("heatmap_s3_key", String),
)
defect_points = Table(
    "defect_points", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("inspection_id", Integer, ForeignKey("inspections.id", ondelete="CASCADE"), index=True),
    Column("defect_type", String),
    Column("process_code", String, index=True),
    Column("severity", String),
    Column("confidence", Float),
    Column("dx_normalized", Float),
    Column("dy_normalized", Float),
    Column("r_normalized", Float),
    Column("theta_degrees", Float),
    Column("clock_hour", Float),
    Column("zone_name", String),
    Column("area_pct", Float),
    Column("bbox_json", Text),
    Column("mask_polygon_json", Text),
    Column("image_width", Integer),
    Column("image_height", Integer),
)


class HistoricalDatabaseManager:
    """Persists real inspection records and defect coordinates to one database."""

    @classmethod
    def init_db(cls) -> None:
        metadata.create_all(engine)
        # Additive, idempotent compatibility migration for databases created by
        # the previous SQLite schema and deployments upgrading in place.
        inspector = inspect(engine)
        existing_inspections = {column["name"] for column in inspector.get_columns("inspections")}
        existing_points = {column["name"] for column in inspector.get_columns("defect_points")}
        inspection_additions = {
            "raw_s3_key": "TEXT",
            "annotated_s3_key": "TEXT",
            "heatmap_s3_key": "TEXT",
            "batch_id": "TEXT",
            "inference_mode": "TEXT NOT NULL DEFAULT 'demo_mock'",
            "model_name": "TEXT NOT NULL DEFAULT 'Unknown model'",
            "top_failure_mode": "TEXT",
            "recommended_action": "TEXT",
            "review_required": "INTEGER NOT NULL DEFAULT 0",
            "review_status": "TEXT NOT NULL DEFAULT 'not_required'",
            "reviewed_by": "TEXT",
            "reviewed_at": "TEXT",
            "review_notes": "TEXT",
        }
        point_additions = {
            "mask_polygon_json": "TEXT",
            "image_width": "INTEGER",
            "image_height": "INTEGER",
        }
        with engine.begin() as conn:
            for name, sql_type in inspection_additions.items():
                if name not in existing_inspections:
                    conn.execute(text(f"ALTER TABLE inspections ADD COLUMN {name} {sql_type}"))
            for name, sql_type in point_additions.items():
                if name not in existing_points:
                    conn.execute(text(f"ALTER TABLE defect_points ADD COLUMN {name} {sql_type}"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_defect_process_code ON defect_points(process_code)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inspections_batch_id ON inspections(batch_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inspections_review_status ON inspections(review_status)"))
        logger.info("Inspection history database initialized (%s)", engine.dialect.name)

    @classmethod
    def clear_all_records(cls) -> None:
        with engine.begin() as conn:
            conn.execute(delete(defect_points))
            conn.execute(delete(inspections))
        logger.info("Historical database wiped clean.")

    @classmethod
    def log_inspection(cls, record: HistoricalInspectionRecord) -> int:
        values = {
            "part_id": record.part_id,
            "timestamp": record.timestamp,
            "image_filename": record.image_filename,
            "overall_status": record.overall_status,
            "defect_count": record.defect_count,
            "condition": record.condition,
            "wear_index_score": record.wear_index_score,
            "dtv_value_um": record.dtv_value_um,
            "runout_value_um": record.runout_value_um,
            "parallelism_value_um": record.parallelism_value_um,
            "highest_rpn": record.highest_rpn,
            "primary_process_code": record.primary_process_code,
            "station": record.station,
            "batch_id": record.batch_id,
            "inference_mode": record.inference_mode,
            "model_name": record.model_name,
            "top_failure_mode": record.top_failure_mode,
            "recommended_action": record.recommended_action,
            "review_required": int(record.review_required),
            "review_status": record.review_status,
            "reviewed_by": record.reviewed_by,
            "reviewed_at": record.reviewed_at,
            "review_notes": record.review_notes,
            "raw_s3_key": record.raw_s3_key,
            "annotated_s3_key": record.annotated_s3_key,
            "heatmap_s3_key": record.heatmap_s3_key,
        }
        dialect = engine.dialect.name
        insert_builder = pg_insert if dialect == "postgresql" else sqlite_insert if dialect == "sqlite" else None
        if insert_builder is None:
            raise RuntimeError(f"Unsupported history database dialect: {dialect}")
        statement = insert_builder(inspections).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[inspections.c.part_id],
            set_={key: statement.excluded[key] for key in values if key != "part_id"},
        )
        with engine.begin() as conn:
            conn.execute(statement)
            inspection_id = conn.execute(
                select(inspections.c.id).where(inspections.c.part_id == record.part_id)
            ).scalar_one()
            conn.execute(delete(defect_points).where(defect_points.c.inspection_id == inspection_id))
            if record.defects:
                conn.execute(insert(defect_points), [
                    {
                        "inspection_id": inspection_id,
                        "defect_type": defect.defect_type,
                        "process_code": defect.process_code,
                        "severity": defect.severity,
                        "confidence": defect.confidence,
                        "dx_normalized": defect.dx_normalized,
                        "dy_normalized": defect.dy_normalized,
                        "r_normalized": defect.r_normalized,
                        "theta_degrees": defect.theta_degrees,
                        "clock_hour": defect.clock_hour,
                        "zone_name": defect.zone_name,
                        "area_pct": defect.area_pct,
                        "bbox_json": json.dumps(defect.bbox),
                        "mask_polygon_json": json.dumps(defect.mask_polygon) if defect.mask_polygon else None,
                        "image_width": defect.image_width,
                        "image_height": defect.image_height,
                    }
                    for defect in record.defects
                ])
        return int(inspection_id)

    @classmethod
    def get_recent_inspections(
        cls,
        limit: int = 100,
        offset: int = 0,
        batch_id: Optional[str] = None,
        review_status: Optional[str] = None,
        include_urls: bool = True,
    ) -> List[HistoricalInspectionRecord]:
        from app.services.storage_service import storage_service

        safe_limit = max(1, min(int(limit), 1000))
        safe_offset = max(0, int(offset))
        query = select(inspections)
        if batch_id is not None:
            query = query.where(inspections.c.batch_id == batch_id)
        if review_status is not None:
            query = query.where(inspections.c.review_status == review_status)
        query = query.order_by(inspections.c.timestamp.desc()).limit(safe_limit).offset(safe_offset)
        with engine.connect() as conn:
            rows = conn.execute(query).mappings().all()
            records: List[HistoricalInspectionRecord] = []
            for row in rows:
                inspection_id = row["id"]
                defect_rows = conn.execute(
                    select(defect_points).where(defect_points.c.inspection_id == inspection_id)
                ).mappings().all()
                defects = [HistoricalDefectPoint(
                    defect_type=point["defect_type"],
                    process_code=point["process_code"],
                    severity=point["severity"],
                    confidence=point["confidence"],
                    dx_normalized=point["dx_normalized"] if point["dx_normalized"] is not None else 0.0,
                    dy_normalized=point["dy_normalized"] if point["dy_normalized"] is not None else 0.0,
                    r_normalized=point["r_normalized"],
                    theta_degrees=point["theta_degrees"],
                    clock_hour=point["clock_hour"] if point["clock_hour"] is not None else 12.0,
                    zone_name=point["zone_name"] or "Swept Friction Band",
                    area_pct=point["area_pct"] or 0.0,
                    bbox=json.loads(point["bbox_json"]) if point["bbox_json"] else [],
                    mask_polygon=json.loads(point["mask_polygon_json"]) if point["mask_polygon_json"] else None,
                    image_width=point["image_width"],
                    image_height=point["image_height"],
                ) for point in defect_rows]
                records.append(HistoricalInspectionRecord(
                    id=inspection_id,
                    part_id=row["part_id"],
                    timestamp=row["timestamp"],
                    image_filename=row["image_filename"],
                    overall_status=row["overall_status"],
                    defect_count=row["defect_count"],
                    condition=row["condition"],
                    wear_index_score=row["wear_index_score"],
                    dtv_value_um=row["dtv_value_um"],
                    runout_value_um=row["runout_value_um"],
                    parallelism_value_um=row["parallelism_value_um"],
                    highest_rpn=row["highest_rpn"],
                    primary_process_code=row["primary_process_code"],
                    station=row["station"],
                    batch_id=row.get("batch_id"),
                    inference_mode=row.get("inference_mode") or "demo_mock",
                    model_name=row.get("model_name") or "Unknown model",
                    top_failure_mode=row.get("top_failure_mode"),
                    recommended_action=row.get("recommended_action"),
                    review_required=bool(row.get("review_required", 0)),
                    review_status=row.get("review_status") or "not_required",
                    reviewed_by=row.get("reviewed_by"),
                    reviewed_at=row.get("reviewed_at"),
                    review_notes=row.get("review_notes"),
                    raw_s3_key=row.get("raw_s3_key"),
                    annotated_s3_key=row.get("annotated_s3_key"),
                    heatmap_s3_key=row.get("heatmap_s3_key"),
                    raw_image_url=storage_service.get_presigned_url(row.get("raw_s3_key")) if include_urls else None,
                    annotated_image_url=storage_service.get_presigned_url(row.get("annotated_s3_key")) if include_urls else None,
                    heatmap_image_url=storage_service.get_presigned_url(row.get("heatmap_s3_key")) if include_urls else None,
                    defects=defects,
                ))
        return records

    @classmethod
    def count_inspections(
        cls, batch_id: Optional[str] = None, review_status: Optional[str] = None
    ) -> int:
        query = select(func.count()).select_from(inspections)
        if batch_id is not None:
            query = query.where(inspections.c.batch_id == batch_id)
        if review_status is not None:
            query = query.where(inspections.c.review_status == review_status)
        with engine.connect() as conn:
            return int(conn.execute(query).scalar_one())

    @classmethod
    def get_batch_summaries(cls) -> list[dict]:
        batch_key = func.coalesce(func.nullif(inspections.c.batch_id, ""), "UNASSIGNED").label("batch_id")
        query = select(
            batch_key,
            func.count().label("total_parts"),
            func.sum(case((inspections.c.defect_count > 0, 1), else_=0)).label("defect_parts"),
            func.sum(inspections.c.defect_count).label("defect_count"),
            func.sum(case((inspections.c.overall_status == "PASS", 1), else_=0)).label("pass_count"),
            func.sum(case((inspections.c.overall_status == "REVIEW", 1), else_=0)).label("review_count"),
            func.sum(case((inspections.c.overall_status == "REJECT", 1), else_=0)).label("reject_count"),
            func.max(inspections.c.timestamp).label("latest_inspection"),
        ).group_by(batch_key).order_by(func.max(inspections.c.timestamp).desc())
        with engine.connect() as conn:
            rows = conn.execute(query).mappings().all()
        output = []
        for row in rows:
            total = int(row["total_parts"] or 0)
            defective = int(row["defect_parts"] or 0)
            output.append({
                "batch_id": row["batch_id"],
                "total_parts": total,
                "defect_parts": defective,
                "defect_count": int(row["defect_count"] or 0),
                "pass_count": int(row["pass_count"] or 0),
                "review_count": int(row["review_count"] or 0),
                "reject_count": int(row["reject_count"] or 0),
                "defect_rate": round(defective / total * 100, 2) if total else 0.0,
                "yield_rate": round((total - defective) / total * 100, 2) if total else 0.0,
                "latest_inspection": row["latest_inspection"],
            })
        return output

    @classmethod
    def get_dashboard_analytics(cls) -> dict:
        with engine.connect() as conn:
            totals = conn.execute(select(
                func.count().label("total"),
                func.sum(case((inspections.c.overall_status == "PASS", 1), else_=0)).label("passed"),
                func.sum(case((inspections.c.overall_status == "REVIEW", 1), else_=0)).label("review"),
                func.sum(case((inspections.c.overall_status == "REJECT", 1), else_=0)).label("rejected"),
                func.sum(case((inspections.c.inference_mode == "real_ai", 1), else_=0)).label("real_ai"),
                func.sum(inspections.c.defect_count).label("defects"),
            )).mappings().one()
            defect_rows = conn.execute(select(
                defect_points.c.defect_type,
                func.count().label("count"),
                func.count(func.distinct(defect_points.c.inspection_id)).label("parts_affected"),
            ).group_by(defect_points.c.defect_type).order_by(func.count().desc())).mappings().all()
            station_rows = conn.execute(select(
                inspections.c.station,
                func.count().label("inspection_count"),
                func.max(inspections.c.highest_rpn).label("max_rpn"),
            ).where(inspections.c.station.is_not(None)).group_by(inspections.c.station).order_by(func.max(inspections.c.highest_rpn).desc())).mappings().all()
            batch_trend_key = func.coalesce(func.nullif(inspections.c.batch_id, ""), "UNASSIGNED").label("batch_id")
            trend_rows = conn.execute(select(
                batch_trend_key,
                func.count().label("total_parts"),
                func.sum(case((inspections.c.defect_count > 0, 1), else_=0)).label("defect_parts"),
                func.max(inspections.c.timestamp).label("latest"),
            ).group_by(batch_trend_key).order_by(func.max(inspections.c.timestamp).asc())).mappings().all()
            stations = []
            for station in station_rows:
                risk = conn.execute(select(
                    inspections.c.top_failure_mode, inspections.c.recommended_action
                ).where(inspections.c.station == station["station"]).order_by(inspections.c.highest_rpn.desc()).limit(1)).mappings().first()
                stations.append({
                    "station": station["station"],
                    "inspection_count": int(station["inspection_count"] or 0),
                    "max_rpn": int(station["max_rpn"] or 0),
                    "failure_mode": risk["top_failure_mode"] if risk else None,
                    "recommended_action": risk["recommended_action"] if risk else None,
                })
        total = int(totals["total"] or 0)
        breakdown = [{
            "defect_type": row["defect_type"],
            "count": int(row["count"]),
            "parts_affected": int(row["parts_affected"]),
            "part_rate": round(int(row["parts_affected"]) / total * 100, 2) if total else 0.0,
        } for row in defect_rows]
        trend = []
        for row in trend_rows:
            count = int(row["total_parts"] or 0)
            defects = int(row["defect_parts"] or 0)
            trend.append({
                "batch_id": row["batch_id"],
                "total_parts": count,
                "defect_count": defects,
                "defect_rate": round(defects / count * 100, 2) if count else 0.0,
                "yield_rate": round((count - defects) / count * 100, 2) if count else 0.0,
                "latest_inspection": row["latest"].isoformat() if hasattr(row["latest"], "isoformat") else str(row["latest"] or ""),
            })
        return {
            "total_inspections": total,
            "passed_count": int(totals["passed"] or 0),
            "review_count": int(totals["review"] or 0),
            "rejected_count": int(totals["rejected"] or 0),
            "real_ai_count": int(totals["real_ai"] or 0),
            "total_defects": int(totals["defects"] or 0),
            "defect_breakdown": breakdown,
            "station_ranking": stations,
            "batch_trend": trend,
        }

    @classmethod
    def update_review(cls, part_id: str, status: str, reviewer: str, notes: Optional[str]) -> bool:
        from datetime import datetime, timezone
        values = {
            "review_required": int(status == "pending"),
            "review_status": status,
            "reviewed_by": reviewer,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "review_notes": notes,
        }
        with engine.begin() as conn:
            result = conn.execute(update(inspections).where(inspections.c.part_id == part_id).values(**values))
            return bool(result.rowcount)


# Initialize schema at startup. Invalid configured database URLs fail visibly
# rather than silently writing production history to an ephemeral local file.
HistoricalDatabaseManager.init_db()
