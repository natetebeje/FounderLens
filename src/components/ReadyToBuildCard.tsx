import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReadyToBuildCardProps {
  opportunityId: string;
  validationScore: number;
}

export function ReadyToBuildCard({ opportunityId, validationScore }: ReadyToBuildCardProps) {
  const navigate = useNavigate();

  const handleStartBuilding = () => {
    navigate(`/build?from=opportunity&id=${opportunityId}`);
  };

  return (
    <Card className="border-success/20 bg-success/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <CardTitle className="text-success">Validation Complete!</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-success mb-2">
            {validationScore}%
          </div>
          <Badge variant="default" className="bg-success text-success-foreground">
            Strong Validation Score
          </Badge>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="font-medium flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Ready for Build Track
          </div>
          <p className="text-sm text-muted-foreground">
            Your opportunity has strong market signals and AI validation. 
            Explore our build tracks to turn this into a real product.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Market validated</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Competition analyzed</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Community signals</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>AI insights ready</span>
          </div>
        </div>

        <Button 
          onClick={handleStartBuilding}
          className="w-full"
          size="lg"
        >
          <Rocket className="h-4 w-4 mr-2" />
          Explore Build Tracks
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}