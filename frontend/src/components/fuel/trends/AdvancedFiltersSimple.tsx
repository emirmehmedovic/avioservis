/**
 * AdvancedFilters.tsx
 * Komponenta za napredne filtere u trend analizi
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Export advanced filter state interface
export interface AdvancedFilterState {
  dateRange: {
    startDate: string;
    endDate: string;
    preset?: string;
  };
  airlines: string[];
  destinations: string[];
  fuelTypes: string[];
  operationTypes: string[];
  amountRange: {
    min?: number;
    max?: number;
  };
  timeFilters: {
    workdays?: boolean;
    weekends?: boolean;
    nightOperations?: boolean;
  };
  savedFilters: any[];
  currentPreset?: string;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onFiltersChange: (filters: AdvancedFilterState) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Napredni filteri
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div className="text-center text-gray-500">
            Napredni filteri će biti dodani u sljedećoj verziji
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={onApplyFilters}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? 'Primjenjuje...' : 'Primijeni filtere'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilters; 