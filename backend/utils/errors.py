from fastapi import HTTPException


def error_response(status_code: int, error_code: str, detail: str, field: str = None):
    content = {"error": error_code, "detail": detail}
    if field:
        content["field"] = field
    raise HTTPException(status_code=status_code, detail=content)
