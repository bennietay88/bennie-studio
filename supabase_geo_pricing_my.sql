-- Malaysia Geo-Pricing Migration
INSERT INTO geo_pricing (country_code, country_name, discount_percentage, is_enabled)
VALUES ('MY', 'Malaysia', 40, true)
ON CONFLICT (country_code) DO UPDATE SET
  discount_percentage = EXCLUDED.discount_percentage,
  is_enabled = EXCLUDED.is_enabled;
