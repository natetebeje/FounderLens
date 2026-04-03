-- Clean up duplicate feature gates that are causing issues
-- First, remove ALL duplicate feature gates entries
DELETE FROM feature_gates WHERE id NOT IN (
  SELECT DISTINCT ON (feature_name, plan_tier) id
  FROM feature_gates
  ORDER BY feature_name, plan_tier, created_at ASC
);

-- Now test the check function for the specific user
SELECT 
  u.id as user_id,
  s.plan_tier,
  fg.limit_value,
  public.get_real_usage_count('ddb9de7f-3c36-481b-b724-c047be6a7615', 'opportunities') as current_usage,
  public.check_feature_limit(
    '8113c128-4016-4c89-a06d-a1742e439ee2',
    'ddb9de7f-3c36-481b-b724-c047be6a7615', 
    'opportunities'
  ) as can_generate
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN feature_gates fg ON fg.plan_tier = COALESCE(s.plan_tier, 'free') AND fg.feature_name = 'opportunities'
WHERE u.id = '8113c128-4016-4c89-a06d-a1742e439ee2';