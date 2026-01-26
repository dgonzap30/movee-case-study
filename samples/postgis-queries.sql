-- Sample PostGIS Function: nearby_venues
--
-- Demonstrates Mövee's geospatial queries for finding venues
-- within a specified radius of a user's location.

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create venues table with geospatial column
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL, -- WGS84 coordinates
  current_capacity INTEGER DEFAULT 0,
  max_capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for fast proximity queries
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- Function to find venues within radius
CREATE OR REPLACE FUNCTION nearby_venues(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location JSON,
  current_capacity INTEGER,
  max_capacity INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    json_build_object(
      'type', 'Point',
      'coordinates', ARRAY[ST_X(v.location::geometry), ST_Y(v.location::geometry)]
    ) AS location,
    v.current_capacity,
    v.max_capacity,
    ST_Distance(
      v.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM venues v
  WHERE ST_DWithin(
    v.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Sample data
INSERT INTO venues (name, location, current_capacity, max_capacity) VALUES
  ('The Blue Note', ST_SetSRID(ST_MakePoint(-89.4012, 43.0731), 4326), 45, 100),
  ('State Street Brats', ST_SetSRID(ST_MakePoint(-89.3815, 43.0760), 4326), 78, 150),
  ('Memorial Union Terrace', ST_SetSRID(ST_MakePoint(-89.3990, 43.0766), 4326), 120, 200);
