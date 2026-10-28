"""Replace legacy staff roles with tu_van.

Revision ID: a6c91f20e84b
Revises: 8456b5f28c38
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a6c91f20e84b"
down_revision: Union[str, None] = "8456b5f28c38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE accounts SET role = 'tu_van' WHERE role != 'admin'")


def downgrade() -> None:
    op.execute("UPDATE accounts SET role = 'consultant' WHERE role = 'tu_van'")
