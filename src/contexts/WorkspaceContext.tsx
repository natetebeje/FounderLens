
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentUserRole: string | null;
  isLoading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

const CACHE_KEY = 'workspace_cache';

function getCached(userId: string): { org: Organization; role: string } | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Cache valid for 5 minutes
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(`${CACHE_KEY}_${userId}`);
      return null;
    }
    return { org: data.organization, role: data.userRole };
  } catch {
    return null;
  }
}

function setCache(userId: string, org: Organization, role: string) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
      organization: org,
      userRole: role,
      expiresAt: Date.now() + 5 * 60 * 1000,
    }));
  } catch {}
}

function clearAllCache() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY)) localStorage.removeItem(key);
    });
  } catch {}
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);

  // React to auth state changes — this is the single trigger for workspace loading
  useEffect(() => {
    if (authLoading) return; // Wait for auth to settle

    if (!user) {
      // Signed out — clear everything
      setOrganizations([]);
      setCurrentOrganization(null);
      setCurrentUserRole(null);
      setIsLoading(false);
      clearAllCache();
      return;
    }

    // User is authenticated — load workspace
    // Try cache first for instant UI
    const cached = getCached(user.id);
    if (cached) {
      setOrganizations([cached.org]);
      setCurrentOrganization(cached.org);
      setCurrentUserRole(cached.role);
      setIsLoading(false);
      // Verify in background
      verifyAndLoad(user.id);
    } else {
      loadWorkspace(user.id);
    }
  }, [user, authLoading]);

  const verifyAndLoad = async (userId: string) => {
    // Silent background check — don't set loading state
    try {
      const orgs = await fetchOrganizations(userId);
      if (orgs && orgs.length > 0) {
        const org = orgs[0];
        const role = (org as any).userRole || 'member';
        const cleanOrg = cleanOrgData(org);
        setOrganizations([cleanOrg]);
        setCurrentOrganization(cleanOrg);
        setCurrentUserRole(role);
        setCache(userId, cleanOrg, role);
      }
    } catch (error) {
      console.warn('WorkspaceContext: Background verify failed:', error);
    }
  };

  const loadWorkspace = async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      let orgs = await fetchOrganizations(userId);

      // If no orgs, the DB trigger may not have run yet — retry once
      if (!orgs || orgs.length === 0) {
        console.log('WorkspaceContext: No orgs found, retrying in 1.5s...');
        await new Promise(r => setTimeout(r, 1500));
        orgs = await fetchOrganizations(userId);
      }

      // Still no orgs — create one as fallback
      if (!orgs || orgs.length === 0) {
        console.log('WorkspaceContext: Creating personal workspace as fallback');
        const newOrg = await createPersonalWorkspace(userId);
        if (newOrg) {
          orgs = [{ ...newOrg, userRole: 'owner' } as any];
        }
      }

      if (orgs && orgs.length > 0) {
        const primary = orgs[0];
        const role = (primary as any).userRole || 'owner';
        const cleanOrg = cleanOrgData(primary);
        setOrganizations(orgs.map(cleanOrgData));
        setCurrentOrganization(cleanOrg);
        setCurrentUserRole(role);
        setCache(userId, cleanOrg, role);
      }
    } catch (error) {
      console.error('WorkspaceContext: Error loading workspace:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const fetchOrganizations = async (userId: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id, name, slug, owner_id, created_at, updated_at,
        organization_members!inner(role)
      `)
      .eq('organization_members.user_id', userId)
      .limit(10);

    if (error) {
      console.error('WorkspaceContext: Org query error:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Add role to each org for sorting
    return data.map(org => ({
      ...org,
      userRole: org.organization_members?.[0]?.role || 'member'
    }));
  };

  const cleanOrgData = (org: any): Organization => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    owner_id: org.owner_id,
    created_at: org.created_at,
    updated_at: org.updated_at,
  });

  const createPersonalWorkspace = async (userId: string): Promise<Organization | null> => {
    try {
      // Check if it already exists (RLS might have hidden it from the join query)
      const { data: existing } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', `personal-${userId}`)
        .maybeSingle();

      if (existing) {
        // Ensure membership exists
        await supabase
          .from('organization_members')
          .upsert({ organization_id: existing.id, user_id: userId, role: 'owner' },
            { onConflict: 'organization_id,user_id' });
        return existing;
      }

      // Get user name for workspace
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .maybeSingle();

      const name = profile?.first_name
        ? `${profile.first_name}'s Workspace`
        : 'Personal Workspace';

      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({ name, slug: `personal-${userId}`, owner_id: userId })
        .select()
        .single();

      if (error) {
        console.error('WorkspaceContext: Error creating workspace:', error);
        return null;
      }

      await supabase
        .from('organization_members')
        .insert({ organization_id: newOrg.id, user_id: userId, role: 'owner' });

      return newOrg;
    } catch (error) {
      console.error('WorkspaceContext: Error in createPersonalWorkspace:', error);
      return null;
    }
  };

  const refreshOrganizations = async () => {
    if (user) {
      loadingRef.current = false; // Allow reload
      await loadWorkspace(user.id);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      organizations,
      currentOrganization,
      currentUserRole,
      isLoading,
      refreshOrganizations,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
