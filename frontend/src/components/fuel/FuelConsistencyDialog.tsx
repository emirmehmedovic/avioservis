import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, InfoIcon, ArrowDown, ArrowUp, CheckCircle, 
  AlertTriangle, RefreshCw, ShieldAlert 
} from 'lucide-react';
// Kreiranje privremenog useToast hook-a
const useToast = () => {
  return {
    toast: ({ title, description, variant }: { 
      title: string, 
      description: string, 
      variant?: string 
    }) => {
      console.log(`Toast: ${title} - ${description}`);
      // U pravoj implementaciji, ovdje bi se prikazao toast
      // Za sad samo ispisujemo u konzolu
      alert(`${title}\n${description}`);
    }
  };
};
import fuelConsistencyService, { 
  TankConsistencyResult, 
  OverrideTokenResponse 
} from '@/lib/fuelConsistencyService';
import { formatNumber } from '@/lib/utils';

interface FuelConsistencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inconsistencyData?: TankConsistencyResult;
  operationType?: string; // Ako je definiran, prikazujemo opciju za override
  onResolved: () => void; // Callback koji se poziva nakon uspješnog rješavanja
  onOverride?: (token: string) => void; // Callback koji se poziva kada admin dobije override token
}

export default function FuelConsistencyDialog({
  isOpen,
  onClose,
  inconsistencyData,
  operationType,
  onResolved,
  onOverride
}: FuelConsistencyDialogProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<'adjustTank' | 'adjustMrn' | 'createBalancingMrn'>('adjustTank');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideResponse, setOverrideResponse] = useState<OverrideTokenResponse | null>(null);

  if (!inconsistencyData) {
    return null;
  }

  const handleCorrection = async () => {
    if (!inconsistencyData) return;
    
    setLoading(true);
    try {
      const result = await fuelConsistencyService.correctTankInconsistency(
        inconsistencyData.tankId,
        action,
        notes
      );
      
      toast({
        title: 'Uspjeh',
        description: `Nekonzistentnost je uspješno riješena: ${result.message}`,
        variant: 'default'
      });
      
      onResolved();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Greška',
        description: error.message || 'Došlo je do greške pri pokušaju rješavanja nekonzistentnosti',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideRequest = async () => {
    if (!inconsistencyData || !operationType) return;
    
    setOverrideLoading(true);
    try {
      const result = await fuelConsistencyService.requestOverrideToken(
        inconsistencyData.tankId,
        operationType,
        notes
      );
      
      setOverrideResponse(result);
      
      if (onOverride) {
        onOverride(result.token);
      }
      
      toast({
        title: 'Token generiran',
        description: 'Dobili ste privremeni token za zaobilaženje provjere konzistentnosti',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Greška',
        description: error.message || 'Došlo je do greške pri generiranju tokena za zaobilaženje',
        variant: 'destructive'
      });
    } finally {
      setOverrideLoading(false);
    }
  };
  
  const getDifferenceColor = () => {
    if (inconsistencyData.isConsistent) return 'text-green-500';
    return Math.abs(inconsistencyData.difference) > 50 ? 'text-red-500' : 'text-amber-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Nekonzistentnost podataka o gorivu
          </DialogTitle>
          <DialogDescription>
            Pronađena je razlika između količine goriva u tanku i evidencije MRN zapisa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detalji o nekonzistentnosti */}
          <div className="bg-gray-50 p-3 rounded-md border">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{inconsistencyData.tankName}</div>
              <Badge variant="outline">{inconsistencyData.tankType}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <span className="text-gray-500">Količina u tanku:</span>
                <span className="font-medium ml-1">
                  {formatNumber(inconsistencyData.currentQuantityLiters)} L
                </span>
              </div>
              <div>
                <span className="text-gray-500">MRN zapisi:</span>
                <span className="font-medium ml-1">
                  {formatNumber(inconsistencyData.sumMrnQuantities)} L
                </span>
              </div>
            </div>
            
            <div className={`flex items-center font-medium ${getDifferenceColor()}`}>
              {inconsistencyData.difference > 0 ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              <span>
                Razlika: {formatNumber(Math.abs(inconsistencyData.difference))} L
                {inconsistencyData.difference > 0 
                  ? ' (višak u tanku)' 
                  : ' (manjak u tanku)'}
              </span>
            </div>
          </div>
          
          {/* Opcije za rješavanje nekonzistentnosti */}
          {!overrideResponse && (
            <>
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <InfoIcon className="w-4 h-4 mr-1 text-blue-500" />
                  Odaberite način rješavanja
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="adjust-tank" 
                      name="action" 
                      value="adjustTank" 
                      checked={action === 'adjustTank'}
                      onChange={() => setAction('adjustTank')} 
                    />
                    <Label htmlFor="adjust-tank" className="flex-1">
                      Podesi količinu u tanku prema MRN zapisima
                      {inconsistencyData.difference > 0 && (
                        <span className="text-sm text-amber-600 block">
                          (Smanjiti će količinu u tanku za {formatNumber(Math.abs(inconsistencyData.difference))} L)
                        </span>
                      )}
                      {inconsistencyData.difference < 0 && (
                        <span className="text-sm text-amber-600 block">
                          (Povećati će količinu u tanku za {formatNumber(Math.abs(inconsistencyData.difference))} L)
                        </span>
                      )}
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="adjust-mrn" 
                      name="action" 
                      value="createBalancingMrn" 
                      checked={action === 'createBalancingMrn'}
                      onChange={() => setAction('createBalancingMrn')} 
                    />
                    <Label htmlFor="adjust-mrn" className="flex-1">
                      Dodaj balansni MRN zapis
                      {inconsistencyData.difference > 0 && (
                        <span className="text-sm text-amber-600 block">
                          (Dodati će novi MRN zapis od {formatNumber(Math.abs(inconsistencyData.difference))} L)
                        </span>
                      )}
                      {inconsistencyData.difference < 0 && (
                        <span className="text-sm text-amber-600 block">
                          (Dodati će novi MRN zapis od {formatNumber(Math.abs(inconsistencyData.difference))} L)
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes" className="mb-1 block">
                  Bilješke (obavezno)
                </Label>
                <textarea
                  id="notes"
                  placeholder="Unesite razlog i objašnjenje korekcije"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  className="w-full border rounded-md p-2 resize-none"
                  rows={3}
                />
              </div>
            </>
          )}
          
          {/* Prikaz generiranog tokena za zaobilaženje */}
          {overrideResponse && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
              <div className="flex items-center text-blue-600 font-medium mb-2">
                <ShieldAlert className="w-4 h-4 mr-1" />
                Privremeni token za zaobilaženje
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Ovaj token omogućuje jednokratno zaobilaženje provjere konzistentnosti 
                za operaciju tipa <strong>{operationType}</strong>. Token vrijedi 5 minuta.
              </p>
              <pre className="bg-gray-100 p-2 rounded font-mono text-sm overflow-x-auto">
                {overrideResponse.token}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                Token automatski istječe nakon: {Math.floor(overrideResponse.expiresIn / 60)} minuta
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          {!overrideResponse ? (
            // Standardni gumbi za akcije korekcije
            <>
              <Button variant="outline" onClick={onClose}>
                Odustani
              </Button>
              
              {operationType && (
                <Button 
                  variant="secondary"
                  onClick={handleOverrideRequest}
                  disabled={overrideLoading || notes.trim().length === 0}
                  className="ml-2"
                >
                  {overrideLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Generiraj token za zaobilaženje
                </Button>
              )}
              
              <Button 
                onClick={handleCorrection}
                disabled={loading || notes.trim().length === 0}
                className="ml-2"
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Korekcija u tijeku...' : 'Korigiraj nekonzistentnost'}
              </Button>
            </>
          ) : (
            // Gumb za zatvaranje nakon generiranja tokena
            <Button onClick={onClose} className="w-full">
              Zatvori i nastavi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
