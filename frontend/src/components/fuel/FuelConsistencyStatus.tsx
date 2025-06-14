import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, CheckCircle, AlertTriangle, 
  RefreshCw, ArrowDown, ArrowUp 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import fuelConsistencyService, { TankConsistencyResult } from '@/lib/fuelConsistencyService';
import { formatNumber } from '@/lib/utils';

interface FuelConsistencyStatusProps {
  tankId?: number; // Ako nije zadano, prikazujemo sve tankove
  onSelectTank?: (tankId: number) => void;
  refreshTrigger?: number; // Varijabla koja će se mijenjati kada želimo osvježiti podatke
}

export default function FuelConsistencyStatus({ 
  tankId, 
  onSelectTank,
  refreshTrigger = 0 
}: FuelConsistencyStatusProps) {
  const [consistencyResults, setConsistencyResults] = useState<TankConsistencyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConsistencyData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tankId) {
        // Dohvati podatke za jedan tank
        const result = await fuelConsistencyService.checkTankConsistency(tankId);
        setConsistencyResults([result]);
      } else {
        // Dohvati podatke za sve tankove
        const results = await fuelConsistencyService.checkAllTanksConsistency();
        setConsistencyResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'Greška pri dohvaćanju podataka o konzistentnosti');
    } finally {
      setLoading(false);
    }
  };

  // Učitaj podatke pri prvom renderiranju i kada se refreshTrigger promijeni
  useEffect(() => {
    loadConsistencyData();
  }, [tankId, refreshTrigger]);

  const getStatusColor = (isConsistent: boolean, difference: number) => {
    if (isConsistent) return 'text-green-500';
    return Math.abs(difference) > 50 ? 'text-red-500' : 'text-amber-500';
  };

  const getStatusIcon = (isConsistent: boolean, difference: number) => {
    if (isConsistent) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return Math.abs(difference) > 50 
      ? <AlertCircle className="w-5 h-5 text-red-500" /> 
      : <AlertTriangle className="w-5 h-5 text-amber-500" />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between">
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-6 w-24 bg-gray-200 animate-pulse rounded" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Greška
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            onClick={loadConsistencyData}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Pokušaj ponovo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasInconsistentTanks = consistencyResults.some(result => !result.isConsistent);

  return (
    <Card className={hasInconsistentTanks ? "border-amber-200" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <div className="flex items-center">
            {hasInconsistentTanks && (
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            )}
            Status konzistentnosti podataka o gorivu
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadConsistencyData}
            className="h-8"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Osvježi
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consistencyResults.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nema podataka o tankovima</p>
        ) : (
          <div className="space-y-4">
            {consistencyResults.map((result) => (
              <div 
                key={result.tankId} 
                className={`p-3 rounded-md border ${
                  result.isConsistent ? 'border-gray-100 bg-gray-50' : 'border-amber-100 bg-amber-50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(result.isConsistent, result.difference)}
                    <span className="ml-2 font-medium">
                      {result.tankName} ({result.tankType})
                    </span>
                  </div>
                  <Badge variant={result.isConsistent ? "outline" : "secondary"} className="ml-2">
                    {result.isConsistent ? 'Konzistentno' : 'Nekonzistentno'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <span className="text-gray-500">Trenutna količina:</span>
                    <span className="ml-1 font-medium">{formatNumber(result.currentQuantityLiters)} L</span>
                  </div>
                  <div>
                    <span className="text-gray-500">MRN zapisi:</span>
                    <span className="ml-1 font-medium">{formatNumber(result.sumMrnQuantities)} L</span>
                  </div>
                </div>
                
                {!result.isConsistent && (
                  <div className={`flex items-center ${getStatusColor(result.isConsistent, result.difference)}`}>
                    {result.difference > 0 ? (
                      <ArrowUp className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 mr-1" />
                    )}
                    <span className="font-medium">
                      Razlika: {formatNumber(Math.abs(result.difference))} L
                      {result.difference > 0 ? ' (višak u tanku)' : ' (manjak u tanku)'}
                    </span>
                  </div>
                )}
                
                {onSelectTank && (
                  <div className="mt-3">
                    <Button 
                      variant={result.isConsistent ? "ghost" : "secondary"}
                      size="sm"
                      onClick={() => onSelectTank(result.tankId)}
                      className="w-full"
                    >
                      {result.isConsistent ? 'Pregledaj detalje' : 'Riješi nekonzistentnost'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
