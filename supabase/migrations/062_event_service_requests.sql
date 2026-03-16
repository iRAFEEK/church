-- Migration 062: Event Service Requests
-- Allows leaders to request specific people to serve in specific roles for events.
-- The assigned person can accept, decline, or reassign to someone else.

CREATE TABLE IF NOT EXISTS event_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id),
  requested_role TEXT NOT NULL CHECK (char_length(requested_role) <= 200),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'reassigned')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  response_note TEXT CHECK (response_note IS NULL OR char_length(response_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_esr_event ON event_service_requests(event_id);
CREATE INDEX idx_esr_church ON event_service_requests(church_id);
CREATE INDEX idx_esr_assigned ON event_service_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_esr_status ON event_service_requests(status) WHERE status = 'pending';
CREATE INDEX idx_esr_assigned_pending ON event_service_requests(assigned_to, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE event_service_requests ENABLE ROW LEVEL SECURITY;

-- Church isolation policy
CREATE POLICY "esr_church_isolation" ON event_service_requests
  FOR ALL USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER set_updated_at_event_service_requests
  BEFORE UPDATE ON event_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
