import React, { useState, useEffect } from 'react';
import { Vehicle, ServiceRecord } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';
import { getVehicleServiceRecords } from '@/lib/apiService';

const FONT_NAME = 'NotoSans';

interface ReportsSectionProps {
  vehicle: Vehicle;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({ vehicle }) => {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch service records when component mounts
  useEffect(() => {
    const fetchServiceRecords = async () => {
      if (!vehicle.id) return;
      
      setIsLoading(true);
      try {
        const records = await getVehicleServiceRecords(vehicle.id.toString());
        setServiceRecords(records);
      } catch (err) {
        console.error("Greška pri dohvatanju servisnih zapisa:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServiceRecords();
  }, [vehicle.id]);
  // Format date for display in the PDF
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd.MM.yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to format values, handling empty strings, null, undefined
  const formatValue = (value: any, unit?: string) => {
    // Check for null, undefined, empty string, or whitespace-only string
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return 'N/A';
    }
    
    // Convert to string and trim
    const stringValue = String(value).trim();
    if (stringValue === '') {
      return 'N/A';
    }
    
    // Add unit if provided
    return unit ? `${stringValue} ${unit}` : stringValue;
  };
  
  // Register Noto Sans font for proper Bosnian character support
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

  // Helper function to format service record category
  const formatServiceCategory = (category: string, language: 'bs' | 'en' = 'bs'): string => {
    const categoryMapBS: Record<string, string> = {
      'REGULAR_MAINTENANCE': 'Redovno održavanje',
      'REPAIR': 'Popravka',
      'TECHNICAL_INSPECTION': 'Tehnički pregled',
      'FILTER_REPLACEMENT': 'Zamjena filtera',
      'HOSE_REPLACEMENT': 'Zamjena crijeva',
      'CALIBRATION': 'Kalibracija',
      'OTHER': 'Ostalo'
    };
    
    const categoryMapEN: Record<string, string> = {
      'REGULAR_MAINTENANCE': 'Regular Maintenance',
      'REPAIR': 'Repair',
      'TECHNICAL_INSPECTION': 'Technical Inspection',
      'FILTER_REPLACEMENT': 'Filter Replacement',
      'HOSE_REPLACEMENT': 'Hose Replacement',
      'CALIBRATION': 'Calibration',
      'OTHER': 'Other'
    };
    
    return language === 'bs' ? (categoryMapBS[category] || category) : (categoryMapEN[category] || category);
  };
  
  // Generate PDF report with all vehicle data
  const generatePdfReport = (language: 'bs' | 'en' = 'bs') => {
    try {
      // Debug: Log vehicle data to see what we're working with
      console.log('Vehicle data for PDF generation:', vehicle);
      console.log('chassis_number:', vehicle.chassis_number);
      console.log('vessel_plate_no:', vehicle.vessel_plate_no);
      console.log('euro_norm:', vehicle.euro_norm);
      console.log('flow_rate:', vehicle.flow_rate);
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Register Noto Sans font for proper Bosnian character support
      registerFont(doc);
      
      // Add title
      doc.setFontSize(18);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(language === 'bs' 
        ? `Izvještaj vozila: ${vehicle.vehicle_name}` 
        : `Vehicle Report: ${vehicle.vehicle_name}`, 14, 22);
      
      // Add registration and status
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(80, 80, 80);
      
      // Set up consistent layout
      let yPos = 35;
      const lineHeight = 7;
      const leftMargin = 14;
      const valueX = leftMargin + 50; // Fixed X coordinate for values
      
      // Add vehicle image if available
      const mainImage = vehicle.images?.find(img => img.isMainImage) || vehicle.images?.[0];
      if (mainImage) {
        try {
          const imageUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${mainImage.imageUrl}`;
          // Add image to the top right corner
          doc.addImage(imageUrl, 'JPEG', 140, 30, 50, 40);
          
          // Add image caption
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Slika vozila', 165, 75, { align: 'center' });
        } catch (imgError) {
          console.error('Error adding image to PDF:', imgError);
          // Continue without image if there's an error
        }
      }
      
      // Basic vehicle information
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(language === 'bs' ? 'Osnovni podaci' : 'Basic Information', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      
      // Display basic info with consistent formatting
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Registracija:' : 'Registration:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(vehicle.license_plate, valueX, yPos); yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Status:' : 'Status:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(vehicle.status, valueX, yPos); yPos += lineHeight;
      
      if (vehicle.company) {
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Firma:' : 'Company:', leftMargin, yPos);
        doc.setFont(FONT_NAME, 'normal');
        doc.text(vehicle.company.name, valueX, yPos); yPos += lineHeight;
      }
      
      if (vehicle.location) {
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Lokacija:' : 'Location:', leftMargin, yPos);
        doc.setFont(FONT_NAME, 'normal');
        doc.text(vehicle.location.name, valueX, yPos); yPos += lineHeight;
      }
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Broj šasije:' : 'Chassis Number:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(vehicle.chassis_number || 'N/A', valueX, yPos); yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Broj posude:' : 'Vessel Plate Number:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(vehicle.vessel_plate_no || 'N/A', valueX, yPos); yPos += lineHeight;
      
      if (vehicle.notes) {
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Napomene:' : 'Notes:', leftMargin, yPos);
        doc.setFont(FONT_NAME, 'normal');
        
        // Primjena prelamanja teksta za duge opise
        const maxWidth = doc.internal.pageSize.getWidth() - valueX - 15; // 15 je margina s desne strane
        const splitNotes = doc.splitTextToSize(vehicle.notes, maxWidth);
        doc.text(splitNotes, valueX, yPos);
        
        // Povećati yPos na osnovu broja linija teksta
        yPos += (splitNotes.length * lineHeight) + 2;
      }
      
      yPos += 5;
      
      // Tanker specific information if applicable
      if (vehicle.kapacitet_cisterne || vehicle.tip_filtera || vehicle.crijeva_za_tocenje) {
        doc.setFontSize(14);
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Informacije o cisterni' : 'Tanker Information', leftMargin, yPos);
        yPos += lineHeight + 3;
        doc.setFontSize(10);
        
        const tankerInfoData = language === 'bs' ? [
          ['Kapacitet cisterne', vehicle.kapacitet_cisterne ? `${vehicle.kapacitet_cisterne} L` : 'N/A'],
          ['Kapacitet (kg)', vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : 'N/A'],
          ['Trenutno stanje (kg)', vehicle.current_kg ? `${vehicle.current_kg} kg` : 'N/A'],
          ['Trenutno stanje (L)', vehicle.current_liters ? `${vehicle.current_liters} L` : 'N/A'],
          ['Tip filtera', vehicle.tip_filtera || 'N/A'],
          ['Crijeva za točenje', vehicle.crijeva_za_tocenje || 'N/A'],
          ['Tip vozila', vehicle.vehicle_type || 'N/A'],
          ['Tip cisterne', vehicle.tanker_type || 'N/A'],
          ['Material cisterne', vehicle.tanker_material || 'N/A'],
          ['Broj odjeljaka cisterne', vehicle.tanker_compartments?.toString() || 'N/A'],
          ['Vrsta punjenja', vehicle.fueling_type || 'N/A'],
          ['Tip punjenja', vehicle.loading_type || 'N/A'],
          ['Tip kamiona', vehicle.truck_type || 'N/A'],
          ['Opis vozila', vehicle.vehicle_description || 'N/A'],
          ['Zadnji pritisni test cisterne', formatDate(vehicle.tanker_last_pressure_test_date)],
          ['Sljedeći pritisni test cisterne', formatDate(vehicle.tanker_next_pressure_test_date)],
          ['Zadnji test protivpožarne sigurnosti', formatDate(vehicle.tanker_last_fire_safety_test_date)],
          ['Sljedeći test protivpožarne sigurnosti', formatDate(vehicle.tanker_next_fire_safety_test_date)]
        ] : [
          ['Tanker Capacity', vehicle.kapacitet_cisterne ? `${vehicle.kapacitet_cisterne} L` : 'N/A'],
          ['Capacity (kg)', vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : 'N/A'],
          ['Current Level (kg)', vehicle.current_kg ? `${vehicle.current_kg} kg` : 'N/A'],
          ['Current Level (L)', vehicle.current_liters ? `${vehicle.current_liters} L` : 'N/A'],
          ['Filter Type', vehicle.tip_filtera || 'N/A'],
          ['Fueling Hoses', vehicle.crijeva_za_tocenje || 'N/A'],
          ['Vehicle Type', vehicle.vehicle_type || 'N/A'],
          ['Tanker Type', vehicle.tanker_type || 'N/A'],
          ['Tanker Material', vehicle.tanker_material || 'N/A'],
          ['Tanker Compartments', vehicle.tanker_compartments?.toString() || 'N/A'],
          ['Fueling Type', vehicle.fueling_type || 'N/A'],
          ['Loading Type', vehicle.loading_type || 'N/A'],
          ['Truck Type', vehicle.truck_type || 'N/A'],
          ['Vehicle Description', vehicle.vehicle_description || 'N/A'],
          ['Last Tanker Pressure Test', formatDate(vehicle.tanker_last_pressure_test_date)],
          ['Next Tanker Pressure Test', formatDate(vehicle.tanker_next_pressure_test_date)],
          ['Last Fire Safety Test', formatDate(vehicle.tanker_last_fire_safety_test_date)],
          ['Next Fire Safety Test', formatDate(vehicle.tanker_next_fire_safety_test_date)]
        ];
        
        // Use autoTable as a standalone function
        autoTable(doc, {
          startY: yPos,
          head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
          body: tankerInfoData,
          theme: 'grid',
          headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
          styles: { font: FONT_NAME, fontSize: 9 }
        });
        
        // Update Y position
        yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      }
      
      // Dates and validity information
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('Datumi i validnost', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      
      const datesData = language === 'bs' ? [
        ['Registrovano do', formatDate(vehicle.registrovano_do)],
        ['ADR važi do', formatDate(vehicle.adr_vazi_do)],
        ['Periodični pregled važi do', formatDate(vehicle.periodicni_pregled_vazi_do)],
        ['Datum instalacije filtera', formatDate(vehicle.filter_installation_date)],
        ['Tromjesečni pregled datum', formatDate(vehicle.tromjesecni_pregled_datum)],
        ['Tromjesečni pregled važi do', formatDate(vehicle.tromjesecni_pregled_vazi_do)],
        ['Datum izdavanja licence', formatDate(vehicle.licenca_datum_izdavanja)]
      ] : [
        ['Registered Until', formatDate(vehicle.registrovano_do)],
        ['ADR Valid Until', formatDate(vehicle.adr_vazi_do)],
        ['Periodic Inspection Valid Until', formatDate(vehicle.periodicni_pregled_vazi_do)],
        ['Filter Installation Date', formatDate(vehicle.filter_installation_date)],
        ['Quarterly Inspection Date', formatDate(vehicle.tromjesecni_pregled_datum)],
        ['Quarterly Inspection Valid Until', formatDate(vehicle.tromjesecni_pregled_vazi_do)],
        ['License Issue Date', formatDate(vehicle.licenca_datum_izdavanja)]
      ];
      
      // Use autoTable as a standalone function
      autoTable(doc, {
        startY: yPos,
        head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
        body: datesData,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 }
      });
      
      // Update Y position
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      
      // Technical details section
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Tehnički detalji' : 'Technical Details', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      
      const technicalData = language === 'bs' ? [
        ['Euro norma', vehicle.euro_norm || 'N/A'],
        ['Protok', vehicle.flow_rate ? `${vehicle.flow_rate} L/min` : 'N/A'],
        ['Podržani tipovi goriva', vehicle.supported_fuel_types || 'N/A'],
        ['Senzor tehnologija', vehicle.sensor_technology || 'N/A'],
        ['Godina proizvodnje', vehicle.year_of_manufacture?.toString() || 'N/A'],
        ['Proizvođač šasije', vehicle.chassis_manufacturer || 'N/A'],
        ['Tip šasije', vehicle.chassis_type || 'N/A'],
        ['Proizvođač karoserije', vehicle.body_manufacturer || 'N/A'],
        ['Tip karoserije', vehicle.body_type || 'N/A'],
        ['Broj osovina', vehicle.axle_count?.toString() || 'N/A'],
        ['Nosivost (kg)', vehicle.carrying_capacity_kg?.toString() || 'N/A'],
        ['Snaga motora (kW)', vehicle.engine_power_kw?.toString() || 'N/A'],
        ['Zapremina motora (ccm)', vehicle.engine_displacement_ccm?.toString() || 'N/A'],
        ['Broj sjedišta', vehicle.seat_count?.toString() || 'N/A'],
        ['Vrsta goriva', vehicle.fuel_type || 'N/A'],
        ['Odgovorna osoba kontakt', vehicle.responsible_person_contact || 'N/A']
      ] : [
        ['Euro Norm', vehicle.euro_norm || 'N/A'],
        ['Flow Rate', vehicle.flow_rate ? `${vehicle.flow_rate} L/min` : 'N/A'],
        ['Supported Fuel Types', vehicle.supported_fuel_types || 'N/A'],
        ['Sensor Technology', vehicle.sensor_technology || 'N/A'],
        ['Year of Manufacture', vehicle.year_of_manufacture?.toString() || 'N/A'],
        ['Chassis Manufacturer', vehicle.chassis_manufacturer || 'N/A'],
        ['Chassis Type', vehicle.chassis_type || 'N/A'],
        ['Body Manufacturer', vehicle.body_manufacturer || 'N/A'],
        ['Body Type', vehicle.body_type || 'N/A'],
        ['Axle Count', vehicle.axle_count?.toString() || 'N/A'],
        ['Carrying Capacity (kg)', vehicle.carrying_capacity_kg?.toString() || 'N/A'],
        ['Engine Power (kW)', vehicle.engine_power_kw?.toString() || 'N/A'],
        ['Engine Displacement (ccm)', vehicle.engine_displacement_ccm?.toString() || 'N/A'],
        ['Seat Count', vehicle.seat_count?.toString() || 'N/A'],
        ['Fuel Type', vehicle.fuel_type || 'N/A'],
        ['Responsible Person Contact', vehicle.responsible_person_contact || 'N/A']
      ];
      
      // Use autoTable as a standalone function
      autoTable(doc, {
        startY: yPos,
        head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
        body: technicalData,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 }
      });
      
      // Update Y position
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      
      // Filter Data Section
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Podaci o filteru' : 'Filter Data', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      
      const filterData = language === 'bs' ? [
        ['Filter instaliran', vehicle.filter_installed ? 'Da' : 'Ne'],
        ['Datum instalacije filtera', formatDate(vehicle.filter_installation_date)],
        ['Period validnosti filtera (mjeseci)', vehicle.filter_validity_period_months?.toString() || 'N/A'],
        ['Broj pločice filtera', vehicle.filter_type_plate_no || 'N/A'],
        ['Datum zadnjeg godišnjeg pregleda', formatDate(vehicle.last_annual_inspection_date)],
        ['Standard filtriranja', vehicle.filter_standard || 'N/A'],
        ['Tip posude filtera', vehicle.filter_vessel_type || 'N/A'],
        ['Tip uložaka filtera', vehicle.filter_cartridge_type || 'N/A'],
        ['Tip separatora', vehicle.filter_separator_type || 'N/A'],
        ['EWS', vehicle.filter_ews || 'N/A'],
        ['Sigurnosni ventil', vehicle.filter_safety_valve || 'N/A'],
        ['Ventil ozrake', vehicle.filter_vent_valve || 'N/A'],
        ['Datum zamjene filtera', formatDate(vehicle.filter_replacement_date)],
        ['Broj posude filtera', vehicle.filter_vessel_number || 'N/A'],
        ['Datum godišnjeg pregleda filtera', formatDate(vehicle.filter_annual_inspection_date)],
        ['Datum sljedećeg godišnjeg pregleda', formatDate(vehicle.filter_next_annual_inspection_date)],
        ['Datum pregleda EW senzora', formatDate(vehicle.filter_ew_sensor_inspection_date)],
        ['Datum isteka filtera', formatDate(vehicle.filter_expiry_date)]
      ] : [
        ['Filter Installed', vehicle.filter_installed ? 'Yes' : 'No'],
        ['Filter Installation Date', formatDate(vehicle.filter_installation_date)],
        ['Filter Validity Period (months)', vehicle.filter_validity_period_months?.toString() || 'N/A'],
        ['Filter Plate Number', vehicle.filter_type_plate_no || 'N/A'],
        ['Last Annual Inspection Date', formatDate(vehicle.last_annual_inspection_date)],
        ['Filtration Standard', vehicle.filter_standard || 'N/A'],
        ['Filter Vessel Type', vehicle.filter_vessel_type || 'N/A'],
        ['Filter Cartridge Type', vehicle.filter_cartridge_type || 'N/A'],
        ['Separator Type', vehicle.filter_separator_type || 'N/A'],
        ['EWS', vehicle.filter_ews || 'N/A'],
        ['Safety Valve', vehicle.filter_safety_valve || 'N/A'],
        ['Vent Valve', vehicle.filter_vent_valve || 'N/A'],
        ['Filter Replacement Date', formatDate(vehicle.filter_replacement_date)],
        ['Filter Vessel Number', vehicle.filter_vessel_number || 'N/A'],
        ['Filter Annual Inspection Date', formatDate(vehicle.filter_annual_inspection_date)],
        ['Next Annual Inspection Date', formatDate(vehicle.filter_next_annual_inspection_date)],
        ['EW Sensor Inspection Date', formatDate(vehicle.filter_ew_sensor_inspection_date)],
        ['Filter Expiry Date', formatDate(vehicle.filter_expiry_date)]
      ];
      
      // Use autoTable as a standalone function
      autoTable(doc, {
        startY: yPos,
        head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
        body: filterData,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 }
      });
      
      // Update Y position
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      
      // Hoses Section
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Podaci o crijevima' : 'Hose Data', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      
      // Combine all hose data
      const hoseData = language === 'bs' ? [
        // HD63 Hoses
        ['Broj crijeva HD63', vehicle.broj_crijeva_hd63 || 'N/A'],
        ['Godina proizvodnje crijeva HD63', vehicle.godina_proizvodnje_crijeva_hd63?.toString() || 'N/A'],
        ['Datum testiranja pritiska crijeva HD63', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd63)],
        ['Datum zadnje zamjene crijeva HD63', formatDate(vehicle.last_hose_hd63_replacement_date)],
        ['Datum sljedeće zamjene crijeva HD63', formatDate(vehicle.next_hose_hd63_replacement_date)],
        
        // HD38 Hoses
        ['Broj crijeva HD38', vehicle.broj_crijeva_hd38 || 'N/A'],
        ['Godina proizvodnje crijeva HD38', vehicle.godina_proizvodnje_crijeva_hd38?.toString() || 'N/A'],
        ['Datum testiranja pritiska crijeva HD38', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd38)],
        ['Datum zadnje zamjene crijeva HD38', formatDate(vehicle.last_hose_hd38_replacement_date)],
        ['Datum sljedeće zamjene crijeva HD38', formatDate(vehicle.next_hose_hd38_replacement_date)],
        
        // TW75 Hoses
        ['Broj crijeva TW75', vehicle.broj_crijeva_tw75 || 'N/A'],
        ['Godina proizvodnje crijeva TW75', vehicle.godina_proizvodnje_crijeva_tw75?.toString() || 'N/A'],
        ['Datum testiranja pritiska crijeva TW75', formatDate(vehicle.datum_testiranja_pritiska_crijeva_tw75)],
        ['Datum zadnje zamjene crijeva TW75', formatDate(vehicle.last_hose_tw75_replacement_date)],
        ['Datum sljedeće zamjene crijeva TW75', formatDate(vehicle.next_hose_tw75_replacement_date)],
        
        // Leak test
        ['Datum zadnjeg testa curenja crijeva', formatDate(vehicle.last_hose_leak_test_date)],
        ['Datum sljedećeg testa curenja crijeva', formatDate(vehicle.next_hose_leak_test_date)],
        
        // Underwing hoses
        ['Standard podkrilnog crijeva', vehicle.underwing_hose_standard || 'N/A'],
        ['Tip podkrilnog crijeva', vehicle.underwing_hose_type || 'N/A'],
        ['Veličina podkrilnog crijeva', vehicle.underwing_hose_size || 'N/A'],
        ['Dužina podkrilnog crijeva', vehicle.underwing_hose_length || 'N/A'],
        ['Promjer podkrilnog crijeva', vehicle.underwing_hose_diameter || 'N/A'],
        ['Datum proizvodnje podkrilnog crijeva', formatDate(vehicle.underwing_hose_production_date)],
        ['Datum instalacije podkrilnog crijeva', formatDate(vehicle.underwing_hose_installation_date)],
        ['Životni vijek podkrilnog crijeva', vehicle.underwing_hose_lifespan || 'N/A'],
        ['Datum testa podkrilnog crijeva', formatDate(vehicle.underwing_hose_test_date)],
        
        // Overwing hoses
        ['Standard nadkrilnog crijeva', vehicle.overwing_hose_standard || 'N/A'],
        ['Tip nadkrilnog crijeva', vehicle.overwing_hose_type || 'N/A'],
        ['Veličina nadkrilnog crijeva', vehicle.overwing_hose_size || 'N/A'],
        ['Dužina nadkrilnog crijeva', vehicle.overwing_hose_length || 'N/A'],
        ['Promjer nadkrilnog crijeva', vehicle.overwing_hose_diameter || 'N/A'],
        ['Datum proizvodnje nadkrilnog crijeva', formatDate(vehicle.overwing_hose_production_date)],
        ['Datum instalacije nadkrilnog crijeva', formatDate(vehicle.overwing_hose_installation_date)],
        ['Životni vijek nadkrilnog crijeva', vehicle.overwing_hose_lifespan || 'N/A'],
        ['Datum testa nadkrilnog crijeva', formatDate(vehicle.overwing_hose_test_date)]
      ] : [
        // HD63 Hoses
        ['Number of HD63 Hoses', vehicle.broj_crijeva_hd63 || 'N/A'],
        ['HD63 Hose Production Year', vehicle.godina_proizvodnje_crijeva_hd63?.toString() || 'N/A'],
        ['HD63 Hose Pressure Test Date', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd63)],
        ['HD63 Hose Last Replacement Date', formatDate(vehicle.last_hose_hd63_replacement_date)],
        ['HD63 Hose Next Replacement Date', formatDate(vehicle.next_hose_hd63_replacement_date)],
        
        // HD38 Hoses
        ['Number of HD38 Hoses', vehicle.broj_crijeva_hd38 || 'N/A'],
        ['HD38 Hose Production Year', vehicle.godina_proizvodnje_crijeva_hd38?.toString() || 'N/A'],
        ['HD38 Hose Pressure Test Date', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd38)],
        ['HD38 Hose Last Replacement Date', formatDate(vehicle.last_hose_hd38_replacement_date)],
        ['HD38 Hose Next Replacement Date', formatDate(vehicle.next_hose_hd38_replacement_date)],
        
        // TW75 Hoses
        ['Number of TW75 Hoses', vehicle.broj_crijeva_tw75 || 'N/A'],
        ['TW75 Hose Production Year', vehicle.godina_proizvodnje_crijeva_tw75?.toString() || 'N/A'],
        ['TW75 Hose Pressure Test Date', formatDate(vehicle.datum_testiranja_pritiska_crijeva_tw75)],
        ['TW75 Hose Last Replacement Date', formatDate(vehicle.last_hose_tw75_replacement_date)],
        ['TW75 Hose Next Replacement Date', formatDate(vehicle.next_hose_tw75_replacement_date)],
        
        // Leak test
        ['Last Hose Leak Test Date', formatDate(vehicle.last_hose_leak_test_date)],
        ['Next Hose Leak Test Date', formatDate(vehicle.next_hose_leak_test_date)],
        
        // Underwing hoses
        ['Underwing Hose Standard', vehicle.underwing_hose_standard || 'N/A'],
        ['Underwing Hose Type', vehicle.underwing_hose_type || 'N/A'],
        ['Underwing Hose Size', vehicle.underwing_hose_size || 'N/A'],
        ['Underwing Hose Length', vehicle.underwing_hose_length || 'N/A'],
        ['Underwing Hose Diameter', vehicle.underwing_hose_diameter || 'N/A'],
        ['Underwing Hose Production Date', formatDate(vehicle.underwing_hose_production_date)],
        ['Underwing Hose Installation Date', formatDate(vehicle.underwing_hose_installation_date)],
        ['Underwing Hose Lifespan', vehicle.underwing_hose_lifespan || 'N/A'],
        ['Underwing Hose Test Date', formatDate(vehicle.underwing_hose_test_date)],
        
        // Overwing hoses
        ['Overwing Hose Standard', vehicle.overwing_hose_standard || 'N/A'],
        ['Overwing Hose Type', vehicle.overwing_hose_type || 'N/A'],
        ['Overwing Hose Size', vehicle.overwing_hose_size || 'N/A'],
        ['Overwing Hose Length', vehicle.overwing_hose_length || 'N/A'],
        ['Overwing Hose Diameter', vehicle.overwing_hose_diameter || 'N/A'],
        ['Overwing Hose Production Date', formatDate(vehicle.overwing_hose_production_date)],
        ['Overwing Hose Installation Date', formatDate(vehicle.overwing_hose_installation_date)],
        ['Overwing Hose Lifespan', vehicle.overwing_hose_lifespan || 'N/A'],
        ['Overwing Hose Test Date', formatDate(vehicle.overwing_hose_test_date)]
      ];
      
      // Use autoTable as a standalone function
      autoTable(doc, {
        startY: yPos,
        head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
        body: hoseData,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 }
      });
      
      // Update Y position
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      
      // Calibration Section
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Podaci o kalibracijama' : 'Calibration Data', leftMargin, yPos);
      yPos += lineHeight + 3;
      doc.setFontSize(10);
      
      const calibrationData = language === 'bs' ? [
        // Volumeter calibrations
        ['Datum zadnje kalibracije volumetra', formatDate(vehicle.last_volumeter_calibration_date)],
        ['Datum sljedeće kalibracije volumetra', formatDate(vehicle.next_volumeter_calibration_date)],
        ['Datum kalibracije volumetra', formatDate(vehicle.volumeter_kalibracija_datum)],
        ['Kalibracija volumetra važi do', formatDate(vehicle.volumeter_kalibracija_vazi_do)],
        
        // Manometer calibrations
        ['Datum zadnje kalibracije manometra', formatDate(vehicle.last_manometer_calibration_date)],
        ['Datum sljedeće kalibracije manometra', formatDate(vehicle.next_manometer_calibration_date)],
        ['Datum kalibracije manometra', formatDate(vehicle.manometer_calibration_date)],
        ['Kalibracija manometra važi do', formatDate(vehicle.manometer_calibration_valid_until)],
        
        // HECPV/ILCPV tests
        ['Datum zadnjeg HECPV/ILCPV testa', formatDate(vehicle.last_hecpv_ilcpv_test_date)],
        ['Datum sljedećeg HECPV/ILCPV testa', formatDate(vehicle.next_hecpv_ilcpv_test_date)],
        
        // 6-month checks
        ['Datum zadnje 6-mjesečne provjere', formatDate(vehicle.last_6_month_check_date)],
        ['Datum sljedeće 6-mjesečne provjere', formatDate(vehicle.next_6_month_check_date)],
        
        // Tachograph calibrations
        ['Zadnja kalibracija tahografa', formatDate(vehicle.tahograf_zadnja_kalibracija)],
        ['Naredna kalibracija tahografa', formatDate(vehicle.tahograf_naredna_kalibracija)],
        
        // Tanker calibrations
        ['Zadnja kalibracija cisterne', formatDate(vehicle.cisterna_zadnja_kalibracija)],
        ['Naredna kalibracija cisterne', formatDate(vehicle.cisterna_naredna_kalibracija)],
        
        // Water chemical tests
        ['Datum hemijskog testa vode', formatDate(vehicle.water_chemical_test_date)],
        ['Hemijski test vode važi do', formatDate(vehicle.water_chemical_test_valid_until)],
        
        // Torque wrench calibrations
        ['Datum kalibracije moment ključa', formatDate(vehicle.torque_wrench_calibration_date || vehicle.datum_kalibracije_moment_kljuca)],
        ['Kalibracija moment ključa važi do', formatDate(vehicle.torque_wrench_calibration_valid_until)],
        
        // Thermometer calibrations
        ['Datum kalibracije termometra', formatDate(vehicle.thermometer_calibration_date || vehicle.datum_kalibracije_termometra)],
        ['Kalibracija termometra važi do', formatDate(vehicle.thermometer_calibration_valid_until)],
        
        // Hydrometer calibrations
        ['Datum kalibracije hidrometra', formatDate(vehicle.hydrometer_calibration_date || vehicle.datum_kalibracije_hidrometra)],
        ['Kalibracija hidrometra važi do', formatDate(vehicle.hydrometer_calibration_valid_until)],
        
        // Conductivity meter calibrations
        ['Datum kalibracije uređaja električne provodljivosti', formatDate(vehicle.conductivity_meter_calibration_date || vehicle.datum_kalibracije_uredjaja_elektricne_provodljivosti)],
        ['Kalibracija uređaja električne provodljivosti važi do', formatDate(vehicle.conductivity_meter_calibration_valid_until)],
        
        // Resistance meter calibrations
        ['Datum kalibracije mjerača otpora', formatDate(vehicle.resistance_meter_calibration_date)],
        ['Kalibracija mjerača otpora važi do', formatDate(vehicle.resistance_meter_calibration_valid_until)],
        
        // Main flow meter calibrations
        ['Datum kalibracije glavnog mjerača protoka', formatDate(vehicle.main_flow_meter_calibration_date)],
        ['Kalibracija glavnog mjerača protoka važi do', formatDate(vehicle.main_flow_meter_calibration_valid_until)],
        
        // CWD expiry date
        ['Datum isteka CWD', formatDate(vehicle.datum_isteka_cwd)]
      ] : [
        // Volumeter calibrations
        ['Last Volumeter Calibration Date', formatDate(vehicle.last_volumeter_calibration_date)],
        ['Next Volumeter Calibration Date', formatDate(vehicle.next_volumeter_calibration_date)],
        ['Volumeter Calibration Date', formatDate(vehicle.volumeter_kalibracija_datum)],
        ['Volumeter Calibration Valid Until', formatDate(vehicle.volumeter_kalibracija_vazi_do)],
        
        // Manometer calibrations
        ['Last Manometer Calibration Date', formatDate(vehicle.last_manometer_calibration_date)],
        ['Next Manometer Calibration Date', formatDate(vehicle.next_manometer_calibration_date)],
        ['Manometer Calibration Date', formatDate(vehicle.manometer_calibration_date)],
        ['Manometer Calibration Valid Until', formatDate(vehicle.manometer_calibration_valid_until)],
        
        // HECPV/ILCPV tests
        ['Last HECPV/ILCPV Test Date', formatDate(vehicle.last_hecpv_ilcpv_test_date)],
        ['Next HECPV/ILCPV Test Date', formatDate(vehicle.next_hecpv_ilcpv_test_date)],
        
        // 6-month checks
        ['Last 6-Month Check Date', formatDate(vehicle.last_6_month_check_date)],
        ['Next 6-Month Check Date', formatDate(vehicle.next_6_month_check_date)],
        
        // Tachograph calibrations
        ['Last Tachograph Calibration', formatDate(vehicle.tahograf_zadnja_kalibracija)],
        ['Next Tachograph Calibration', formatDate(vehicle.tahograf_naredna_kalibracija)],
        
        // Tanker calibrations
        ['Last Tanker Calibration', formatDate(vehicle.cisterna_zadnja_kalibracija)],
        ['Next Tanker Calibration', formatDate(vehicle.cisterna_naredna_kalibracija)],
        
        // Water chemical tests
        ['Water Chemical Test Date', formatDate(vehicle.water_chemical_test_date)],
        ['Water Chemical Test Valid Until', formatDate(vehicle.water_chemical_test_valid_until)],
        
        // Torque wrench calibrations
        ['Torque Wrench Calibration Date', formatDate(vehicle.torque_wrench_calibration_date || vehicle.datum_kalibracije_moment_kljuca)],
        ['Torque Wrench Calibration Valid Until', formatDate(vehicle.torque_wrench_calibration_valid_until)],
        
        // Thermometer calibrations
        ['Thermometer Calibration Date', formatDate(vehicle.thermometer_calibration_date || vehicle.datum_kalibracije_termometra)],
        ['Thermometer Calibration Valid Until', formatDate(vehicle.thermometer_calibration_valid_until)],
        
        // Hydrometer calibrations
        ['Hydrometer Calibration Date', formatDate(vehicle.hydrometer_calibration_date || vehicle.datum_kalibracije_hidrometra)],
        ['Hydrometer Calibration Valid Until', formatDate(vehicle.hydrometer_calibration_valid_until)],
        
        // Conductivity meter calibrations
        ['Conductivity Meter Calibration Date', formatDate(vehicle.conductivity_meter_calibration_date || vehicle.datum_kalibracije_uredjaja_elektricne_provodljivosti)],
        ['Conductivity Meter Calibration Valid Until', formatDate(vehicle.conductivity_meter_calibration_valid_until)],
        
        // Resistance meter calibrations
        ['Resistance Meter Calibration Date', formatDate(vehicle.resistance_meter_calibration_date)],
        ['Resistance Meter Calibration Valid Until', formatDate(vehicle.resistance_meter_calibration_valid_until)],
        
        // Main flow meter calibrations
        ['Main Flow Meter Calibration Date', formatDate(vehicle.main_flow_meter_calibration_date)],
        ['Main Flow Meter Calibration Valid Until', formatDate(vehicle.main_flow_meter_calibration_valid_until)],
        
        // CWD expiry date
        ['CWD Expiry Date', formatDate(vehicle.datum_isteka_cwd)]
      ];
      
      // Use autoTable as a standalone function
      autoTable(doc, {
        startY: yPos,
        head: [language === 'bs' ? ['Polje', 'Vrijednost'] : ['Field', 'Value']],
        body: calibrationData,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 }
      });
      
      // Update Y position
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      
      // Service Records Section
      if (serviceRecords.length > 0) {
        doc.setFontSize(14);
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Servisni zapisi' : 'Service Records', leftMargin, yPos);
        yPos += lineHeight + 3;
        doc.setFontSize(10);
        
        // Prepare service records data for table
        const serviceRecordsData = serviceRecords.map(record => [
          formatDate(record.serviceDate),
          formatServiceCategory(record.category, language),
          record.description,
          record.serviceItems?.length 
            ? language === 'bs' 
              ? `${record.serviceItems.length} stavki` 
              : `${record.serviceItems.length} items`
            : language === 'bs' ? 'Nema stavki' : 'No items'
        ]);
        
        // Use autoTable as a standalone function
        autoTable(doc, {
          startY: yPos,
          head: language === 'bs' 
            ? [['Datum', 'Kategorija', 'Opis', 'Stavke']]
            : [['Date', 'Category', 'Description', 'Items']],
          body: serviceRecordsData,
          theme: 'grid',
          headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
          styles: { font: FONT_NAME, fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 40 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 30 }
          }
        });
        
        // Update Y position
        yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;
      }
      
      // Add page number
      // Use type assertion to access internal jsPDF methods
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(language === 'bs' 
        ? `Stranica ${i} od ${pageCount}` 
        : `Page ${i} of ${pageCount}`, 
        doc.internal.pageSize.getWidth() - 30, 
        doc.internal.pageSize.getHeight() - 10);
      }
      
      // Add generation date at the bottom
      doc.setPage(pageCount);
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(language === 'bs' 
        ? `Izvještaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')}` 
        : `Report generated: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 
        14, doc.internal.pageSize.getHeight() - 10);
      
      // Save the PDF
      doc.save(language === 'bs' 
        ? `Izvjestaj_${vehicle.vehicle_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Report_${vehicle.vehicle_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Došlo je do greške prilikom generisanja PDF izvještaja.');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/60 to-[#1a1a1a]/80 shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1 text-white">Izvještaji vozila</h3>
              <p className="text-sm text-white/70">Generirajte izvještaje o vozilu u različitim formatima</p>
            </div>
            <div className="mt-3 md:mt-0 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => generatePdfReport('bs')}
                className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all duration-200 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    <span>Učitavanje...</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} className="mr-2" />
                    <span>Generiši PDF (BS)</span>
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => generatePdfReport('en')}
                className="backdrop-blur-md bg-[#6495ED]/30 border border-white/20 text-white shadow-lg hover:bg-[#6495ED]/40 transition-all duration-200 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} className="mr-2" />
                    <span>Generate PDF (EN)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F08080]/20 flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-[#F08080]" />
              </div>
              <div>
                <h4 className="text-white font-medium">PDF izvještaj vozila</h4>
                <p className="text-sm text-white/70 mt-1">
                  Izvještaj sadrži sve podatke o vozilu, uključujući osnovne informacije, podatke o cisterni,
                  datume validnosti i tehničke specifikacije.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsSection;
