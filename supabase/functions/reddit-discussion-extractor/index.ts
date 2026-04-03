import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  created_utc: number;
  permalink: string;
}

interface RedditComment {
  author: string;
  body: string;
  score: number;
  created_utc: number;
}

async function getRedditAccessToken(): Promise<string> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Reddit API credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'FounderLens/1.0.0'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Reddit access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function searchRedditWithDetails(
  accessToken: string, 
  query: string, 
  subreddit?: string, 
  limit: number = 25,
  sort: string = 'relevance',
  timeframe: string = 'month',
  after?: string
): Promise<RedditPost[]> {
  const searchUrl = subreddit 
    ? `https://oauth.reddit.com/r/${subreddit}/search`
    : 'https://oauth.reddit.com/search';
  
  const params = new URLSearchParams({
    q: query,
    sort,
    t: timeframe,
    limit: limit.toString(),
    ...(subreddit && { restrict_sr: 'true' }),
    ...(after && { after })
  });

  const fullUrl = `${searchUrl}?${params}`;
  console.log(`🔍 Reddit API call: ${fullUrl}`);

  const response = await fetch(fullUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'FounderLens/1.0.0'
    }
  });

  console.log(`📡 Reddit API response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Reddit search failed: ${response.status} ${response.statusText}`);
    console.error(`❌ Error details: ${errorText}`);
    return [];
  }

  const data = await response.json();
  const posts = data.data?.children?.map((child: any) => child.data) || [];
  console.log(`🎯 Extracted ${posts.length} posts from Reddit API response`);
  
  return posts;
}

async function getPostComments(
  accessToken: string, 
  subreddit: string, 
  postId: string
): Promise<RedditComment[]> {
  try {
    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/comments/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'FounderLens/1.0.0'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch comments: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const commentsData = data[1]?.data?.children || [];
    
    return commentsData
      .filter((child: any) => child.data.body && child.data.body !== '[deleted]')
      .slice(0, 20) // Increased to top 20 comments
      .map((child: any) => ({
        author: child.data.author,
        body: child.data.body,
        score: child.data.score,
        created_utc: child.data.created_utc
      }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

// GigaBrain's business domain intelligence
function calculateBusinessDomainRelevance(text: string, businessDomain: string): number {
  const domainMaps = {
    'b2b': {
      keywords: ['business', 'enterprise', 'company', 'organization', 'corporate', 'saas', 'software', 'platform', 'service', 'solution', 'client', 'customer', 'revenue', 'sales', 'marketing', 'automation'],
      excludePersonal: true
    },
    'consumer': {
      keywords: ['user', 'personal', 'individual', 'people', 'family', 'home', 'lifestyle', 'hobby', 'entertainment', 'app', 'mobile'],
      excludePersonal: false
    },
    'ai': {
      keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'automation', 'algorithm', 'data', 'analytics', 'prediction', 'classification', 'neural', 'model'],
      excludePersonal: false
    },
    'ecommerce': {
      keywords: ['store', 'shop', 'sell', 'buy', 'product', 'inventory', 'payment', 'checkout', 'conversion', 'sales', 'shopify', 'amazon', 'retail'],
      excludePersonal: false
    }
  };

  const domain = domainMaps[businessDomain.toLowerCase()] || domainMaps['b2b'];
  const matches = domain.keywords.filter(keyword => text.includes(keyword));
  
  // Penalty for personal/relationship content in B2B context
  if (domain.excludePersonal) {
    const personalPatterns = [/my wife/i, /my husband/i, /relationship/i, /personal story/i, /family/i];
    if (personalPatterns.some(pattern => pattern.test(text))) {
      return 0.1; // Heavy penalty
    }
  }
  
  return Math.min(matches.length / 3, 1.0);
}

// GigaBrain's intent recognition
function calculateIntentRelevance(text: string): number {
  const businessIntents = {
    problemSolving: ['problem', 'issue', 'challenge', 'struggle', 'difficulty', 'pain point', 'frustration'],
    solutionSeeking: ['solution', 'tool', 'software', 'platform', 'service', 'help', 'recommend', 'suggest', 'advice'],
    marketValidation: ['feedback', 'thoughts', 'opinions', 'experience', 'review', 'comparison', 'worth it', 'better than'],
    businessDiscussion: ['startup', 'business', 'revenue', 'customers', 'market', 'competitive', 'industry']
  };
  
  let totalScore = 0;
  Object.values(businessIntents).forEach(intents => {
    const matches = intents.filter(intent => text.includes(intent));
    totalScore += Math.min(matches.length / 2, 0.25);
  });
  
  return Math.min(totalScore, 1.0);
}

// GigaBrain's semantic understanding
function calculateSemanticRelevance(text: string, targetTopic: string): number {
  // Extract key terms from target topic
  const topicTerms = targetTopic.toLowerCase().split(/\s+/).filter(term => term.length > 3);
  const matches = topicTerms.filter(term => text.includes(term));
  
  // Higher score for exact phrase matches
  const exactPhraseBonus = text.includes(targetTopic.toLowerCase()) ? 0.3 : 0;
  
  return Math.min((matches.length / topicTerms.length) + exactPhraseBonus, 1.0);
}

// GigaBrain's community authority scoring
function calculateCommunityAuthority(post: RedditPost): number {
  const subreddit = post.subreddit?.toLowerCase() || '';
  
  const authorityMap = {
    high: ['startups', 'entrepreneur', 'business', 'smallbusiness', 'artificial', 'machinelearning', 'saas', 'technology'],
    medium: ['askreddit', 'productivity', 'webdev', 'programming', 'marketing', 'analytics'],
    low: ['funny', 'memes', 'pics', 'gaming', 'relationships', 'cooking']
  };
  
  if (authorityMap.high.some(sub => subreddit.includes(sub))) return 1.0;
  if (authorityMap.medium.some(sub => subreddit.includes(sub))) return 0.6;
  if (authorityMap.low.some(sub => subreddit.includes(sub))) return 0.2;
  
  return 0.4; // Default for unknown subreddits
}

// GigaBrain-inspired multi-dimensional relevance analysis with domain intelligence
function analyzePostRelevance(post: RedditPost, keywords: string[], targetTopic: string, businessDomain: string): number {
  const title = post.title.toLowerCase();
  const content = (post.selftext || '').toLowerCase();
  const combinedText = `${title} ${content}`;
  
  console.log(`   🔍 GIGABRAIN: Analyzing "${post.title.substring(0, 60)}..." for domain: ${businessDomain}`);
  
  // Multi-dimensional scoring like GigaBrain
  const businessRelevance = calculateBusinessDomainRelevance(combinedText, businessDomain);
  const intentSignals = calculateIntentRelevance(combinedText);
  const semanticSimilarity = calculateSemanticRelevance(combinedText, targetTopic);
  const communityAuthority = calculateCommunityAuthority(post);
  
  // Weighted combination (GigaBrain's approach)
  const totalScore = (businessRelevance * 0.4) + (intentSignals * 0.3) + (semanticSimilarity * 0.2) + (communityAuthority * 0.1);
  
  console.log(`   🎯 GIGABRAIN: Domain=${businessRelevance.toFixed(2)}, Intent=${intentSignals.toFixed(2)}, Semantic=${semanticSimilarity.toFixed(2)}, Authority=${communityAuthority.toFixed(2)} → Total=${totalScore.toFixed(2)}`);
  
  return totalScore;
}

// Enhanced keyword generation from multiple opportunity fields
function generateMarketContextKeywords(
  title: string, 
  description: string, 
  targetMarket: string,
  problemStatement?: string,
  solutionApproach?: string,
  tags?: string[]
): string[] {
  // Extract keywords from all available fields
  const allText = [title, description, targetMarket, problemStatement, solutionApproach].filter(Boolean).join(' ');
  const allWords = allText.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  
  // Add tags if available
  const tagWords = tags ? tags.flatMap(tag => tag.split(/\s+/)).filter(word => word.length > 3) : [];
  
  // Combine and deduplicate
  const combinedWords = [...new Set([...allWords, ...tagWords])];
  
  // Prioritize by frequency and relevance
  const wordCounts = {};
  combinedWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Sort by frequency and take top 6
  const prioritizedKeywords = Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6)
    .map(([word]) => word);
  
  return prioritizedKeywords;
}

// Classify business type from opportunity details
function classifyBusinessType(title: string, description: string, targetMarket: string): string {
  const combined = `${title} ${description} ${targetMarket}`.toLowerCase();
  
  if (combined.includes('ai') || combined.includes('machine learning') || combined.includes('automation')) {
    return 'ai_service';
  }
  if (combined.includes('store') || combined.includes('shop') || combined.includes('sell') || combined.includes('ecommerce')) {
    return 'ecommerce';
  }
  if (combined.includes('app') && (combined.includes('mobile') || combined.includes('personal') || combined.includes('consumer'))) {
    return 'consumer_app';
  }
  
  return 'b2b_saas'; // Default
}

// Enhanced subreddit selection with domain-specific lists
function selectOptimalSubreddits(businessType: string, targetMarket: string, title: string, tags: string[] = []): string[] {
  const subredditStrategy = {
    'b2b_saas': ['startups', 'entrepreneur', 'smallbusiness', 'saas', 'business'],
    'consumer_app': ['apps', 'androidapps', 'iosapps', 'productivity', 'lifestyle'],
    'ai_service': ['artificial', 'MachineLearning', 'startups', 'technology', 'programming'],
    'ecommerce': ['ecommerce', 'entrepreneur', 'shopify', 'business', 'smallbusiness']
  };
  
  const baseSubreddits = subredditStrategy[businessType] || subredditStrategy['b2b_saas'];
  
  // Domain-specific subreddit mapping
  const domainMaps = {
    lottery: ['lottery', 'gambling', 'statistics', 'datascience', 'math'],
    gambling: ['gambling', 'casino', 'statistics', 'probability'],
    data: ['datascience', 'analytics', 'statistics', 'MachineLearning'],
    finance: ['personalfinance', 'investing', 'financialindependence'],
    health: ['health', 'fitness', 'nutrition', 'medicine'],
    education: ['education', 'teachers', 'students', 'university'],
    marketing: ['marketing', 'digitalmarketing', 'advertising'],
    productivity: ['productivity', 'getmotivated', 'organization'],
    technology: ['technology', 'programming', 'webdev', 'artificial']
  };
  
  // Extract domain keywords from title and tags
  const allKeywords = [title.toLowerCase(), ...tags.map(t => t.toLowerCase())].join(' ');
  const domainSubreddits = [];
  
  Object.entries(domainMaps).forEach(([domain, subreddits]) => {
    if (allKeywords.includes(domain)) {
      domainSubreddits.push(...subreddits.slice(0, 3));
    }
  });
  
  // Add market-specific subreddits
  const marketSpecific = [];
  const market = targetMarket.toLowerCase();
  
  if (market.includes('marketing')) marketSpecific.push('marketing', 'digitalmarketing');
  if (market.includes('finance')) marketSpecific.push('personalfinance', 'investing');
  if (market.includes('health')) marketSpecific.push('health', 'fitness');
  if (market.includes('education')) marketSpecific.push('education', 'teachers');
  
  // Combine and deduplicate, limiting to 8 total
  const allSubreddits = [...baseSubreddits, ...domainSubreddits, ...marketSpecific];
  return [...new Set(allSubreddits)].slice(0, 8);
}

function extractPainPoints(post: RedditPost, comments: RedditComment[]): string[] {
  const allText = `${post.title} ${post.selftext} ${comments.map(c => c.body).join(' ')}`;
  const painPoints: string[] = [];
  
  // Pain point patterns
  const patterns = [
    /(?:problem|issue|challenge|difficulty|frustrat\w+|pain\w*|struggle\w*|annoying|terrible|awful|hate\w*|worst)\s+(?:with|is|was|are|when)\s+([^.!?]{20,80})/gi,
    /(?:can't|cannot|unable to|impossible to|difficult to|hard to|struggle to)\s+([^.!?]{15,60})/gi,
    /(?:need|want|wish|should|would like to|looking for)\s+(?:a|an|some|better|more)\s+([^.!?]{15,60})/gi,
    /(?:why (?:is|are|do|does|don't|doesn't)|how (?:can|do|to))\s+([^.!?]{15,60})/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = allText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/\s+/g, ' ').trim();
        if (cleaned.length > 20 && cleaned.length < 100) {
          painPoints.push(cleaned);
        }
      });
    }
  });
  
  return [...new Set(painPoints)].slice(0, 5);
}

function extractSolutions(post: RedditPost, comments: RedditComment[]): string[] {
  const allText = `${post.title} ${post.selftext} ${comments.map(c => c.body).join(' ')}`;
  const solutions: string[] = [];
  
  // Solution patterns
  const patterns = [
    /(?:solution|fix|resolve|solve|answer|use|try|recommend|suggest)\s+([^.!?]{15,80})/gi,
    /(?:you (?:can|should|could|might)|try to|consider|check out|look into)\s+([^.!?]{15,60})/gi,
    /(?:works well|good option|great tool|helpful|useful|effective)\s+(?:is|are|for)?\s*([^.!?]{10,50})/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = allText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/\s+/g, ' ').trim();
        if (cleaned.length > 15 && cleaned.length < 80) {
          solutions.push(cleaned);
        }
      });
    }
  });
  
  return [...new Set(solutions)].slice(0, 5);
}

// Enhanced Reddit data extraction with comprehensive search strategies
async function searchAcrossStrategies(
  accessToken: string,
  keywords: string[],
  subreddits: string[],
  includeGlobal: boolean = false,
  perPage: number = 25
): Promise<{ posts: RedditPost[], diagnostics: any }> {
  const allPosts: RedditPost[] = [];
  const diagnostics = {
    strategiesTried: 0,
    searchAttempts: 0,
    postsFetched: 0,
    uniqueBeforeFilter: 0,
    subredditsSearched: subreddits.slice(0, 8),
    keywordsUsed: keywords.slice(0, 6),
    sorts: ['relevance', 'top', 'new'],
    timeframes: ['month', 'year', 'all'],
    errors: []
  };

  const sorts = ['relevance', 'top', 'new'];
  const timeframes = ['month', 'year', 'all'];
  
  console.log(`🧠 Enhanced search: ${subreddits.length} subreddits × ${keywords.length} keywords × ${sorts.length} sorts × ${timeframes.length} timeframes`);
  
  // Strategy 1: Subreddit-targeted searches
  for (const subreddit of subreddits.slice(0, 8)) {
    for (const keyword of keywords.slice(0, 6)) {
      for (const sort of sorts) {
        for (const timeframe of timeframes) {
          try {
            diagnostics.strategiesTried++;
            diagnostics.searchAttempts++;
            
            console.log(`🔍 Strategy ${diagnostics.strategiesTried}: r/${subreddit} + "${keyword}" + ${sort}/${timeframe}`);
            
            // First page
            const posts1 = await searchRedditWithDetails(accessToken, keyword, subreddit, perPage, sort, timeframe);
            allPosts.push(...posts1);
            diagnostics.postsFetched += posts1.length;
            
            // Second page if first page had results
            if (posts1.length > 0 && posts1.length === perPage) {
              const lastPost = posts1[posts1.length - 1];
              const posts2 = await searchRedditWithDetails(accessToken, keyword, subreddit, perPage, sort, timeframe, lastPost.id);
              allPosts.push(...posts2);
              diagnostics.postsFetched += posts2.length;
            }
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error(`Error in strategy ${diagnostics.strategiesTried}:`, error);
            diagnostics.errors.push({ strategy: diagnostics.strategiesTried, error: error.message });
          }
        }
      }
    }
  }

  // Strategy 2: Global site-wide searches (optional, for deep scan)
  if (includeGlobal) {
    for (const keyword of keywords.slice(0, 3)) {
      for (const sort of sorts.slice(0, 2)) { // Limit global searches
        try {
          diagnostics.strategiesTried++;
          diagnostics.searchAttempts++;
          
          console.log(`🌍 Global strategy ${diagnostics.strategiesTried}: "${keyword}" + ${sort}`);
          
          const posts = await searchRedditWithDetails(accessToken, keyword, undefined, perPage, sort, 'month');
          allPosts.push(...posts);
          diagnostics.postsFetched += posts.length;
          
          await new Promise(resolve => setTimeout(resolve, 250));
          
        } catch (error) {
          console.error(`Error in global strategy:`, error);
          diagnostics.errors.push({ strategy: diagnostics.strategiesTried, error: error.message });
        }
      }
    }
  }

  // Remove duplicates
  const uniquePosts = allPosts.filter((post, index, self) => 
    index === self.findIndex(p => p.id === post.id)
  );

  diagnostics.uniqueBeforeFilter = uniquePosts.length;
  console.log(`📊 Enhanced search complete: ${diagnostics.postsFetched} total → ${uniquePosts.length} unique posts`);

  return { posts: uniquePosts, diagnostics };
}

// Enhanced Reddit discussion extraction with adaptive threshold and diagnostics
async function extractRedditDiscussions(
  accessToken: string,
  opportunityId: string,
  organizationId: string | undefined,
  subreddits: string[],
  keywords: string[],
  limit: number,
  targetTopic: string = '',
  targetMarket: string = '',
  enhancedMode: boolean = false
): Promise<any[]> {
  
  console.log(`🧠 Enhanced Reddit extraction starting...`);
  console.log(`Parameters: ${subreddits.length} subreddits, ${keywords.length} keywords, limit=${limit}, enhanced=${enhancedMode}`);
  
  // Use enhanced search strategies
  const { posts: allPosts, diagnostics } = await searchAcrossStrategies(
    accessToken,
    keywords,
    subreddits,
    enhancedMode, // includeGlobal for deep scan
    25 // perPage
  );

  // Adaptive GigaBrain relevance threshold
  const businessDomain = classifyBusinessType(targetTopic, '', targetMarket || '');
  let relevanceThreshold = 0.60; // Start strict
  let relevantPosts = [];
  
  // Try decreasing thresholds if results are sparse
  const thresholds = [0.60, 0.45, 0.30];
  
  for (const threshold of thresholds) {
    relevantPosts = allPosts.filter(post => {
      const relevanceScore = analyzePostRelevance(post, keywords, targetTopic, businessDomain);
      return relevanceScore >= threshold;
    });
    
    console.log(`🎯 Threshold ${threshold}: ${relevantPosts.length} posts qualify`);
    
    if (relevantPosts.length >= Math.min(limit, 10) || threshold === thresholds[thresholds.length - 1]) {
      relevanceThreshold = threshold;
      break;
    }
  }

  // Sort by relevance and take top posts
  const topPosts = relevantPosts
    .map(post => ({
      ...post,
      relevance_score: analyzePostRelevance(post, keywords, targetTopic, businessDomain)
    }))
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);

  console.log(`🎯 Final selection: ${topPosts.length} highly relevant posts (threshold: ${relevanceThreshold})`);

  // Extract detailed data for each post
  const detailedDiscussions = [];
  
  for (const post of topPosts) {
    try {
      // Get comments for the post
      const comments = await getPostComments(accessToken, post.subreddit, post.id);
      
      // Extract pain points and solutions
      const painPoints = extractPainPoints(post, comments);
      const solutions = extractSolutions(post, comments);
      
      // Prepare the detailed discussion data
      const discussionData = {
        opportunity_id: opportunityId,
        organization_id: organizationId || null,
        post_id: post.id,
        title: post.title,
        selftext: post.selftext || null,
        url: post.url || null,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        num_comments: post.num_comments,
        upvote_ratio: post.upvote_ratio,
        created_utc: post.created_utc,
        permalink: post.permalink,
        full_content: {
          title: post.title,
          selftext: post.selftext,
          url: post.url
        },
        top_comments: comments,
        engagement_metrics: {
          score: post.score,
          comments: post.num_comments,
          upvote_ratio: post.upvote_ratio,
          engagement_rate: (post.score + post.num_comments) / 100
        },
        relevance_score: Math.round(post.relevance_score * 100), // Convert 0-1 scale to 0-100 integer
        pain_points_extracted: painPoints,
        solutions_mentioned: solutions,
        is_marked_for_mvp: false
      };
      
      detailedDiscussions.push(discussionData);
      
      // Brief delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
    }
  }

  // Save discussions to database
  if (detailedDiscussions.length > 0) {
    console.log(`💾 Saving ${detailedDiscussions.length} GigaBrain discussions to database`);
    
    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('reddit_discussions')
        .upsert(detailedDiscussions, {
          onConflict: 'post_id,opportunity_id'
        })
        .select();

      if (insertError) {
        console.error('❌ Database error details:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      console.log(`🎉 Successfully saved ${insertedData?.length || 0} GigaBrain discussions`);
    } catch (error) {
      console.error('💥 Database operation failed:', error);
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }

  return detailedDiscussions;
}

// GigaBrain-inspired market validation system with advanced domain intelligence
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunityId, organizationId, subreddits, keywords, limit, enhancedMode = false } = await req.json();
    
    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get opportunity details for GigaBrain-style intelligence with enhanced error handling
    console.log('🔍 Fetching opportunity details for ID:', opportunityId);
    
    const { data: opportunity, error: opportunityError } = await supabase
      .from('business_opportunities')
      .select('title, description, target_market, opportunity_tags')
      .eq('id', opportunityId)
      .maybeSingle();

    if (opportunityError) {
      console.error('❌ Database error fetching opportunity:', opportunityError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${opportunityError.message}`,
        debug: { opportunityId, errorCode: opportunityError.code }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!opportunity) {
      console.error('❌ Opportunity not found in database:', opportunityId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Opportunity not found',
        debug: { opportunityId, message: 'No opportunity found with this ID' }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Opportunity found:', { 
      id: opportunityId, 
      title: opportunity.title?.substring(0, 50) + '...' 
    });

    console.log('🧠 Starting GigaBrain-inspired extraction:', {
      opportunityId,
      title: opportunity.title,
      targetMarket: opportunity.target_market,
      enhancedMode
    });

    // Generate smart keywords and subreddits based on enhanced approach
    const smartKeywords = enhancedMode 
      ? generateMarketContextKeywords(
          opportunity.title, 
          opportunity.description, 
          opportunity.target_market,
          opportunity.problem_statement,
          opportunity.solution_approach,
          opportunity.opportunity_tags
        )
      : keywords || ['startup', 'business', 'problem'];
    
    const businessType = classifyBusinessType(opportunity.title, opportunity.description, opportunity.target_market);
    const optimalSubreddits = enhancedMode
      ? selectOptimalSubreddits(businessType, opportunity.target_market, opportunity.title, opportunity.opportunity_tags || [])
      : subreddits || ['startups', 'entrepreneur', 'business'];

    console.log('🎯 Enhanced Strategy:', {
      businessType,
      smartKeywords: smartKeywords.slice(0, 6),
      optimalSubreddits: optimalSubreddits.slice(0, 8),
      enhancedMode
    });

    // Get Reddit access token with error handling
    let accessToken: string;
    try {
      accessToken = await getRedditAccessToken();
      console.log('✅ Reddit access token obtained');
    } catch (error) {
      console.error('❌ Failed to get Reddit access token:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Reddit API authentication failed',
        debug: { message: error.message, credentials: 'Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET' }
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract discussions with enhanced error handling and diagnostics
    let extractedDiscussions: any[];
    let searchDiagnostics: any = {};
    
    try {
      extractedDiscussions = await extractRedditDiscussions(
        accessToken,
        opportunityId,
        organizationId,
        optimalSubreddits,
        smartKeywords,
        limit || 10,
        opportunity.title,
        opportunity.target_market,
        enhancedMode
      );
      
      console.log(`🎉 Enhanced extraction completed: ${extractedDiscussions.length} discussions`);
      
      // Generate comprehensive diagnostics
      searchDiagnostics = {
        strategiesUsed: enhancedMode ? 'Enhanced Multi-Strategy' : 'Standard',
        subredditsSearched: optimalSubreddits.length,
        keywordsGenerated: smartKeywords.length,
        discussionsFound: extractedDiscussions.length,
        averageRelevance: extractedDiscussions.length > 0 
          ? Math.round(extractedDiscussions.reduce((avg, d) => avg + d.relevance_score, 0) / extractedDiscussions.length)
          : 0,
        reasonsIfLimited: extractedDiscussions.length < 5 ? [
          extractedDiscussions.length === 0 ? 'No relevant discussions found in target subreddits' : null,
          optimalSubreddits.length < 3 ? 'Limited subreddit coverage for this domain' : null,
          smartKeywords.length < 3 ? 'Insufficient keywords extracted from opportunity' : null
        ].filter(Boolean) : []
      };
      
    } catch (error) {
      console.error('❌ Failed to extract Reddit discussions:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Reddit discussion extraction failed',
        debug: { message: error.message, opportunity: opportunityId }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine status based on results
    const status = extractedDiscussions.length > 0 ? 'validated' : 'limited';
    const validationScore = extractedDiscussions.length > 0 
      ? Math.round(extractedDiscussions.reduce((avg, d) => avg + d.relevance_score, 0) / extractedDiscussions.length) 
      : 0;

    return new Response(JSON.stringify({
      success: true,
      status,
      discussionsFound: extractedDiscussions.length,
      discussions: extractedDiscussions,
      validation_score: validationScore,
      diagnostics: searchDiagnostics,
      metadata: {
        businessType,
        enhancedMode,
        subredditsSearched: optimalSubreddits,
        keywordsUsed: smartKeywords,
        threshold: 'adaptive (0.60→0.45→0.30)'
      },
      message: enhancedMode 
        ? `Enhanced scan: ${extractedDiscussions.length} discussions across ${optimalSubreddits.length} subreddits`
        : `Standard scan: ${extractedDiscussions.length} discussions found`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🧠 GigaBrain extraction error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});