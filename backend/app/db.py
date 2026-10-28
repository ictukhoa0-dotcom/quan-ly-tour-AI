from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def ensure_account_session_version(database_engine: Engine = engine) -> None:
    inspector = inspect(database_engine)
    if "accounts" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("accounts")}
    if "session_version" not in columns:
        with database_engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE accounts ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0"
            ))


def ensure_customer_password_hash(database_engine: Engine = engine) -> None:
    inspector = inspect(database_engine)
    if "customers" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("customers")}
    if "password_hash" not in columns:
        with database_engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE customers ADD COLUMN password_hash VARCHAR(128) NOT NULL DEFAULT ''"
            ))


def ensure_tour_image_url(database_engine: Engine = engine) -> None:
    inspector = inspect(database_engine)
    if "tours" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tours")}
    if "image_url" not in columns:
        with database_engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE tours ADD COLUMN image_url VARCHAR(500) NOT NULL DEFAULT ''"
            ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
