import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const redditClientId = Deno.env.get('REDDIT_CLIENT_ID');
    const redditClientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
    
    console.log('🔧 Testing Reddit API connectivity...');
    
    // Test 1: API Credentials Validation
    const testsResult = {
      credentialsPresent: !!(redditClientId && redditClientSecret),
      authenticationWorks: false,
      subredditAccess: false,
      searchFunctionality: false,
      connectionStatus: 'failed'
    };

    if (!redditClientId || !redditClientSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Reddit API credentials are not set. Please configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in Supabase secrets.',
          tests: testsResult,
          recommendations: [
            'Set REDDIT_CLIENT_ID in Supabase Edge Function secrets',
            'Set REDDIT_CLIENT_SECRET in Supabase Edge Function secrets',
            'Get credentials from https://www.reddit.com/prefs/apps'
          ]
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Reddit credentials present');

    // Test 2: Authentication - Get Access Token
    const auth = btoa(`${redditClientId}:${redditClientSecret}`);
    
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FounderLens/1.0 by automated-bot'
      },
      body: 'grant_type=client_credentials'
    });

    testsResult.authenticationWorks = authResponse.ok;
    testsResult.connectionStatus = authResponse.ok ? 'connected' : 'failed';

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Reddit authentication failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Reddit authentication failed: ${authResponse.status} - ${authResponse.statusText}`,
          errorDetail: errorText,
          tests: testsResult,
          recommendations: [
            'Verify Reddit API credentials are correct',
            'Ensure Reddit app has proper permissions',
            'Check if Reddit app is not suspended',
            'Visit https://www.reddit.com/prefs/apps to verify app status'
          ]
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('✅ Reddit authentication successful');

    // Test 3: Subreddit Access - Test key subreddits
    const testSubreddits = ['startups', 'entrepreneur', 'business'];
    const accessibleSubreddits = [];
    
    for (const subreddit of testSubreddits) {
      try {
        const subredditResponse = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'FounderLens/1.0 by automated-bot'
          }
        });

        if (subredditResponse.ok) {
          accessibleSubreddits.push(subreddit);
        }
      } catch (error) {
        console.warn(`⚠️ Could not access r/${subreddit}:`, error);
      }
    }

    testsResult.subredditAccess = accessibleSubreddits.length > 0;
    console.log(`✅ Accessible subreddits: ${accessibleSubreddits.join(', ')}`);

    // Test 4: Search Functionality
    let searchResults = 0;
    try {
      const searchResponse = await fetch('https://oauth.reddit.com/r/startups/search?q=business%20problem&sort=relevance&t=week&limit=5&restrict_sr=true', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'FounderLens/1.0 by automated-bot'
        }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        searchResults = searchData.data?.children?.length || 0;
        testsResult.searchFunctionality = searchResults > 0;
        console.log(`✅ Search test returned ${searchResults} results`);
      }
    } catch (error) {
      console.warn('⚠️ Search functionality test failed:', error);
    }

    // Test 5: Rate Limiting Check
    const rateLimitStatus = authResponse.headers.get('x-ratelimit-remaining');
    const rateLimitReset = authResponse.headers.get('x-ratelimit-reset');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Reddit API connectivity test completed',
        tests: testsResult,
        subredditAccess: {
          accessible: accessibleSubreddits,
          searchResults: searchResults
        },
        rateLimiting: {
          remaining: rateLimitStatus,
          resetTime: rateLimitReset
        },
        costComparison: {
          reddit: 'FREE (Rate limited)',
          browseAi: '670 credits (~$33-67 per validation)'
        },
        recommendations: generateRecommendations(testsResult, accessibleSubreddits.length, searchResults)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reddit API test failed:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorDetail: error.stack,
        errorType: error.constructor.name,
        tests: {
          credentialsPresent: !!(Deno.env.get('REDDIT_CLIENT_ID') && Deno.env.get('REDDIT_CLIENT_SECRET')),
          authenticationWorks: false,
          subredditAccess: false,
          searchFunctionality: false,
          connectionStatus: 'error'
        },
        recommendations: [
          'Check the function logs for detailed error information',
          'Verify Reddit API credentials are correctly set in Supabase secrets',
          'Ensure Reddit app has proper permissions and is not suspended',
          'Contact support if the error persists'
        ]
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateRecommendations(tests: any, subredditCount: number, searchResults: number) {
  const recommendations = [];
  
  if (!tests.authenticationWorks) {
    recommendations.push('Fix Reddit authentication - verify API credentials are correct');
  }
  
  if (!tests.subredditAccess || subredditCount === 0) {
    recommendations.push('Cannot access target subreddits - check app permissions');
  }
  
  if (!tests.searchFunctionality || searchResults === 0) {
    recommendations.push('Search functionality not working - verify API access scope');
  }
  
  if (tests.authenticationWorks && tests.subredditAccess && tests.searchFunctionality) {
    recommendations.push('All tests passed! Reddit integration ready for cost-effective market validation');
    recommendations.push('Reddit API provides FREE validation vs Browse.ai\'s 670 credit cost');
  }
  
  recommendations.push('Visit https://www.reddit.com/prefs/apps to manage your Reddit application');
  
  return recommendations;
}

console.log("Listening on http://localhost:9999/");