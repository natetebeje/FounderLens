import { useAuthContext } from '@/contexts/AuthContext';

// Re-export the context hook as useAuth for backwards compatibility
// All components now share a single auth state via AuthProvider
export const useAuth = useAuthContext;
