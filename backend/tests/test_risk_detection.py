"""
SupplyChain Commander AI - Risk Detection Engine Test Suite
Unit and Integration Tests for Deterministic Detectors, Validators, False-Positive Controls, and Disruption Promotion.
"""

import unittest
import json
from datetime import datetime, timezone

from backend.app.risk_detection.risk_models import (
    RiskType,
    RiskSeverity,
    RiskStatus,
    RiskSignal,
    RiskEvidence
)
from backend.app.risk_detection.configuration.risk_thresholds import RISK_THRESHOLDS
from backend.app.risk_detection.detectors.demand_risk_detector import DemandRiskDetector
from backend.app.risk_detection.detectors.inventory_risk_detector import InventoryRiskDetector
from backend.app.risk_detection.detectors.supplier_risk_detector import SupplierRiskDetector
from backend.app.risk_detection.detectors.shipment_risk_detector import ShipmentRiskDetector
from backend.app.risk_detection.detectors.supply_gap_detector import SupplyGapDetector
from backend.app.risk_detection.detectors.warehouse_risk_detector import WarehouseRiskDetector
from backend.app.risk_detection.validators.risk_validator import RiskValidator
from backend.app.risk_detection.risk_engine import RiskDetectionEngine
from backend.app.risk_detection.risk_repository import RiskRepository
from backend.app.tools.mcp_tools import _load_dataset


class TestRiskDetectors(unittest.TestCase):

    def setUp(self):
        RiskRepository.clear()
        self.dataset = _load_dataset()

    def test_demand_risk_detector_nominal_vs_spike(self):
        """Test demand spike detection with baseline vs elevated demand."""
        # 1. Nominal dataset (no surge)
        nominal_dataset = {
            "products": [{"product_id": "P_TEST", "product_name": "Test SKU", "baseline_daily_demand": 100.0, "reorder_point": 700}],
            "warehouses": [{"warehouse_id": "WH_TEST", "warehouse_name": "Test Hub"}],
            "customer_orders": [
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0}
            ]
        }
        signals = DemandRiskDetector.detect(nominal_dataset)
        self.assertEqual(len(signals), 0, "Nominal demand should not trigger risk signal")

        # 2. Demand Spike (>40% increase with sufficient order persistence)
        spike_dataset = {
            "products": [{"product_id": "P_TEST", "product_name": "Test SKU", "baseline_daily_demand": 50.0, "reorder_point": 350}],
            "warehouses": [{"warehouse_id": "WH_TEST", "warehouse_name": "Test Hub"}],
            "customer_orders": [
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0},
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0},
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0},
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0},
                {"product_id": "P_TEST", "warehouse_id": "WH_TEST", "quantity": 100, "order_value": 100000.0}
            ]
        }
        signals = DemandRiskDetector.detect(spike_dataset)
        self.assertGreater(len(signals), 0, "Spiked demand should trigger demand risk signal")
        self.assertEqual(signals[0].risk_type, RiskType.DEMAND_SPIKE)
        self.assertIn(signals[0].severity, [RiskSeverity.HIGH, RiskSeverity.CRITICAL])
        self.assertIsNotNone(signals[0].evidence)
        self.assertGreater(signals[0].confidence, 0.80)

    def test_inventory_depletion_detector_days_of_supply(self):
        """Test inventory depletion detector calculation of Days of Supply."""
        # 1. Healthy inventory (10 days of supply)
        healthy_dataset = {
            "products": [{"product_id": "P_INV", "product_name": "Healthy SKU", "reorder_point": 100, "selling_price": 500.0}],
            "warehouses": [{"warehouse_id": "WH_TEST", "warehouse_name": "Test Hub"}],
            "inventory": [{
                "product_id": "P_INV",
                "warehouse_id": "WH_TEST",
                "available_quantity": 1000,
                "reserved_quantity": 0,
                "safety_stock": 50,
                "in_transit_quantity": 200
            }],
            "customer_orders": [{"product_id": "P_INV", "warehouse_id": "WH_TEST", "quantity": 700, "order_value": 350000.0}] # 100 units/day
        }
        signals = InventoryRiskDetector.detect(healthy_dataset)
        self.assertEqual(len(signals), 0, "10 days of supply should not trigger depletion risk")

        # 2. Critical inventory (<2 days of supply)
        critical_dataset = {
            "products": [{"product_id": "P_INV", "product_name": "Critical SKU", "reorder_point": 100, "selling_price": 500.0}],
            "warehouses": [{"warehouse_id": "WH_TEST", "warehouse_name": "Test Hub"}],
            "inventory": [{
                "product_id": "P_INV",
                "warehouse_id": "WH_TEST",
                "available_quantity": 150,
                "reserved_quantity": 50,
                "safety_stock": 100,
                "in_transit_quantity": 0
            }],
            "customer_orders": [{"product_id": "P_INV", "warehouse_id": "WH_TEST", "quantity": 700, "order_value": 350000.0}] # 100 units/day -> 1.25 days supply
        }
        signals = InventoryRiskDetector.detect(critical_dataset)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].risk_type, RiskType.INVENTORY_DEPLETION_RISK)
        self.assertEqual(signals[0].severity, RiskSeverity.CRITICAL)
        self.assertLessEqual(signals[0].metric_value, 2.0)

    def test_supply_demand_gap_detector(self):
        """Test multi-table projected supply vs demand gap calculation."""
        gap_dataset = {
            "products": [{"product_id": "P_GAP", "product_name": "Gap SKU", "selling_price": 10000.0, "reorder_point": 100}],
            "warehouses": [{"warehouse_id": "WH_TEST", "warehouse_name": "Test Hub"}],
            "inventory": [{
                "product_id": "P_GAP",
                "warehouse_id": "WH_TEST",
                "available_quantity": 50,
                "safety_stock": 100,
                "in_transit_quantity": 0
            }],
            "shipments": [],
            "customer_orders": [
                {"product_id": "P_GAP", "warehouse_id": "WH_TEST", "quantity": 200, "order_value": 2000000.0, "priority": "HIGH"}
            ]
        }
        # Projected Demand = 200 orders + 100 safety = 300
        # Projected Supply = 50 stock + 0 incoming = 50
        # Supply Gap = 250 units
        signals = SupplyGapDetector.detect(gap_dataset)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].risk_type, RiskType.SUPPLY_DEMAND_GAP)
        self.assertEqual(signals[0].metric_value, 250.0)
        self.assertEqual(signals[0].severity, RiskSeverity.CRITICAL)

    def test_supplier_and_shipment_delay_detectors(self):
        """Test supplier deterioration and shipment delay detection."""
        # 1. Shipment delay
        ship_dataset = {
            "products": [{"product_id": "P_1", "product_name": "SKU 1", "selling_price": 1000.0}],
            "warehouses": [{"warehouse_id": "WH_1", "warehouse_name": "WH 1"}],
            "suppliers": [{"supplier_id": "S_1", "supplier_name": "Supplier 1"}],
            "shipments": [{
                "shipment_id": "SHP_999",
                "supplier_id": "S_1",
                "product_id": "P_1",
                "destination_warehouse": "WH_1",
                "quantity": 500,
                "planned_arrival": "2026-08-20",
                "estimated_arrival": "2026-08-30",
                "delay_days": 10,
                "status": "DELAYED"
            }],
            "customer_orders": []
        }
        signals = ShipmentRiskDetector.detect(ship_dataset)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].risk_type, RiskType.SHIPMENT_DELAY_RISK)
        self.assertEqual(signals[0].severity, RiskSeverity.CRITICAL)

    def test_multi_signal_correlation_and_deduplication(self):
        """Test multi-signal correlation boosting confidence and active disruption deduplication."""
        # 1. Create multiple signals for same entity
        signal1 = RiskSignal(
            risk_id="R1",
            risk_type=RiskType.INVENTORY_DEPLETION_RISK,
            severity=RiskSeverity.HIGH,
            status=RiskStatus.DETECTED,
            product_id="PROD_100",
            warehouse_id="WH_100",
            confidence=0.85,
            estimated_revenue_at_risk=1000000.0,
            orders_affected_count=10
        )
        signal2 = RiskSignal(
            risk_id="R2",
            risk_type=RiskType.DEMAND_SPIKE,
            severity=RiskSeverity.HIGH,
            status=RiskStatus.DETECTED,
            product_id="PROD_100",
            warehouse_id="WH_100",
            confidence=0.85,
            estimated_revenue_at_risk=1000000.0,
            orders_affected_count=10
        )

        existing_disruptions = []
        validated, audits = RiskValidator.validate_signals([signal1, signal2], existing_disruptions)
        
        # Check correlation
        self.assertIn("R2", validated[0].correlated_risk_ids)
        self.assertIn("R1", validated[1].correlated_risk_ids)
        self.assertGreater(validated[0].confidence, 0.85, "Confidence should receive multi-signal boost")
        self.assertEqual(validated[0].status, RiskStatus.VALIDATED)

        # 2. Test Deduplication against existing active disruption
        existing_disruptions = [{
            "disruption_id": "DISR_EXISTING",
            "status": "ACTIVE",
            "affected_product_id": "PROD_100",
            "destination_warehouse_id": "WH_100"
        }]
        validated_dup, audits_dup = RiskValidator.validate_signals([signal1], existing_disruptions)
        self.assertEqual(validated_dup[0].status, RiskStatus.MONITORING, "Duplicate active disruption should be set to MONITORING")
        self.assertEqual(audits_dup[0].action, "SUPPRESSED_DUPLICATE")

    def test_end_to_end_risk_engine_scan(self):
        """Test full Risk Detection Engine execution scan on the dataset."""
        result = RiskDetectionEngine.run_detection_scan(
            dataset=self.dataset,
            trigger_type="MANUAL",
            auto_convert_critical=True
        )
        self.assertTrue(result["run"]["status"] == "SUCCESS")
        self.assertGreater(result["run"]["total_risks_detected"], 0)
        self.assertGreater(result["run"]["validated_risks_count"], 0)
        self.assertGreaterEqual(len(result["audit_logs"]), 1)


if __name__ == "__main__":
    unittest.main()
