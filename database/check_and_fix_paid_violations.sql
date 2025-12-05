-- Check violations and their payment status

-- 1. See all violations with their payment info
SELECT 
  tv.id,
  tv.violation_number,
  tv.violation_name_en,
  tv.total_amount,
  tv.payment_status,
  tv.payment_id,
  p.id as found_payment_id,
  p.status as actual_payment_status,
  p.tran_id,
  p.sslcommerz_tran_date
FROM traffic_violations tv
LEFT JOIN payments p ON tv.payment_id = p.id
ORDER BY tv.created_at DESC;

-- 2. Find payments that match violations by tran_id pattern
SELECT 
  tv.violation_number,
  tv.payment_id as current_payment_id,
  p.id as matching_payment_id,
  p.tran_id,
  p.status,
  p.amount
FROM traffic_violations tv
LEFT JOIN payments p ON p.tran_id LIKE 'FINE-' || tv.violation_number || '-%'
WHERE tv.payment_id IS NULL
ORDER BY tv.created_at DESC;

-- 3. Update violations to link them with their payments (by tran_id pattern match)
UPDATE traffic_violations tv
SET payment_id = p.id
FROM payments p
WHERE p.tran_id LIKE 'FINE-' || tv.violation_number || '-%'
  AND tv.payment_id IS NULL
  AND p.payment_type = 'violation_fine'
RETURNING tv.violation_number, tv.payment_id, p.tran_id;

-- 4. Update violations where payment is successful but violation still shows unpaid
UPDATE traffic_violations tv
SET 
  payment_status = 'paid',
  paid_at = p.sslcommerz_tran_date
FROM payments p
WHERE tv.payment_id = p.id
  AND p.status = 'success'
  AND tv.payment_status = 'unpaid'
RETURNING tv.violation_number, tv.payment_status, p.status as payment_status_actual;
