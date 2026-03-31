import importlib
import os
import tempfile
import unittest


class PersistenceTests(unittest.TestCase):
    def test_trade_persistence_and_analytics(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.environ["SLIPPAGE_DB_PATH"] = os.path.join(tmpdir, "test.db")
            module = importlib.import_module("app.services.persistence")
            module = importlib.reload(module)
            module.init_db()
            module.record_trade(
                {
                    "user_id": None,
                    "side": "BUY",
                    "order_size": 1000,
                    "entry_price": 100.0,
                    "execution_price": 100.2,
                    "slippage_amount": 0.2,
                    "slippage_percentage": 0.2,
                    "slippage_bps": 20.0,
                    "dollar_cost": 200.0,
                    "order_type": "MARKET",
                    "venue": "PRIMARY",
                    "algorithm_used": "VWAP",
                    "execution_time_ms": 35,
                    "market_condition": "NORMAL",
                }
            )

            trades = module.list_recent_trades(10)
            analytics = module.get_execution_quality(10)
            attribution = module.get_cost_attribution(10)

            self.assertEqual(len(trades), 1)
            self.assertEqual(analytics["summary"]["trade_count"], 1)
            self.assertEqual(attribution["summary"]["trade_count"], 1)


if __name__ == "__main__":
    unittest.main()
