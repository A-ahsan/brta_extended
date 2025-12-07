-- =====================================================
-- Add Due Date and Enhanced Features to Traffic Violations
-- =====================================================

-- Add due_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'traffic_violations' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE traffic_violations ADD COLUMN due_date DATE;
        RAISE NOTICE 'Added due_date column to traffic_violations';
    ELSE
        RAISE NOTICE 'due_date column already exists';
    END IF;
END $$;

-- Set default due dates for existing violations based on severity
-- Get severity from violation_types table and set appropriate due dates
UPDATE traffic_violations tv
SET due_date = DATE(tv.violation_date) + 
    CASE 
        WHEN vt.severity = 'critical' THEN INTERVAL '7 days'   -- Critical: 7 days
        WHEN vt.severity = 'severe' THEN INTERVAL '15 days'    -- Severe: 15 days
        WHEN vt.severity = 'moderate' THEN INTERVAL '30 days'  -- Moderate: 30 days
        WHEN vt.severity = 'minor' THEN INTERVAL '45 days'     -- Minor: 45 days
        ELSE INTERVAL '30 days'                                -- Default: 30 days
    END
FROM violation_types vt
WHERE tv.violation_type_id = vt.id
AND tv.due_date IS NULL 
AND tv.violation_date IS NOT NULL;

-- Create index on due_date for faster queries
CREATE INDEX IF NOT EXISTS idx_traffic_violations_due_date ON traffic_violations(due_date);

-- Create index on payment_status for filtering
CREATE INDEX IF NOT EXISTS idx_traffic_violations_payment_status_enhanced 
ON traffic_violations(payment_status) WHERE status = 'active';

-- =====================================================
-- Function to check overdue violations (no late fee)
-- =====================================================

CREATE OR REPLACE FUNCTION update_overdue_violations()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Just return count of overdue violations (no status update)
    SELECT COUNT(*) INTO updated_count
    FROM traffic_violations
    WHERE 
        payment_status = 'unpaid' 
        AND due_date < CURRENT_DATE
        AND status = 'active';
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to check days until due
-- =====================================================

CREATE OR REPLACE FUNCTION get_days_until_due(violation_due_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (violation_due_date - CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Trigger to auto-set due date based on severity
-- =====================================================

CREATE OR REPLACE FUNCTION set_violation_due_date()
RETURNS TRIGGER AS $$
DECLARE
    v_severity VARCHAR(20);
BEGIN
    -- Set due date based on violation severity if not provided
    IF NEW.due_date IS NULL AND NEW.violation_date IS NOT NULL THEN
        -- Get severity from violation_types
        SELECT severity INTO v_severity
        FROM violation_types
        WHERE id = NEW.violation_type_id;
        
        -- Set due date based on severity
        NEW.due_date := DATE(NEW.violation_date) + 
            CASE 
                WHEN v_severity = 'critical' THEN INTERVAL '7 days'
                WHEN v_severity = 'severe' THEN INTERVAL '15 days'
                WHEN v_severity = 'moderate' THEN INTERVAL '30 days'
                WHEN v_severity = 'minor' THEN INTERVAL '45 days'
                ELSE INTERVAL '30 days'
            END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_violation_due_date ON traffic_violations;

CREATE TRIGGER trigger_set_violation_due_date
    BEFORE INSERT OR UPDATE ON traffic_violations
    FOR EACH ROW
    EXECUTE FUNCTION set_violation_due_date();

-- =====================================================
-- Create enhanced violation view with due date info
-- =====================================================

CREATE OR REPLACE VIEW violation_details_enhanced AS
SELECT 
  tv.id,
  tv.violation_number,
  tv.violation_name_en,
  tv.violation_name_bn,
  tv.fine_amount,
  tv.additional_charges,
  tv.total_amount,
  tv.location,
  tv.location_bn,
  tv.violation_date,
  tv.due_date,
  tv.payment_status,
  tv.status,
  tv.description,
  tv.notes,
  tv.photo_evidence_url,
  tv.video_evidence_url,
  -- Violation type info
  vt.severity as violation_severity,
  vt.code as violation_code,
  -- Calculate days until/past due
  (tv.due_date - CURRENT_DATE) as days_until_due,
  CASE 
    WHEN tv.payment_status = 'paid' THEN 'paid'
    WHEN tv.due_date < CURRENT_DATE AND tv.payment_status = 'unpaid' THEN 'overdue'
    WHEN (tv.due_date - CURRENT_DATE) <= 3 AND tv.payment_status = 'unpaid' THEN 'due_soon'
    ELSE 'pending'
  END as urgency_status,
  -- Vehicle Info
  rv.registration_number,
  rv.registration_plate,
  rv.vehicle_name,
  rv.model,
  rv.engine_number,
  rv.owner_name_en,
  rv.owner_name_bn,
  -- User Info
  tv.user_id,
  p.full_name as user_full_name,
  p.phone as user_phone,
  p.email as user_email,
  -- Police Info
  tv.police_name,
  tv.police_badge_number,
  pp.full_name as police_full_name,
  -- Payment info
  tv.payment_id,
  tv.paid_at,
  -- Timestamps
  tv.created_at,
  tv.updated_at
FROM traffic_violations tv
LEFT JOIN registered_vehicles rv ON tv.registered_vehicle_id = rv.id
LEFT JOIN profiles p ON tv.user_id = p.id
LEFT JOIN profiles pp ON tv.police_user_id = pp.id
LEFT JOIN violation_types vt ON tv.violation_type_id = vt.id;

-- =====================================================
-- Daily Cron Job Setup (Optional - requires pg_cron)
-- =====================================================

-- To run automatically every day at midnight:
-- SELECT cron.schedule(
--     'update-overdue-violations-daily',
--     '0 0 * * *',
--     'SELECT update_overdue_violations()'
-- );

-- For manual execution:
-- SELECT update_overdue_violations();

-- =====================================================
-- Sample Query Examples
-- =====================================================

-- Get all overdue violations
-- SELECT * FROM violation_details_enhanced 
-- WHERE urgency_status = 'overdue' 
-- ORDER BY due_date;

-- Get violations due soon (within 3 days)
-- SELECT * FROM violation_details_enhanced 
-- WHERE urgency_status = 'due_soon' 
-- ORDER BY due_date;

-- Get user's pending violations with due dates
-- SELECT 
--   violation_number,
--   violation_name_en,
--   total_amount,
--   due_date,
--   days_until_due,
--   urgency_status
-- FROM violation_details_enhanced 
-- WHERE user_id = 'user-uuid-here' 
-- AND payment_status != 'paid'
-- ORDER BY due_date;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
DECLARE
    overdue_count INTEGER;
BEGIN
    -- Check for overdue violations
    SELECT update_overdue_violations() INTO overdue_count;
    
    RAISE NOTICE '✅ Due Date System Added Successfully!';
    RAISE NOTICE '📅 due_date column: Added';
    RAISE NOTICE '⚡ Auto-due date triggers: Created (based on severity)';
    RAISE NOTICE '📊 Enhanced view: violation_details_enhanced created';
    RAISE NOTICE '📋 Found % overdue violations', overdue_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 System Ready - Due Dates by Severity:';
    RAISE NOTICE '   - Critical violations: 7 days';
    RAISE NOTICE '   - Severe violations: 15 days';
    RAISE NOTICE '   - Moderate violations: 30 days';
    RAISE NOTICE '   - Minor violations: 45 days';
    RAISE NOTICE '';
    RAISE NOTICE '   - View: violation_details_enhanced for complete info';
END $$;
