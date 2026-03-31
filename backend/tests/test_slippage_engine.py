import unittest

from app.services.slippage_engine import estimate_slippage, optimize_order_size, simulate_algo


class SlippageEngineTests(unittest.TestCase):
    def test_estimate_slippage_returns_positive_costs(self):
        result = estimate_slippage(
            order_size=10000,
            daily_volume=500000,
            spread=0.02,
            volatility=0.15,
            order_type="MARKET",
            venue="PRIMARY",
            price=100,
        )
        self.assertGreater(result.total_pct, 0)
        self.assertGreater(result.basis_points, 0)
        self.assertGreater(result.dollar_cost, 0)

    def test_algo_simulation_fills_order(self):
        result = simulate_algo(
            algo="VWAP",
            order_size=20000,
            daily_volume=800000,
            spread=0.02,
            volatility=0.12,
            periods=12,
            price=100,
        )
        self.assertEqual(result["filled"], 20000)
        self.assertGreater(result["completion"], 99)
        self.assertEqual(len(result["periods"]), 12)

    def test_order_optimizer_creates_multiple_slices(self):
        result = optimize_order_size(
            total_order=100000,
            daily_volume=500000,
            spread=0.02,
            volatility=0.15,
            urgency="MEDIUM",
            price=100,
        )
        self.assertGreater(result["num_slices"], 1)
        self.assertGreater(result["optimal_slice"], 0)


if __name__ == "__main__":
    unittest.main()
