import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountRequest {
  confirmation: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Delete account function called');
    
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

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { confirmation }: DeleteAccountRequest = requestBody;
    
    // Verify confirmation
    if (confirmation !== 'DELETE') {
      console.log('Invalid confirmation received:', confirmation);
      throw new Error('Invalid confirmation');
    }

    console.log(`Starting account deletion for user: ${user.id}`);

    try {
      // Get user's opportunity IDs first
      const { data: userOpportunities } = await supabaseClient
        .from('business_opportunities')
        .select('id')
        .eq('user_id', user.id);
      
      const opportunityIds = userOpportunities?.map(op => op.id) || [];

      // 1. Delete validation tasks (references business_opportunities)
      if (opportunityIds.length > 0) {
        await supabaseClient
          .from('validation_tasks')
          .delete()
          .in('opportunity_id', opportunityIds);
      }

      // 2. Delete validation workflows (references business_opportunities)
      if (opportunityIds.length > 0) {
        await supabaseClient
          .from('validation_workflows')
          .delete()
          .in('opportunity_id', opportunityIds);
      }

      // 3. Delete automated market intelligence (references business_opportunities)
      if (opportunityIds.length > 0) {
        await supabaseClient
          .from('automated_market_intelligence')
          .delete()
          .in('opportunity_id', opportunityIds);
      }

      // 4. Delete business opportunities
      await supabaseClient
        .from('business_opportunities')
        .delete()
        .eq('user_id', user.id);

      // 5. Delete workspace activities
      await supabaseClient
        .from('workspace_activities')
        .delete()
        .eq('user_id', user.id);

      // 6. Delete usage tracking
      await supabaseClient
        .from('usage_tracking')
        .delete()
        .eq('user_id', user.id);

      // 7. Delete organization members
      await supabaseClient
        .from('organization_members')
        .delete()
        .eq('user_id', user.id);

      // 8. Handle organizations owned by user
      const { data: ownedOrgs } = await supabaseClient
        .from('organizations')
        .select('id, slug')
        .eq('owner_id', user.id);

      if (ownedOrgs && ownedOrgs.length > 0) {
        for (const org of ownedOrgs) {
          // Delete user_goals that reference this organization
          await supabaseClient
            .from('user_goals')
            .delete()
            .eq('organization_id', org.id);

          // Delete user_skills that reference this organization  
          await supabaseClient
            .from('user_skills')
            .delete()
            .eq('organization_id', org.id);

          // Delete user_experiences that reference this organization
          await supabaseClient
            .from('user_experiences')
            .delete()
            .eq('organization_id', org.id);

          // Delete data_integration_preferences that reference this organization
          await supabaseClient
            .from('data_integration_preferences')
            .delete()
            .eq('organization_id', org.id);

          // Delete the organization
          await supabaseClient
            .from('organizations')
            .delete()
            .eq('id', org.id);
        }
      }

      // 9. Delete subscriptions
      await supabaseClient
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id);

      // 10. Delete user experiences
      await supabaseClient
        .from('user_experiences')
        .delete()
        .eq('user_id', user.id);

      // 11. Delete user goals
      await supabaseClient
        .from('user_goals')
        .delete()
        .eq('user_id', user.id);

      // 12. Delete user skills
      await supabaseClient
        .from('user_skills')
        .delete()
        .eq('user_id', user.id);

      // 13. Delete data integration preferences
      await supabaseClient
        .from('data_integration_preferences')
        .delete()
        .eq('user_id', user.id);

      // 14. Delete security events (references user_id)
      await supabaseClient
        .from('security_events')
        .delete()
        .eq('user_id', user.id);

      // 15. Delete admin audit log entries (both as admin and target)
      await supabaseClient
        .from('admin_audit_log')
        .delete()
        .eq('admin_user_id', user.id);
        
      await supabaseClient
        .from('admin_audit_log')
        .delete()
        .eq('target_user_id', user.id);

      // 16. Delete subscription cache
      await supabaseClient
        .from('subscription_cache')
        .delete()
        .eq('user_id', user.id);

      // 16. Delete user profile
      await supabaseClient
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // 17. Finally, delete the user from auth
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Error deleting user from auth:', deleteError);
        throw new Error('Failed to delete user account');
      }

      console.log(`Account deletion completed for user: ${user.id}`);

      return new Response(
        JSON.stringify({ message: 'Account deleted successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (deleteError: any) {
      console.error('Error during deletion process:', deleteError);
      throw new Error(`Failed to delete user data: ${deleteError.message}`);
    }

  } catch (error: any) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
