import os
from dataclasses import dataclass

@dataclass
class Settings:
    PROJECT_NAME: str = "SupplyChain Commander AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    BIGQUERY_DATASET: str = os.getenv("BIGQUERY_DATASET", "supply_chain_analytics")
    FIRESTORE_COLLECTION_INVESTIGATIONS: str = "investigations"
    FIRESTORE_COLLECTION_LOGS: str = "agent_execution_logs"
    
    # Default Scoring Weights (Deterministic Scoring Engine)
    DEFAULT_RECOVERY_SPEED_WEIGHT: float = 0.30
    DEFAULT_REVENUE_PROTECTION_WEIGHT: float = 0.25
    DEFAULT_COST_EFFICIENCY_WEIGHT: float = 0.25
    DEFAULT_CUSTOMER_IMPACT_WEIGHT: float = 0.20

settings = Settings()
