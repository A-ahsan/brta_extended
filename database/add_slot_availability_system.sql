-- Slot Availability System for Physical Exam Bookings
-- Adds functions to check capacity and availability

-- Function: Get booking count for a specific center and date
CREATE OR REPLACE FUNCTION get_booking_count(
  p_center_id UUID,
  p_date DATE
)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO booking_count
  FROM physical_exam_bookings
  WHERE test_center_id = p_center_id
    AND exam_date = p_date
    AND status = 'scheduled';
  
  RETURN booking_count;
END;
$$;

-- Function: Get available slots for a specific center and date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_center_id UUID,
  p_date DATE
)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_capacity INTEGER;
  booking_count INTEGER;
  available_slots INTEGER;
BEGIN
  -- Get center capacity
  SELECT test_centers.daily_capacity INTO daily_capacity
  FROM test_centers
  WHERE id = p_center_id;
  
  -- Get current booking count
  SELECT COUNT(*) INTO booking_count
  FROM physical_exam_bookings
  WHERE test_center_id = p_center_id
    AND exam_date = p_date
    AND status = 'scheduled';
  
  -- Calculate available slots
  available_slots := daily_capacity - booking_count;
  
  -- Return 0 if negative (shouldn't happen but safety check)
  IF available_slots < 0 THEN
    RETURN 0;
  END IF;
  
  RETURN available_slots;
END;
$$;

-- Function: Check if a center has availability on a date
CREATE OR REPLACE FUNCTION has_availability(
  p_center_id UUID,
  p_date DATE
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_slots INTEGER;
BEGIN
  available_slots := get_available_slots(p_center_id, p_date);
  RETURN available_slots > 0;
END;
$$;

-- Function: Get slot availability info (returns JSON object)
CREATE OR REPLACE FUNCTION get_slot_info(
  p_center_id UUID,
  p_date DATE
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_capacity INTEGER;
  booked INTEGER;
  available INTEGER;
  rush_level TEXT;
  is_full BOOLEAN;
BEGIN
  SELECT test_centers.daily_capacity INTO daily_capacity
  FROM test_centers
  WHERE id = p_center_id;
  
  booked := get_booking_count(p_center_id, p_date);
  available := get_available_slots(p_center_id, p_date);
  rush_level := get_center_rush_level(p_center_id, p_date);
  is_full := (available = 0);
  
  RETURN json_build_object(
    'total_capacity', daily_capacity,
    'booked', booked,
    'available', available,
    'rush_level', rush_level,
    'is_full', is_full,
    'percentage_filled', ROUND((booked::DECIMAL / daily_capacity) * 100, 2)
  );
END;
$$;

-- Updated View: Test Centers with Rush Level (now includes availability info)
DROP VIEW IF EXISTS test_centers_with_rush;
CREATE OR REPLACE VIEW test_centers_with_rush AS
SELECT 
  tc.*,
  get_center_overall_rush(tc.id) as rush_level,
  (
    SELECT COUNT(*)
    FROM physical_exam_bookings
    WHERE test_center_id = tc.id
      AND exam_date >= CURRENT_DATE
      AND status = 'scheduled'
  ) as upcoming_bookings
FROM test_centers tc
WHERE tc.is_active = true;

-- Add check constraint to prevent overbooking
-- First, create a function to validate booking doesn't exceed capacity
CREATE OR REPLACE FUNCTION check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_bookings INTEGER;
  center_capacity INTEGER;
BEGIN
  -- Only check for scheduled status
  IF NEW.status = 'scheduled' THEN
    -- Get current bookings for this center and date (excluding current row if update)
    SELECT COUNT(*) INTO current_bookings
    FROM physical_exam_bookings
    WHERE test_center_id = NEW.test_center_id
      AND exam_date = NEW.exam_date
      AND status = 'scheduled'
      AND id != COALESCE(NEW.id, gen_random_uuid()); -- Exclude self on update
    
    -- Get center capacity
    SELECT daily_capacity INTO center_capacity
    FROM test_centers
    WHERE id = NEW.test_center_id;
    
    -- Check if adding this booking would exceed capacity
    IF current_bookings >= center_capacity THEN
      RAISE EXCEPTION 'This test center is fully booked for %. Please choose another date or center.', NEW.exam_date
        USING HINT = 'Check available slots before booking';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce capacity limit
DROP TRIGGER IF EXISTS enforce_booking_capacity ON physical_exam_bookings;
CREATE TRIGGER enforce_booking_capacity
  BEFORE INSERT OR UPDATE ON physical_exam_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_capacity();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_booking_count(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION has_availability(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_slot_info(UUID, DATE) TO authenticated;

COMMENT ON FUNCTION get_booking_count IS 'Returns the number of scheduled bookings for a center on a specific date';
COMMENT ON FUNCTION get_available_slots IS 'Returns the number of available slots remaining for a center on a specific date';
COMMENT ON FUNCTION has_availability IS 'Checks if a center has at least one slot available on a specific date';
COMMENT ON FUNCTION get_slot_info IS 'Returns detailed slot availability information as JSON';
COMMENT ON FUNCTION check_booking_capacity IS 'Trigger function to prevent overbooking by enforcing capacity limits';
