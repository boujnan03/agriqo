"""Field Shift backend: placeholder service.

This container only proves that the backend builds, starts and is reachable.
It holds NO business logic yet: NASA POWER access, features, scoring and
explanations still run inside the Streamlit frontend (frontend/src/).
See ARCHITECTURE.md, section 7, for the planned next step.
"""
from fastapi import FastAPI

app = FastAPI(title="Field Shift backend (placeholder)", version="0.0.1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
