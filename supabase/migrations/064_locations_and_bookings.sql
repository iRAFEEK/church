-- ============================================================
-- 064: Church Locations & Room Booking
-- Adds location management and booking system with
-- overlap prevention via PostgreSQL EXCLUDE constraint
-- ============================================================

-- Enable btree_gist for exclusion constraints on ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- locations table
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  name_ar TEXT,
  location_type TEXT NOT NULL CHECK (location_type IN (
    'sanctuary', 'hall', 'classroom', 'prayer_room', 'office', 'nursery', 'other'
  )),
  capacity INT CHECK (capacity IS NULL OR capacity > 0),
  features TEXT[] DEFAULT '{}',
  notes TEXT,
  notes_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_locations_church ON locations (church_id) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER set_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view locations"
  ON locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = locations.church_id
  ));

CREATE POLICY "Admins can insert locations"
  ON locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = locations.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = locations.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Super admins can delete locations"
  ON locations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = locations.church_id
      AND p.role = 'super_admin'
  ));

-- ============================================================
-- location_bookings table
-- ============================================================

CREATE TABLE IF NOT EXISTS location_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  booked_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  title_ar TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_end_after_start CHECK (ends_at > starts_at)
);

-- Overlap prevention: DB-level exclusion constraint
-- Prevents any two confirmed bookings from overlapping on the same location
ALTER TABLE location_bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    location_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'confirmed');

-- Indexes
CREATE INDEX idx_location_bookings_church ON location_bookings (church_id);
CREATE INDEX idx_location_bookings_location_time
  ON location_bookings (location_id, starts_at, ends_at)
  WHERE status = 'confirmed';
CREATE INDEX idx_location_bookings_church_dates
  ON location_bookings (church_id, starts_at)
  WHERE status = 'confirmed';
CREATE INDEX idx_location_bookings_dashboard
  ON location_bookings (church_id, is_public, starts_at)
  WHERE status = 'confirmed' AND is_public = true;
CREATE INDEX idx_location_bookings_booked_by
  ON location_bookings (booked_by, starts_at);

-- Trigger for updated_at
CREATE TRIGGER set_location_bookings_updated_at
  BEFORE UPDATE ON location_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE location_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view bookings"
  ON location_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = location_bookings.church_id
  ));

CREATE POLICY "Leaders can insert bookings"
  ON location_bookings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = location_bookings.church_id
      AND p.role IN ('group_leader', 'ministry_leader', 'super_admin')
  ));

CREATE POLICY "Booker or admin can update bookings"
  ON location_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = location_bookings.church_id
      AND (location_bookings.booked_by = p.id OR p.role IN ('ministry_leader', 'super_admin'))
  ));

CREATE POLICY "Super admins can delete bookings"
  ON location_bookings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = location_bookings.church_id
      AND p.role = 'super_admin'
  ));
