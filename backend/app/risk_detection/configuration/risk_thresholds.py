"""
SupplyChain Commander AI - Risk Detection Configuration & Thresholds
Centralized, configurable threshold settings for all deterministic detectors and validators.
"""

from typing import Dict, Any

RISK_THRESHOLDS: Dict[str, Any] = {
    # 1. Demand Spike Detector Thresholds
    "demand_spike": {
        "low": 0.10,          # 10% - 20% increase
        "medium": 0.20,       # 20% - 30% increase
        "high": 0.30,         # 30% - 50% increase
        "critical": 0.50,     # >50% increase over baseline
        "min_consecutive_days": 2, # Require persistence to filter 1-day noise
        "min_order_volume": 5      # Minimum order count to trigger
    },

    # 2. Inventory Depletion Detector Thresholds (Days of Supply = Available / Daily Demand)
    "inventory_depletion": {
        "critical_days_of_supply": 2.0,   # <2 days of supply -> CRITICAL
        "high_days_of_supply": 5.0,       # <5 days of supply -> HIGH
        "medium_days_of_supply": 8.0,     # <8 days of supply -> MEDIUM
        "low_days_of_supply": 12.0,       # <12 days of supply -> LOW
        "safety_stock_deficit_pct": 0.25  # Stock below 75% of safety stock buffer
    },

    # 3. Supplier Performance Deterioration Thresholds
    "supplier_performance": {
        "otd_drop_medium": 0.10,         # 10 percentage point drop in On-Time Delivery
        "otd_drop_high": 0.20,           # 20 percentage point drop
        "otd_drop_critical": 0.30,       # 30 percentage point drop
        "avg_delay_days_medium": 2.0,    # Average delay >= 2 days
        "avg_delay_days_high": 4.0,      # Average delay >= 4 days
        "avg_delay_days_critical": 7.0,  # Average delay >= 7 days
        "quality_score_min": 0.90,       # Quality score falling below 90%
        "observation_window_days": 30    # Rolling window for performance comparison
    },

    # 4. Shipment Delay Detector Thresholds
    "shipment_delay": {
        "delay_days_low": 2,             # 2-3 days late
        "delay_days_medium": 4,          # 4-6 days late
        "delay_days_high": 7,            # 7-10 days late
        "delay_days_critical": 10,       # >10 days late
        "min_delayed_units": 50          # Minimum delayed units to flag
    },

    # 5. Supply-Demand Gap Detector Thresholds
    "supply_demand_gap": {
        "planning_horizon_days": 14,     # 14-day lookahead window
        "gap_ratio_medium": 0.15,        # Deficit is 15-25% of demand
        "gap_ratio_high": 0.25,          # Deficit is 25-45% of demand
        "gap_ratio_critical": 0.45,      # Deficit is >45% of demand
        "min_gap_units": 20,             # Minimum absolute unit deficit
        "min_revenue_at_risk": 500000.0  # Minimum ₹500,000 revenue exposure
    },

    # 6. Warehouse Capacity Risk Thresholds
    "warehouse_capacity": {
        "utilization_warning": 0.85,     # 85% capacity reached
        "utilization_high": 0.90,        # 90% capacity reached
        "utilization_critical": 0.95,    # 95% capacity reached
        "inbound_overflow_buffer": 0.05  # Incoming shipments push utilization +5% over max
    },

    # 7. False Positive Control, Minimum Business Impact & Cooldown
    "validation": {
        "min_revenue_impact": 250000.0,  # Risks affecting < ₹250k are lowered to MONITORING
        "min_orders_affected": 2,        # Must affect at least 2 customer orders
        "cooldown_hours": 24,            # Disruption generation cooldown for same SKU/warehouse
        "min_validation_score": 60.0,    # Score threshold (0-100) to auto-convert to disruption
        "multi_signal_confidence_boost": 0.12 # +12% confidence when correlated with other signals
    }
}
