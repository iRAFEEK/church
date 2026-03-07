-- Migration 020: Add role/position fields to event service assignments
-- Allows specifying what each volunteer will do (e.g., "Camera Operator", "Vocals")

ALTER TABLE event_service_assignments
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS role_ar TEXT;
