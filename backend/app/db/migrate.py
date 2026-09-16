"""
Schema migration and synchronization utility.
Dynamically inspects SQLAlchemy models and ensures all new tables and columns
exist in the connected database without dropping existing data.
"""
import logging
from sqlalchemy import inspect, text
from app.core.database import Base, engine
import app.models  # Ensure all models are loaded

logger = logging.getLogger(__name__)


def sync_database_schema(bind_engine=engine):
    """
    Creates any missing tables and adds any missing columns to existing tables.
    Safe to run repeatedly on startup across SQLite and PostgreSQL.
    """
    # 1. Create any missing tables
    Base.metadata.create_all(bind=bind_engine)

    # 2. Inspect existing columns and add missing ones
    inspector = inspect(bind_engine)

    with bind_engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue

            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}

            for column in table.columns:
                if column.name not in existing_columns:
                    # Resolve SQL column type string
                    col_type = column.type.compile(bind_engine.dialect)
                    sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'
                    logger.info(f"Syncing schema: Adding column {table_name}.{column.name} ({col_type})")
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                    except Exception as e:
                        logger.warning(f"Could not auto-add column {table_name}.{column.name}: {e}")
