-- Clean up any test subscription data that may be causing conflicts
DELETE FROM public.subscriptions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ngtebeje@gmail.com'
) AND stripe_customer_id IS NULL;

-- Also clean subscription cache to force refresh
DELETE FROM public.subscription_cache 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ngtebeje@gmail.com'
);