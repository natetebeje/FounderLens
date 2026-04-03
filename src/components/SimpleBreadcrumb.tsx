
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const SimpleBreadcrumb = () => {
  const location = useLocation();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    
    if (path === '/') {
      return [{ label: 'Home' }];
    }
    
    if (path === '/discovery') {
      return [{ label: 'Discovery' }];
    }
    
    if (path === '/opportunities') {
      return [{ label: 'Opportunities' }];
    }
    
    if (path === '/onboarding') {
      return [
        { label: 'Home', href: '/' },
        { label: 'Setup Profile' }
      ];
    }
    
    if (path.startsWith('/validation/')) {
      // Extract opportunityId from the URL path directly
      const pathSegments = path.split('/');
      const opportunityId = pathSegments[2]; // /validation/[opportunityId]
      console.log('🔗 SimpleBreadcrumb: extracted opportunityId from path:', opportunityId);
      const opportunitiesHref = opportunityId ? `/opportunities?highlight=${opportunityId}` : '/opportunities';
      console.log('🔗 SimpleBreadcrumb: opportunities href=', opportunitiesHref);
      return [
        { label: 'Home', href: '/' },
        { label: 'Opportunities', href: opportunitiesHref },
        { label: 'Validation' }
      ];
    }
    
    return [{ label: 'Home', href: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="w-3 h-3" />}
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
