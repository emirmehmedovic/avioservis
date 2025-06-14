'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import TradingViewWidget from './TradingViewWidget';
import ForexTradingViewWidget from './ForexTradingViewWidget';
import { getAirlines, getCachedFuelPriceRules, createFuelPriceRule, updateFuelPriceRule, clearFuelPriceRulesCache, clearAirlinesCache } from '@/lib/apiService';
import { Airline, FuelPriceRule, CreateFuelPriceRulePayload, UpdateFuelPriceRulePayload } from '@/types/fuel'; // Added UpdateFuelPriceRulePayload // Added type imports
import { Button } from '@/components/ui/Button'; // Assuming Button component exists
import { Input } from '@/components/ui/input'; // Corrected casing
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Corrected casing
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'; // Corrected casing to Table
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Assuming Dialog components exist
import { toast } from 'sonner'; // Assuming sonner for notifications

// Constants for widget height
const WIDGET_HEIGHT = '500px';
const INFO_CARD_HEIGHT = '200px';

const FuelPrices: React.FC = () => {
  // State for existing data
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [fuelPriceRules, setFuelPriceRules] = useState<FuelPriceRule[]>([]);

  // State for the form
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD'); // Default currency

  // Loading and error states
  const [isLoadingAirlines, setIsLoadingAirlines] = useState<boolean>(true);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<FuelPriceRule | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('manage-prices'); // Changed default tab to manage-prices

  const handleOpenEditDialog = (rule: FuelPriceRule) => {
    setEditingRule(rule);
    setEditPrice(rule.price.toString());
    setEditCurrency(rule.currency);
    setIsEditDialogOpen(true);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingAirlines(true);
        const airlinesData = await getAirlines(); // Uses internal caching
        setAirlines(airlinesData);
      } catch (err) {
        setError('Greška pri dohvatanju avio-kompanija.');
        console.error(err);
        toast.error('Greška pri dohvatanju avio-kompanija.');
      } finally {
        setIsLoadingAirlines(false);
      }

      try {
        setIsLoadingRules(true);
        const rulesData = await getCachedFuelPriceRules(); // Use cached version
        // Sort rules by createdAt descending to show newest first
        const sortedRules = rulesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFuelPriceRules(sortedRules);
      } catch (err) {
        setError('Greška pri dohvatanju pravila o cijenama goriva.');
        console.error(err);
        toast.error('Greška pri dohvatanju pravila o cijenama goriva.');
      } finally {
        setIsLoadingRules(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateRule = async () => {
    if (!editingRule || editPrice.trim() === '' || !editCurrency) {
      toast.error('Molimo unesite cijenu i odaberite valutu.');
      return;
    }

    const priceValue = parseFloat(editPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Cijena mora biti validan pozitivan broj.');
      return;
    }

    const payload: UpdateFuelPriceRulePayload = {
      price: priceValue,
      currency: editCurrency.toUpperCase(),
    };

    try {
      // Optuštamo da updateFuelPriceRule vraća ažurirano pravilo s uključenim airline podacima
      const updatedRuleFromApi = await updateFuelPriceRule(editingRule.id, payload);
      
      setFuelPriceRules(prevRules => 
        prevRules.map(r => 
          r.id === updatedRuleFromApi.id 
            ? updatedRuleFromApi // API response should include airline details
            : r
        )
      );
      toast.success(`Cijena za ${airlines.find(a => a.id === editingRule.airlineId)?.name || 'avio kompaniju'} (${payload.currency}) uspješno ažurirana.`);
      setIsEditDialogOpen(false);
      setEditingRule(null);
      clearFuelPriceRulesCache(); // Invalidate cache
      // Optionally, refetch immediately or let next interaction/mount do it
      // For now, we'll let the local state update suffice and next data fetch will get fresh data
      // If immediate refresh is needed: await fetchData(); or specific part of it
    } catch (err: any) {
      console.error('Greška pri ažuriranju pravila:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Došlo je do greške pri ažuriranju pravila.';
      toast.error(errorMessage);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAirline || !price || !currency) {
      toast.error('Molimo popunite sva polja.');
      return;
    }

    const newRulePayload: CreateFuelPriceRulePayload = {
      airlineId: parseInt(selectedAirline),
      price: parseFloat(price),
      currency,
    };

    try {
      const createdRule = await createFuelPriceRule(newRulePayload);
      // Add to list and resort, or refetch
      setFuelPriceRules(prevRules => 
        [createdRule, ...prevRules].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      toast.success('Novo pravilo o cijeni goriva uspješno dodano!');
      // Reset form
      setSelectedAirline('');
      setPrice('');
      setCurrency('USD');
      clearFuelPriceRulesCache(); // Invalidate cache
      // Optionally, refetch immediately
      // For now, we'll let the local state update suffice and next data fetch will get fresh data
    } catch (error) {
      console.error('Greška pri dodavanju pravila:', error);
      if (error && typeof error === 'object' && 'responseBody' in error && error.responseBody && typeof error.responseBody === 'object' && 'message' in error.responseBody) {
      toast.error(String((error.responseBody as { message: string }).message));
    } else if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error('Došlo je do neočekivane greške pri dodavanju pravila.');
    }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 10H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cijene Goriva
            </h2>
            <p className="text-gray-300 mt-1 ml-8">
              Upravljanje cijenama goriva i praćenje tržišnih trendova
            </p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="manage-prices" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="flex space-x-2 overflow-x-auto bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] p-2 rounded-xl shadow-lg border border-white/5 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          <TabsTrigger 
            value="manage-prices" 
            className="px-5 py-3 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 focus:outline-none rounded-xl backdrop-blur-md text-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-white/10 hover:text-white hover:bg-white/5"
            style={{
              background: activeTab === 'manage-prices' ? 'linear-gradient(135deg, #F0808020, #F0808040)' : 'transparent',
              borderBottom: activeTab === 'manage-prices' ? '2px solid #F08080' : 'none'
            }}
          >
            <span style={{ color: '#F08080' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                <path d="M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                <path d="M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"></circle>
              </svg>
            </span>
            <span>Upravljanje Cijenama</span>
          </TabsTrigger>
          <TabsTrigger 
            value="charts" 
            className="px-5 py-3 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 focus:outline-none rounded-xl backdrop-blur-md text-gray-300 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-white/10 hover:text-white hover:bg-white/5"
            style={{
              background: activeTab === 'charts' ? 'linear-gradient(135deg, #4FC3C720, #4FC3C740)' : 'transparent',
              borderBottom: activeTab === 'charts' ? '2px solid #4FC3C7' : 'none'
            }}
          >
            <span style={{ color: '#4FC3C7' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19L13 4.00001L20 14.5L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M13 4L9.04401 13.1224C9.01443 13.1921 9.01443 13.2685 9.04401 13.3382L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M4 19L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </span>
            <span>Grafovi</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crude Oil Price Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cijena Sirove Nafte (WTI)</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: WIDGET_HEIGHT }}>
                  <TradingViewWidget />
                </div>
              </CardContent>
            </Card>

            {/* EUR/USD Exchange Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Kurs EUR/USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: WIDGET_HEIGHT }}>
                  <ForexTradingViewWidget />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        


                {/* Tab for Managing Fuel Prices */}
        <TabsContent value="manage-prices" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form for adding new fuel price rule */}
            <div className="lg:col-span-1">
              <Card className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <CardHeader className="relative overflow-hidden rounded-t-xl border-b border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg pb-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
                  <CardTitle className="text-white flex items-center gap-2 relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#F08080]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Dodaj Novo Pravilo o Cijeni Goriva
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleAddRule} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="airline" className="block text-sm font-medium text-gray-700">Avio-kompanija</label>
                      {isLoadingAirlines ? (
                        <div className="flex items-center space-x-2 text-white/80">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm">Učitavanje avio-kompanija...</span>
                        </div>
                      ) : airlines.length > 0 ? (
                        <Select onValueChange={setSelectedAirline} value={selectedAirline}>
                          <SelectTrigger id="airline" className="w-full border-gray-300 focus:border-[#E60026]/50 focus:ring-[#E60026]/50 rounded-md">
                            <SelectValue placeholder="Izaberite avio-kompaniju" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-auto">
                            {airlines.map((airline) => (
                              <SelectItem key={airline.id} value={airline.id.toString()} className="cursor-pointer hover:bg-black/20">
                                {airline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm">Nema dostupnih avio-kompanija. Dodajte ih prvo u sistem.</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">Cijena</label>
                      <div className="relative rounded-md shadow-sm">
                        <Input 
                          id="price" 
                          type="number" 
                          value={price} 
                          onChange={(e) => setPrice(e.target.value)} 
                          placeholder="Unesite cijenu"
                          step="0.00001"
                          className="w-full pr-12 border-white/20 focus:border-[#F08080] focus:ring-[#F08080] rounded-xl backdrop-blur-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Valuta</label>
                      <Select onValueChange={setCurrency} value={currency}>
                        <SelectTrigger id="currency" className="w-full border-white/20 focus:border-[#F08080] focus:ring-[#F08080] rounded-xl backdrop-blur-md">
                          <SelectValue placeholder="Izaberite valutu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD" className="cursor-pointer hover:bg-black/20">USD</SelectItem>
                          <SelectItem value="EUR" className="cursor-pointer hover:bg-black/20">EUR</SelectItem>
                          <SelectItem value="BAM" className="cursor-pointer hover:bg-black/20">BAM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl flex items-center justify-center gap-2 px-4 py-2 mt-4"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span>Dodaj Pravilo</span>
                    </button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Table for displaying existing fuel price rules */}
            <div className="lg:col-span-4">
              <Card className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="overflow-x-auto rounded-lg">
                    {isLoadingRules ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <svg className="animate-spin h-8 w-8 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm text-white/80 font-medium">Učitavanje pravila...</span>
                        </div>
                      </div>
                    ) : fuelPriceRules.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <Table className="min-w-full divide-y divide-gray-200">
                          <TableHeader className="bg-gradient-to-r from-black/40 via-black/60 to-black/40 backdrop-blur-xl border-b border-white/10">
                            <TableRow>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Avio-kompanija</TableHead>
                              <TableHead className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Cijena</TableHead>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Valuta</TableHead>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Datum Unosa</TableHead>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Posljednja Izmjena</TableHead>
                              <TableHead className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Akcije</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="bg-white divide-y divide-gray-200">
                            {fuelPriceRules.map((rule) => (
                              <TableRow key={rule.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{airlines.find(a => a.id === rule.airlineId)?.name || rule.airlineId}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono">{typeof rule.price === 'number' ? rule.price.toFixed(5) : Number(rule.price).toFixed(5)}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E60026]/20 text-[#E60026]">
                                    {rule.currency}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(rule.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(rule.updatedAt).toLocaleDateString()} {new Date(rule.updatedAt).toLocaleTimeString()}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenEditDialog(rule)} 
                                    className="inline-flex items-center px-3 py-1 border border-white/20 text-sm leading-5 font-medium rounded-md text-white bg-black/40 hover:bg-white/10 hover:text-[#E60026]/80 focus:outline-none focus:border-white/30 active:bg-black/50 transition ease-in-out duration-150"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Uredi
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-center text-gray-500 mb-1">Nema unesenih pravila o cijenama goriva.</p>
                        <p className="text-center text-sm text-gray-400">Koristite formu sa lijeve strane da dodate novo pravilo.</p>
                      </div>
                    )}
                    {error && (
                      <div className="mt-4 bg-[#E60026]/10 border-l-4 border-[#E60026] p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-[#E60026]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-[#E60026]">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Fuel Price Rule Dialog */}
      {editingRule && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl border border-gray-200 shadow-xl">
            <DialogHeader className="bg-gradient-to-r from-black/40 via-black/60 to-black/40 backdrop-blur-xl border-b border-white/20 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
              <DialogTitle className="text-white flex items-center gap-2 text-xl relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Uredi Pravilo Cijene Goriva
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="editAirlineNameDialog" className="block text-sm font-medium text-gray-700">Avio Kompanija</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-gray-700">
                    {airlines.find(a => a.id === editingRule.airlineId)?.name || 'N/A'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="editPriceDialog" className="block text-sm font-medium text-gray-700">Cijena</label>
                  <Input 
                    id="editPriceDialog" 
                    type="number" 
                    value={editPrice} 
                    step="0.00001" 
                    onChange={(e) => setEditPrice(e.target.value)} 
                    placeholder="Unesite cijenu"
                    className="w-full border-gray-300 focus:border-[#E60026]/50 focus:ring-[#E60026]/50 rounded-md"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="editCurrencyDialog" className="block text-sm font-medium text-gray-700">Valuta</label>
                  <Select value={editCurrency} onValueChange={setEditCurrency}>
                    <SelectTrigger id="editCurrencyDialog" className="w-full border-gray-300 focus:border-[#E60026]/50 focus:ring-[#E60026]/50 rounded-md">
                      <SelectValue placeholder="Odaberite valutu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD" className="cursor-pointer hover:bg-black/20">USD</SelectItem>
                      <SelectItem value="EUR" className="cursor-pointer hover:bg-black/20">EUR</SelectItem>
                      <SelectItem value="BAM" className="cursor-pointer hover:bg-black/20">BAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
              <DialogClose asChild>
                <Button 
                  variant="outline" 
                  onClick={() => { setIsEditDialogOpen(false); setEditingRule(null); }}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E60026]/50"
                >
                  Odustani
                </Button>
              </DialogClose>
              <Button 
                onClick={handleUpdateRule}
                className="bg-[#E60026] text-white font-medium transition-all duration-300 transform hover:scale-[1.02] hover:bg-[#E60026]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E60026]/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Spremi Izmjene
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FuelPrices;