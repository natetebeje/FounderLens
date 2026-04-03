import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Clean user data function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Supabase client created');

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header found');
      throw new Error('No authorization header');
    }

    console.log('Auth header found');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    console.log('User lookup result:', { userExists: !!user, userError });

    if (userError || !user) {
      console.log('Invalid authentication:', userError);
      throw new Error('Invalid authentication');
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.log('Access denied - user is not admin');
      throw new Error('Access denied. Admin privileges required.');
    }

    console.log('Admin privileges verified, proceeding with cleanup...');

    // Call the cleanup function
    const { data: result, error: cleanupError } = await supabaseClient
      .rpc('clean_all_user_data');

    if (cleanupError) {
      console.error('Cleanup function error:', cleanupError);
      throw new Error(`Cleanup failed: ${cleanupError.message}`);
    }

    console.log('Cleanup completed successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All user data cleaned successfully',
        result: result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in clean-user-data function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);