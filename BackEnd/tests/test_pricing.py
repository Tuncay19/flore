import unittest

from app.pricing import calculate_quote, loyalty_for


class PricingTests(unittest.TestCase):
    def test_central_delivery_and_silver_discount_are_calculated_in_minor_units(self):
        quote = calculate_quote([(3, 1)], "central", registered=True)
        self.assertEqual(quote["subtotal_minor"], 600)
        self.assertEqual(quote["delivery_minor"], 1000)
        self.assertEqual(quote["discount_minor"], 12)
        self.assertEqual(quote["total_minor"], 1588)

    def test_outer_delivery_never_becomes_free(self):
        quote = calculate_quote([(14, 10)], "outer", registered=False)
        self.assertEqual(quote["subtotal_minor"], 10_000)
        self.assertEqual(quote["delivery_minor"], 2500)
        self.assertEqual(quote["total_minor"], 12_500)

    def test_status_thresholds_are_strictly_greater_than_written_amounts(self):
        self.assertEqual(loyalty_for(30_000, True).code, "silver")
        self.assertEqual(loyalty_for(30_001, True).code, "gold")
        self.assertEqual(loyalty_for(65_001, True).code, "platinum")
        self.assertEqual(loyalty_for(100_001, True).code, "diamond")

    def test_unknown_zone_and_client_prices_are_not_accepted(self):
        with self.assertRaises(ValueError):
            calculate_quote([(3, 1)], "unknown")
        with self.assertRaises(ValueError):
            calculate_quote([(999, 1)], "central")


if __name__ == "__main__":
    unittest.main()
