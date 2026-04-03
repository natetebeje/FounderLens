import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Play, Rocket } from 'lucide-react';
import { getBuildTrackForOpportunity, getBuildTrackForCaseStudy, hasBuildTrack } from '@/utils/build-mappings';

interface BuildThisButtonProps {
  opportunityId?: string;
  caseStudySlug?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  hasBuildTrack?: boolean;
  showBadge?: boolean;
}

export const BuildThisButton = ({ 
  opportunityId,
  caseStudySlug,
  variant = 'default',
  size = 'default',
  className = '',
  hasBuildTrack: propHasBuildTrack = false,
  showBadge = true
}: BuildThisButtonProps) => {
  const navigate = useNavigate();
  
  // Check if we have a build track for this opportunity or case study
  const actualHasBuildTrack = opportunityId ? hasBuildTrack(opportunityId) : 
                              caseStudySlug ? hasBuildTrack(undefined, caseStudySlug) : 
                              propHasBuildTrack;
  const buildTrack = opportunityId ? getBuildTrackForOpportunity(opportunityId) : 
                     caseStudySlug ? getBuildTrackForCaseStudy(caseStudySlug) : 
                     null;

  const handleBuildClick = () => {
    if (buildTrack) {
      // Navigate directly to the specific build track
      const fromParam = opportunityId ? `from=opportunity&id=${opportunityId}` : 
                       caseStudySlug ? `from=case-study&slug=${caseStudySlug}` : 
                       '';
      navigate(`/build/${buildTrack.buildTrackSlug}${fromParam ? `?${fromParam}` : ''}`);
    } else if (opportunityId) {
      // If we have an opportunity but no specific track, show recommended tracks
      navigate(`/build?from=opportunity&id=${opportunityId}`);
    } else if (caseStudySlug) {
      // If we have a case study but no specific track, show recommended tracks
      navigate(`/build?from=case-study&slug=${caseStudySlug}`);
    } else {
      // Otherwise go to general build page
      navigate('/build');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {showBadge && actualHasBuildTrack && (
        <Badge className="self-start bg-green-600 text-white border-0">
          <Play className="h-3 w-3 mr-1" />
          Build Track Available
        </Badge>
      )}
      <Button 
        onClick={handleBuildClick}
        variant={variant}
        size={size}
        className={`gap-2 ${className}`}
      >
        <Rocket className="h-4 w-4" />
        {buildTrack ? `Build: ${buildTrack.buildTrackTitle}` : 'Build This'}
      </Button>
    </div>
  );
};
