from typing import Optional

from pydantic import BaseModel


class WhatIfRequest(BaseModel):
    policy_id: str
    modifications: dict = {}
