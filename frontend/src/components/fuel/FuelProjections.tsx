import React, { useState, useEffect, useCallback, useRef, useMemo, SetStateAction, Dispatch } from 'react';
import { fetchOperations, fetchAirlines, getGlobalFuelProjectionPreset, saveGlobalFuelProjectionPreset } from './services/fuelingOperationsService'; 
import { AirlineFE, FuelingOperation, ProjectionInputRow, ProjectionResult, TotalProjection, FuelProjectionPresetData, FullFuelProjectionPreset, CalculatedResultsData } from './types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notoSansRegularBase64 } from '@/lib/fonts'; // Assuming this path is correct
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64'; // Assuming this path is correct
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Loader2, Calculator, PlusCircle, Trash2, ChevronDown, FileText, Sheet, BarChart3, Table } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FONT_NAME = 'NotoSans';

const registerFont = (doc: jsPDF) => {
  const stripPrefix = (base64String: string) => {
    const prefix = 'data:font/ttf;base64,';
    if (base64String.startsWith(prefix)) {
      return base64String.substring(prefix.length);
    }
    return base64String;
  };

  if (notoSansRegularBase64) {
    const cleanedRegular = stripPrefix(notoSansRegularBase64);
    doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
    doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
  } else {
    console.error('Noto Sans Regular font data not loaded.');
  }

  if (notoSansBoldBase64) {
    const cleanedBold = stripPrefix(notoSansBoldBase64);
    doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
    doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } else {
    console.error('Noto Sans Bold font data not loaded.');
  }
};

export default function FuelProjections() {
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const [airlines, setAirlines] = useState<AirlineFE[]>([]);
  const [projectionInputs, setProjectionInputs] = useState<ProjectionInputRow[]>([]);
  const [projectionResults, setProjectionResults] = useState<ProjectionResult[]>([]);
  const [totalProjection, setTotalProjection] = useState<TotalProjection | null>(null);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);

  const [loadingAirlines, setLoadingAirlines] = useState<boolean>(true);
  const [calculationInProgress, setCalculationInProgress] = useState<boolean>(false);
  const [loadingPreset, setLoadingPreset] = useState<boolean>(false);

  const isInitialLoadComplete = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddRow = useCallback(() => {
    setProjectionInputs(prevInputs => [
      ...prevInputs,
      {
        id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`, 
        airlineId: '',
        destination: '',
        operations: 0,
        availableDestinations: [],
      },
    ]);
  }, []);

  const handleRemoveRow = (id: string) => {
    setProjectionInputs(prevInputs => prevInputs.filter(input => input.id !== id));
  };

  const handleInputChange = (id: string, field: keyof ProjectionInputRow, value: string | number) => {
    setProjectionInputs(prevInputs =>
      prevInputs.map(input => {
        if (input.id === id) {
          const updatedInput = { ...input, [field]: value };
          if (field === 'airlineId') {
            const selectedAirline = airlines.find(a => a.id === parseInt(value as string, 10));
            updatedInput.availableDestinations = selectedAirline?.operatingDestinations?.sort() || [];
            updatedInput.destination = ''; 
          }
          if (field === 'operations'){
            updatedInput.operations = Number(value) < 0 ? 0 : Number(value);
          }
          return updatedInput;
        }
        return input;
      })
    );
  };
  
  const debouncedSavePreset = useCallback((inputsToSave: ProjectionInputRow[], resultsToSave?: CalculatedResultsData) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      if (!isInitialLoadComplete.current) return; // Don't save if initial load isn't marked as done

      const presetToSave: FuelProjectionPresetData[] = inputsToSave
        .filter(p => p.airlineId && p.destination && p.operations > 0) // Save only valid rows
        .map(p => ({
          airlineId: p.airlineId,
          destination: p.destination,
          operations: p.operations,
        }));
      
      try {
        await saveGlobalFuelProjectionPreset(presetToSave, resultsToSave); // Pass results if available
        console.log('Projection preset saved successfully.');
      } catch (error) {
        console.error('Error saving projection preset:', error);
        if (!resultsToSave) { // Only show error for auto-save of inputs
          toast.error('Greška pri automatskom spremanju postavki.');
        }
      }
    }, 1500); 
  }, []); 

  const calculateProjections = async (): Promise<void> => {
    if (projectionInputs.length === 0) {
      toast.error('Molimo dodajte barem jedan red za projekciju.');
      return;
    }

    if (projectionInputs.some(input => !input.airlineId || !input.destination || input.operations <= 0)) {
      toast.error('Molimo popunite sva polja (Avio Kompanija, Destinacija, Broj operacija > 0) za svaki red.');
      return;
    }

    setCalculationInProgress(true);
    const results: ProjectionResult[] = [];
    let totalMonthly = 0;
    let totalQuarterly = 0;
    let totalYearly = 0;

    try {
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(3, 'month').format('YYYY-MM-DD');

      for (const input of projectionInputs) {
        const airline = airlines.find(a => input.airlineId !== null && a.id === parseInt(input.airlineId, 10));
        if (!airline) continue;

        const { operations: historicalOps } = await fetchOperations(
          startDate,
          endDate,
          input.airlineId,
          input.destination,
          '', 
          '', 
          ''  
        );
        
        const recentOperations = historicalOps
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
          .slice(0, 10); 

        let averageFuelPerOperation = 0;
        if (recentOperations.length > 0) {
          const totalFuel = recentOperations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
          averageFuelPerOperation = totalFuel / recentOperations.length;
        }

        const monthlyConsumption = averageFuelPerOperation * input.operations;
        const quarterlyConsumption = monthlyConsumption * 3;
        const yearlyConsumption = monthlyConsumption * 12;

        results.push({
          airlineName: airline.name,
          destination: input.destination,
          averageFuelPerOperation,
          operationsPerMonth: input.operations,
          monthlyConsumption,
          quarterlyConsumption,
          yearlyConsumption,
          operationsAnalyzed: recentOperations.length,
        });

        // Eksplicitna konverzija u brojeve da izbjegnemo string konkatenaciju
        totalMonthly += Number(monthlyConsumption);
        totalQuarterly += Number(quarterlyConsumption);
        totalYearly += Number(yearlyConsumption);
      }

      const newResults = results.sort((a,b) => a.airlineName.localeCompare(b.airlineName) || a.destination.localeCompare(b.destination));
      const newTotalProjection = { monthly: totalMonthly, quarterly: totalQuarterly, yearly: totalYearly };

      setProjectionResults(newResults);
      setTotalProjection(newTotalProjection);

      // After calculation, save both inputs and results
      const currentInputsToSave: FuelProjectionPresetData[] = projectionInputs
        .filter(p => p.airlineId && p.destination && p.operations > 0)
        .map(p => ({ airlineId: p.airlineId, destination: p.destination, operations: p.operations }));
      
      const resultsToSave: CalculatedResultsData = { projectionResults: newResults, totalProjection: newTotalProjection };
      
      try {
        await saveGlobalFuelProjectionPreset(currentInputsToSave, resultsToSave);
        toast.success('Projekcije izračunate i spremljene!');
        console.log('Projection inputs and results saved successfully after calculation.');
      } catch (error) {
        console.error('Error saving projection inputs and results after calculation:', error);
        toast.error('Greška pri spremanju izračunatih projekcija.');
      }
    } catch (error) {
      console.error('Error calculating projections:', error);
      toast.error('Greška pri izračunu projekcija potrošnje goriva.');
    } finally {
      setCalculationInProgress(false);
    }
  };

  useEffect(() => {
    const loadAirlinesData = async () => {
      try {
        setLoadingAirlines(true);
        const airlinesData = await fetchAirlines();
        setAirlines(airlinesData || []);
      } catch (error) {
        console.error('Error loading airlines:', error);
        toast.error('Greška pri učitavanju avio kompanija.');
      } finally {
        setLoadingAirlines(false);
      }
    };
    loadAirlinesData();
  }, []);

  useEffect(() => {
    if (airlines.length === 0) return;

    const loadPreset = async (): Promise<void> => {
      setLoadingPreset(true);
      isInitialLoadComplete.current = false; 
      try {
        const fullPreset = await getGlobalFuelProjectionPreset();
        if (fullPreset?.presetData && fullPreset.presetData.length > 0) {
          const loadedInputs: ProjectionInputRow[] = fullPreset.presetData.map((item: FuelProjectionPresetData, index: number) => {
            const selectedAirline = airlines.find(a => a.id === parseInt(item.airlineId, 10));
            return {
              id: `${Date.now().toString()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
              airlineId: item.airlineId,
              destination: item.destination,
              operations: item.operations,
              availableDestinations: selectedAirline?.operatingDestinations?.sort() || [],
            };
          });
          setProjectionInputs(loadedInputs);
          if (fullPreset.calculatedResultsData && fullPreset.calculatedResultsData.projectionResults && fullPreset.calculatedResultsData.totalProjection) {
            setProjectionResults(fullPreset.calculatedResultsData.projectionResults);
            setTotalProjection(fullPreset.calculatedResultsData.totalProjection);
            console.log('Loaded saved projection results.');
          } else {
            // If no saved results, ensure results are cleared
            setProjectionResults([]);
            setTotalProjection({ monthly: 0, quarterly: 0, yearly: 0 });
          }
        } else {
          if (projectionInputs.length === 0) {
             handleAddRow();
          }
        }
      } catch (error) {
        console.error('Error loading projection preset:', error);
        toast.error('Greška pri učitavanju spremljenih postavki projekcija.');
        if (projectionInputs.length === 0) {
            handleAddRow();
        }
      } finally {
        setLoadingPreset(false);
        isInitialLoadComplete.current = true; 
      }
    };

    loadPreset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airlines, handleAddRow]);

  useEffect(() => {
    if (projectionInputs.length > 0 && isInitialLoadComplete.current) {
      // When inputs change, save only inputs. Results are saved explicitly after calculation.
      debouncedSavePreset(projectionInputs, undefined);
    }
    // Cleanup timer on component unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [projectionInputs, debouncedSavePreset]);

  const airlineConsumptionData = useMemo(() => {
    if (!projectionResults || projectionResults.length === 0) return [];

    const aggregatedByAirline: {
      [key: string]: {
        airlineName: string;
        monthlyConsumption: number;
        quarterlyConsumption: number;
        yearlyConsumption: number;
      }
    } = {};

    const filteredResultsForAirline = selectedAirlines.length > 0 
      ? projectionResults.filter(result => selectedAirlines.includes(result.airlineName)) 
      : projectionResults;

    filteredResultsForAirline.forEach(result => {
      if (!aggregatedByAirline[result.airlineName]) {
        aggregatedByAirline[result.airlineName] = {
          airlineName: result.airlineName,
          monthlyConsumption: 0,
          quarterlyConsumption: 0,
          yearlyConsumption: 0,
        };
      }
      aggregatedByAirline[result.airlineName].monthlyConsumption += result.monthlyConsumption;
      aggregatedByAirline[result.airlineName].quarterlyConsumption += result.quarterlyConsumption;
      aggregatedByAirline[result.airlineName].yearlyConsumption += result.yearlyConsumption;
    });

    return Object.values(aggregatedByAirline);
  }, [projectionResults, selectedAirlines]);


  const destinationConsumptionData = useMemo(() => {
    if (!projectionResults || projectionResults.length === 0) return [];

    const aggregatedByDestination: {
      [key: string]: {
        destination: string;
        monthlyConsumption: number;
        quarterlyConsumption: number;
        yearlyConsumption: number;
      }
    } = {};

    const filteredResultsForDestination = selectedAirlines.length > 0 
      ? projectionResults.filter(result => selectedAirlines.includes(result.airlineName)) 
      : projectionResults;

    filteredResultsForDestination.forEach(result => {
      const key = result.destination;
      if (!aggregatedByDestination[key]) {
        aggregatedByDestination[key] = {
          destination: key,
          monthlyConsumption: 0,
          quarterlyConsumption: 0,
          yearlyConsumption: 0,
        };
      }
      aggregatedByDestination[key].monthlyConsumption += result.monthlyConsumption;
      aggregatedByDestination[key].quarterlyConsumption += result.quarterlyConsumption;
      aggregatedByDestination[key].yearlyConsumption += result.yearlyConsumption;
    });

    return Object.values(aggregatedByDestination);
  }, [projectionResults, selectedAirlines]);


  const overallConsumptionData = useMemo(() => {
    if (!totalProjection) return [];
    return [
      { periodname: 'Ukupno Mjesečno', value: totalProjection?.monthly },
      { periodname: 'Ukupno Kvartalno', value: totalProjection?.quarterly },
      { periodname: 'Ukupno Godišnje', value: totalProjection?.yearly },
    ];
  }, [totalProjection]);

    const handleExportChartsPDF = () => {
    if (chartsContainerRef.current) {
      toast.loading('Pripremam PDF...', { duration: 1500 });
      html2canvas(chartsContainerRef.current, {
        scale: 1.5, // Smanjeno radi manje veličine PDF-a
        useCORS: true, // Ako imate slike s drugih domena
        logging: false,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height] // Format PDF-a prilagođen veličini slike
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('projekcije-grafikoni.pdf');
        toast.success('Grafikoni uspješno eksportovani u PDF!');
      }).catch(err => {
        console.error("Greška prilikom generisanja PDF-a: ", err);
        toast.error('Greška prilikom generisanja PDF-a.');
      });
    } else {
      toast.error('Nije moguće pronaći sadržaj za eksport.');
    }
  };

  const handleExportTablePDF = () => {
    if (projectionResults.length === 0 && !totalProjection) {
      toast.error('Nema podataka za eksport u PDF tabelu.');
      return;
    }

    toast.loading('Pripremam PDF tabele...', { duration: 1000 });

    const doc = new jsPDF();
    registerFont(doc);
    doc.setFont(FONT_NAME);

    // Glavna tabela projekcija
    const tableColumnNames = [
      'Avio Kompanija',
      'Destinacija',
      'Prosj. Gorivo/Op. (L)',
      'Op./Mjesec',
      'Proj. Mjesečno (L)',
      'Proj. Kvartalno (L)',
      'Proj. Godišnje (L)',
      'Analiz. Op.'
    ];
    const tableRows = projectionResults.map(p => [
      p.airlineName,
      p.destination,
      p.averageFuelPerOperation.toLocaleString('bs-BA'),
      p.operationsPerMonth.toLocaleString('bs-BA'),
      p.monthlyConsumption.toLocaleString('bs-BA'),
      p.quarterlyConsumption.toLocaleString('bs-BA'),
      p.yearlyConsumption.toLocaleString('bs-BA'),
      p.operationsAnalyzed
    ]);

    autoTable(doc, {
      head: [tableColumnNames],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], font: FONT_NAME },
      styles: { fontSize: 8, cellPadding: 2, font: FONT_NAME },
      columnStyles: { 
        0: { cellWidth: 'auto' }, 
        1: { cellWidth: 'auto' },
        // Ostale kolone će automatski prilagoditi širinu
      }
    });

    // Tabela za ukupne projekcije (ako postoje)
    if (totalProjection) {
      const finalY = (doc as any).lastAutoTable.finalY || 20; // Dohvati Y poziciju nakon prve tabele
      doc.setFont(FONT_NAME);
      doc.text('Ukupne Projekcije:', 14, finalY + 15);
      const totalTableRows = [
        ['Mjesečno (L)', totalProjection.monthly.toLocaleString('bs-BA')],
        ['Kvartalno (L)', totalProjection.quarterly.toLocaleString('bs-BA')],
        ['Godišnje (L)', totalProjection.yearly.toLocaleString('bs-BA')]
      ];
      autoTable(doc, {
        body: totalTableRows,
        startY: finalY + 20,
        theme: 'plain',
        styles: { fontSize: 8, font: FONT_NAME },
      });
    }

    doc.save('projekcije-tabela.pdf');
    toast.success('Tabela uspješno eksportovana u PDF!');
  };

  const handleExportExcel = () => {
    if (projectionResults.length === 0 && !totalProjection) {
      toast.error('Nema podataka za eksport u Excel.');
      return;
    }

    toast.loading('Pripremam Excel...', { duration: 1000 });

    // Priprema podataka za tabelu projekcija
    const projectionsData = projectionResults.map(result => ({
      'Avio Kompanija': result.airlineName,
      'Destinacija': result.destination,
      'Prosječna Potrošnja Po Operaciji (L)': result.averageFuelPerOperation.toLocaleString('bs-BA'),
      'Operacija Mjesečno': result.operationsPerMonth.toLocaleString('bs-BA'),
      'Projekcija Mjesečno (L)': result.monthlyConsumption.toLocaleString('bs-BA'),
      'Projekcija Kvartalno (L)': result.quarterlyConsumption.toLocaleString('bs-BA'),
      'Projekcija Godišnje (L)': result.yearlyConsumption.toLocaleString('bs-BA'),
      'Broj Analiziranih Operacija': result.operationsAnalyzed
    }));

    // Priprema podataka za ukupne vrijednosti
    const totalsData = [];
    if (totalProjection) {
      totalsData.push({
        'Opis': 'UKUPNO Mjesečno (L)',
        'Vrijednost': totalProjection.monthly.toLocaleString('bs-BA')
      });
      totalsData.push({
        'Opis': 'UKUPNO Kvartalno (L)',
        'Vrijednost': totalProjection.quarterly.toLocaleString('bs-BA')
      });
      totalsData.push({
        'Opis': 'UKUPNO Godišnje (L)',
        'Vrijednost': totalProjection.yearly.toLocaleString('bs-BA')
      });
    }

    // Kreiranje radnih listova
    const wsProjections = XLSX.utils.json_to_sheet(projectionsData);
    const wsTotals = XLSX.utils.json_to_sheet(totalsData);

    // Kreiranje radne knjige i dodavanje listova
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsProjections, 'Projekcije Detaljno');
    if (totalsData.length > 0) {
      XLSX.utils.book_append_sheet(wb, wsTotals, 'Ukupne Projekcije');
    }

    // Eksportovanje datoteke
    XLSX.writeFile(wb, 'projekcije-goriva.xlsx');
    toast.success('Excel datoteka uspješno eksportovana!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Projekcije potrošnje goriva</h3>
          <p className="text-sm text-gray-700 mt-1">
            Unesite kombinacije avio kompanija, destinacija i očekivani broj operacija mjesečno za izračun projekcije.
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {projectionInputs.map((input, index) => {
              // Temporary debug to catch duplicate IDs
              if (projectionInputs.filter(i => i.id === input.id).length > 1) {
                console.warn('Duplicate ID found:', input.id, 'in projectionInputs');
              }
              return (
              <div key={input.id} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white hover:border-gray-300 transition-all relative">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <Label htmlFor={`airline-${input.id}`} className="text-sm font-medium text-gray-700">Avio Kompanija</Label>
                        <select
                            id={`airline-${input.id}`}
                            value={input.airlineId}
                            onChange={(e) => handleInputChange(input.id, 'airlineId', e.target.value)}
                            disabled={loadingAirlines || loadingPreset}
                            className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 hover:border-gray-400 transition-all"
                        >
                            <option value="">Izaberite avio kompaniju</option>
                            {airlines.map(airline => (
                                <option key={airline.id} value={airline.id.toString()}>{airline.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <Label htmlFor={`destination-${input.id}`} className="text-sm font-medium text-gray-700">Destinacija</Label>
                        <select
                            id={`destination-${input.id}`}
                            value={input.destination}
                            onChange={(e) => handleInputChange(input.id, 'destination', e.target.value)}
                            disabled={!input.airlineId || loadingAirlines || loadingPreset}
                            className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 hover:border-gray-400 transition-all"
                        >
                            <option value="">Izaberite destinaciju</option>
                            {input.availableDestinations.map((dest: string) => (
                                <option key={dest} value={dest}>{dest}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <Label htmlFor={`operations-${input.id}`} className="text-sm font-medium text-gray-700">Broj operacija (mjesečno)</Label>
                        <Input 
                            id={`operations-${input.id}`} 
                            type="number" 
                            value={input.operations} 
                            onChange={(e) => handleInputChange(input.id, 'operations', parseInt(e.target.value, 10) || 0)}
                            className="mt-1"
                            min={0}
                            disabled={loadingAirlines || loadingPreset}
                        />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                        <button onClick={() => handleRemoveRow(input.id)} disabled={loadingAirlines || loadingPreset || projectionInputs.length <= 1} className="w-full px-3 py-2 text-sm font-medium border border-red-300 text-red-700 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
              </div>
              );
            })}
            <div className="flex justify-start pt-2">
              <button onClick={handleAddRow} disabled={loadingAirlines || loadingPreset} className="px-4 py-2 mb-4 mr-2 text-sm font-medium border border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <PlusCircle size={16} /> Dodaj Red
              </button>
            </div>

            <button
              onClick={calculateProjections}
              disabled={calculationInProgress || loadingAirlines || loadingPreset || projectionInputs.length === 0 || projectionInputs.some(pIn => !pIn.airlineId || !pIn.destination || pIn.operations <= 0)}
              className="w-full md:w-auto mt-4 px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {calculationInProgress ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Izračunavanje...</>
              ) : (
                <><Calculator className="h-4 w-4" /> Izračunaj projekciju</>
              )}
            </button>
          </div>
        </div>
      </div>

      {projectionResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rezultati projekcije</h3>
            <p className="text-sm text-gray-700 mt-1">
              Projekcije potrošnje goriva bazirane na historijskim podacima za unesene kombinacije.
            </p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avio Kompanija</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Destinacija</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Prosj. potrošnja / operaciji (L)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Operacija mjesečno</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Mjesečna potrošnja (L)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Kvartalna potrošnja (L)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Godišnja potrošnja (L)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Analizirano operacija</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionResults.map((result, index) => (
                    <tr key={`${result.airlineName}-${result.destination}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{result.airlineName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{result.destination}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {result.averageFuelPerOperation.toLocaleString('bs-BA', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{result.operationsPerMonth}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {result.monthlyConsumption.toLocaleString('bs-BA', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {result.quarterlyConsumption.toLocaleString('bs-BA', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {result.yearlyConsumption.toLocaleString('bs-BA', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {result.operationsAnalyzed > 0 ? result.operationsAnalyzed : (
                          <span className="text-red-600 font-semibold">Nema podataka</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-4 py-3 text-sm text-gray-900" colSpan={4}>UKUPNO</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {totalProjection?.monthly ? totalProjection.monthly.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {totalProjection?.quarterly ? totalProjection.quarterly.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {totalProjection?.yearly ? totalProjection.yearly.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              * Projekcije su bazirane na prosječnoj potrošnji goriva iz posljednjih 10 operacija za svaku kombinaciju avio kompanije i destinacije u posljednja 3 mjeseca.
              {projectionResults.some(r => r.operationsAnalyzed === 0) && (
                <div className="mt-1 text-red-500">
                  Za neke kombinacije nema dovoljno historijskih podataka o potrošnji goriva za preciznu projekciju.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOVA KARTICA ZA GRAFIKONE - POČETAK */}
      {projectionResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" ref={chartsContainerRef}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Statistički prikaz projekcija</h3>
                <p className="text-sm text-gray-700 mt-1">
                  Vizualizacija projicirane potrošnje goriva.
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button onClick={handleExportTablePDF} className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap">
                  <Table className="h-4 w-4" />
                  <span>Tabela u PDF</span>
                </button>
                <button onClick={handleExportChartsPDF} className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 hover:bg-stone-100 transition-all flex items-center gap-2 whitespace-nowrap">
                  <BarChart3 className="h-4 w-4" />
                  <span>Grafikoni u PDF</span>
                </button>
                <button onClick={handleExportExcel} className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 hover:bg-green-50 transition-all flex items-center gap-2 whitespace-nowrap">
                  <Sheet className="h-4 w-4" />
                  <span>Excel</span>
                </button>
                {airlines.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap">
                        Avio Kompanije ({selectedAirlines.length === 0 ? 'Sve' : selectedAirlines.length})
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                      <DropdownMenuLabel>Filtriraj po Avio Kompaniji</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={selectedAirlines.length === 0}
                        onCheckedChange={(checked: boolean) => { if(checked === false || checked === true) setSelectedAirlines([])}}
                      >
                        Sve Kompanije
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={selectedAirlines.length === airlines.length && airlines.length > 0}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedAirlines(airlines.map(a => a.name));
                          } else {
                            // This case should ideally not be hit if 'Sve Kompanije' is used for clearing
                          }
                        }}
                      >
                        Odaberi Sve ({airlines.length})
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {airlines.map((airline) => (
                        <DropdownMenuCheckboxItem
                          key={airline.id}
                          checked={selectedAirlines.includes(airline.name)}
                          onCheckedChange={(checked: boolean) => {
                            setSelectedAirlines(prev => 
                              checked 
                                ? [...prev, airline.name] 
                                : prev.filter(name => name !== airline.name)
                            );
                          }}
                        >
                          {airline.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Potrošnja po Avio Kompaniji</h3>
              {airlineConsumptionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={airlineConsumptionData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="airlineName" />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toLocaleString('bs-BA')}k L`} 
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value.toLocaleString('bs-BA')} L`, name]}
                    />
                    <Legend />
                    <Bar dataKey="monthlyConsumption" fill="#82ca9d" name="Mjesečna" />
                    <Bar dataKey="quarterlyConsumption" fill="#ffc658" name="Kvartalna" />
                    <Bar dataKey="yearlyConsumption" fill="#8884d8" name="Godišnja" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>Nema podataka za prikaz grafa po avio kompanijama.</p>
              )}
            </div>
            {/* Grafikon po destinaciji */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Potrošnja po Destinaciji</h3>
              {destinationConsumptionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={destinationConsumptionData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="destination" />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toLocaleString('bs-BA')}k L`} 
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value.toLocaleString('bs-BA')} L`, name]}
                    />
                    <Legend />
                    <Bar dataKey="monthlyConsumption" fill="#82ca9d" name="Mjesečna" />
                    <Bar dataKey="quarterlyConsumption" fill="#ffc658" name="Kvartalna" />
                    <Bar dataKey="yearlyConsumption" fill="#8884d8" name="Godišnja" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>Nema podataka za prikaz grafa po destinacijama.</p>
              )}
            </div>
            {/* Grafikon ukupne potrošnje */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ukupna Potrošnja (Mjesečno, Kvartalno, Godišnje)</h3>
              {overallConsumptionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={overallConsumptionData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toLocaleString('bs-BA')}k L`} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toLocaleString('bs-BA')} L`, 'Ukupno']}
                    />
                    {/* <Legend /> // Legenda ovdje nije nužno potrebna jer imamo samo jednu seriju podataka */}
                    <Bar dataKey="value" name="Ukupna potrošnja">
                      {overallConsumptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#82ca9d', '#ffc658', '#8884d8'][index % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>Nema podataka za prikaz grafa ukupne potrošnje.</p>
              )}
            </div>
            {/* Ovdje će doći ostali grafovi */}
          </div>
        </div>
      )}
    </div>
  );
}
