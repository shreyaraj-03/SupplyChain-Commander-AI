from typing import Optional, Dict, Any
from backend.app.config.settings import settings
from backend.app.services.investigation_service import (
    get_all_disruptions,
    get_disruption_by_id,
    create_investigation,
    get_investigation_by_id
)

# FastAPI application definitions (for production Uvicorn / Cloud Run deployment)
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Autonomous Multi-Agent Supply Chain Disruption & Recovery Decision Engine"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class InvestigationRequest(BaseModel):
        disruption_id: str
        scoring_weights: Optional[Dict[str, float]] = None

    @app.get("/api/health")
    def health_check():
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION
        }

    @app.get("/api/disruptions")
    def list_disruptions():
        disruptions = get_all_disruptions()
        return {"success": True, "count": len(disruptions), "disruptions": disruptions}

    @app.get("/api/disruptions/{disruption_id}")
    def disruption_detail(disruption_id: str):
        d = get_disruption_by_id(disruption_id)
        if not d:
            raise HTTPException(status_code=404, detail="Disruption not found")
        return {"success": True, "disruption": d}

    @app.post("/api/investigations")
    def start_investigation(req: InvestigationRequest):
        inv = create_investigation(req.disruption_id, req.scoring_weights)
        if inv.get("status") == "FAILED":
            raise HTTPException(status_code=400, detail=inv.get("error"))
        return {"success": True, "investigation": inv}

    @app.get("/api/investigations/{investigation_id}")
    def fetch_investigation(investigation_id: str):
        inv = get_investigation_by_id(investigation_id)
        if not inv:
            raise HTTPException(status_code=404, detail="Investigation not found")
        return {"success": True, "investigation": inv}

except ImportError:
    # Running in lightweight Python runtime environment without fastapi installed
    app = None

if __name__ == "__main__":
    import sys
    print(f"SupplyChain Commander AI Python Backend Core initialized. Settings: {settings.PROJECT_NAME} v{settings.VERSION}")
