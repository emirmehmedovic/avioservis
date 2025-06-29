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
  
  // Debug: Log when vehicle prop changes
  React.useEffect(() => {
    console.log('*** REPORTS SECTION: Vehicle prop updated ***');
    console.log('tip_filtera in ReportsSection:', vehicle.tip_filtera);
    console.log('Vehicle object timestamp:', vehicle.updated_at);
  }, [vehicle]);
  
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

  // Helper function to format values, handling empty strings, null, undefined, and Decimal objects
  const formatValue = (value: any, unit?: string) => {
    // Check for null, undefined, empty string, or whitespace-only string
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return 'N/A';
    }
    
    // Handle Prisma Decimal objects (they have toString() method)
    if (value && typeof value === 'object' && typeof value.toString === 'function') {
      const stringValue = value.toString().trim();
      if (stringValue === '' || stringValue === '0' || stringValue === 'null') {
        return 'N/A';
      }
      return unit ? `${stringValue} ${unit}` : stringValue;
    }
    
    // Convert to string and trim
    const stringValue = String(value).trim();
    if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
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
    console.log('PDF generation started for language:', language);
    console.log('Function called, vehicle object exists:', !!vehicle);
    
    try {
      // Debug: Log vehicle data to see what we're working with
      console.log('Vehicle data for PDF generation:', vehicle);
      
      // Test specifically tip_filtera since user says it's filled but shows as N/A
      console.log('*** TIP FILTERA ANALYSIS ***');
      console.log('tip_filtera value:', vehicle.tip_filtera);
      console.log('tip_filtera type:', typeof vehicle.tip_filtera);
      console.log('tip_filtera === null:', vehicle.tip_filtera === null);
      console.log('tip_filtera === undefined:', vehicle.tip_filtera === undefined);
      console.log('tip_filtera === "":', vehicle.tip_filtera === "");
      console.log('********************************');
      
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
      doc.text(formatValue(vehicle.chassis_number), valueX, yPos); yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Broj posude:' : 'Vessel Plate Number:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(formatValue(vehicle.vessel_plate_no), valueX, yPos); yPos += lineHeight;
      
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
          ['Kapacitet cisterne (L)', formatValue(vehicle.kapacitet_cisterne)],
          ['Broj odjeljaka', formatValue(vehicle.tanker_compartments)],
          ['Tip tanka', formatValue(vehicle.tanker_type)],
          ['Material cisterne', formatValue(vehicle.tanker_material)],
          ['Posljednja kalibracija cisterne', formatDate(vehicle.cisterna_zadnja_kalibracija)],
          ['Sljedeća kalibracija cisterne', formatDate(vehicle.cisterna_naredna_kalibracija)],
          ['Tip vozila', formatValue(vehicle.vehicle_type)],
          ['Vrsta punjenja', formatValue(vehicle.fueling_type)],
          ['Tip punjenja', formatValue(vehicle.loading_type)],
          ['Tip kamiona', formatValue(vehicle.truck_type)],
          ['Opis vozila', formatValue(vehicle.vehicle_description)],
          ['Posljednji pritisni test cisterne', formatDate(vehicle.tanker_last_pressure_test_date)],
          ['Sljedeći pritisni test cisterne', formatDate(vehicle.tanker_next_pressure_test_date)],
          ['Posljednji test protivpožarne sigurnosti', formatDate(vehicle.tanker_last_fire_safety_test_date)],
          ['Sljedeći test protivpožarne sigurnosti', formatDate(vehicle.tanker_next_fire_safety_test_date)]
        ] : [
          ['Tanker Capacity', formatValue(vehicle.kapacitet_cisterne, 'L')],
          ['Filter Type', formatValue(vehicle.tip_filtera)],
          ['Fueling Hoses', formatValue(vehicle.crijeva_za_tocenje)],
          ['Vehicle Type', formatValue(vehicle.vehicle_type)],
          ['Tanker Type', formatValue(vehicle.tanker_type)],
          ['Tanker Material', formatValue(vehicle.tanker_material)],
          ['Tanker Compartments', formatValue(vehicle.tanker_compartments)],
          ['Fueling Type', formatValue(vehicle.fueling_type)],
          ['Loading Type', formatValue(vehicle.loading_type)],
          ['Truck Type', formatValue(vehicle.truck_type)],
          ['Vehicle Description', formatValue(vehicle.vehicle_description)],
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
        ['Snaga motora (kW)', formatValue(vehicle.engine_power_kw)],
        ['Zapremina motora (ccm)', formatValue(vehicle.engine_displacement_ccm)],
        ['Broj osovina', formatValue(vehicle.axle_count)],
        ['Broj sjedišta', formatValue(vehicle.seat_count)],
        ['Nosivost (kg)', formatValue(vehicle.carrying_capacity_kg)],
        ['Proizvođač šasije', formatValue(vehicle.chassis_manufacturer)],
        ['Tip šasije', formatValue(vehicle.chassis_type)],
        ['Proizvođač nadogradnje', formatValue(vehicle.body_manufacturer)],
        ['Tip nadogradnje', formatValue(vehicle.body_type)],
        ['Euro norma', formatValue(vehicle.euro_norm)],
        ['Protok (L/min)', formatValue(vehicle.flow_rate)],
                 ['Licenca - datum izdavanja', formatDate(vehicle.licenca_datum_izdavanja)],
         ['Licenca važi do', formatDate(vehicle.licenca_vazi_do)],
         ['CWD datum isteka', formatDate(vehicle.datum_isteka_cwd)],
         ['Tromjesečni pregled - datum', formatDate(vehicle.tromjesecni_pregled_datum)],
         ['Tromjesečni pregled - važi do', formatDate(vehicle.tromjesecni_pregled_vazi_do)],
        ['Podržani tipovi goriva', formatValue(vehicle.supported_fuel_types)],
        ['Senzor tehnologija', formatValue(vehicle.sensor_technology)],
        ['Godina proizvodnje', formatValue(vehicle.year_of_manufacture)],
        ['Vrsta goriva', formatValue(vehicle.fuel_type)],
        ['Odgovorna osoba kontakt', formatValue(vehicle.responsible_person_contact)]
      ] : [
        ['Engine Power (kW)', formatValue(vehicle.engine_power_kw)],
        ['Engine Displacement (ccm)', formatValue(vehicle.engine_displacement_ccm)],
        ['Axle Count', formatValue(vehicle.axle_count)],
        ['Seat Count', formatValue(vehicle.seat_count)],
        ['Carrying Capacity (kg)', formatValue(vehicle.carrying_capacity_kg)],
        ['Chassis Manufacturer', formatValue(vehicle.chassis_manufacturer)],
        ['Chassis Type', formatValue(vehicle.chassis_type)],
        ['Body Manufacturer', formatValue(vehicle.body_manufacturer)],
        ['Body Type', formatValue(vehicle.body_type)],
        ['Euro Norm', formatValue(vehicle.euro_norm)],
        ['Flow Rate (L/min)', formatValue(vehicle.flow_rate)],
        ['License - Issue Date', formatDate(vehicle.licenca_datum_izdavanja)],
        ['License Valid Until', formatDate(vehicle.licenca_vazi_do)],
        ['CWD Expiry Date', formatDate(vehicle.datum_isteka_cwd)],
        ['Quarterly Inspection Date', formatDate(vehicle.tromjesecni_pregled_datum)],
        ['Quarterly Inspection Valid Until', formatDate(vehicle.tromjesecni_pregled_vazi_do)],
        ['Supported Fuel Types', formatValue(vehicle.supported_fuel_types)],
        ['Sensor Technology', formatValue(vehicle.sensor_technology)],
        ['Year of Manufacture', formatValue(vehicle.year_of_manufacture)],
        ['Fuel Type', formatValue(vehicle.fuel_type)],
        ['Responsible Person Contact', formatValue(vehicle.responsible_person_contact)]
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
        ['Filter instaliran', formatValue(vehicle.filter_installed ? 'Da' : 'Ne')],
        ['Tip filtera', formatValue(vehicle.tip_filtera)],
        ['Tip uložaka', formatValue(vehicle.filter_cartridge_type)],
        ['Standard filtriranja', formatValue(vehicle.filter_standard)],
        ['EWS', formatValue(vehicle.filter_ews)],
        ['Broj pločice', formatValue(vehicle.filter_type_plate_no)],
        ['Broj posude', formatValue(vehicle.vessel_plate_no)],
        ['Tip posude', formatValue(vehicle.filter_vessel_type)],
        ['Broj posude filtera', formatValue(vehicle.filter_vessel_number)],
                 ['Datum instalacije', formatDate(vehicle.filter_installation_date)],
         ['Datum isteka', formatDate(vehicle.filter_expiry_date)],
         ['Datum zamjene', formatDate(vehicle.filter_replacement_date)],
         ['Datum godišnjeg pregleda', formatDate(vehicle.filter_annual_inspection_date)],
         ['Sljedeći godišnji pregled', formatDate(vehicle.filter_next_annual_inspection_date)],
         ['Pregled EW senzora', formatDate(vehicle.filter_ew_sensor_inspection_date)],
        ['Tip separatora', formatValue(vehicle.filter_separator_type)],
        ['Sigurnosni ventil', formatValue(vehicle.filter_safety_valve)],
        ['Ventil ozrake', formatValue(vehicle.filter_vent_valve)],
        ['Period važenja (mjeseci)', formatValue(vehicle.filter_validity_period_months)]
      ] : [
        ['Filter Installed', formatValue(vehicle.filter_installed ? 'Yes' : 'No')],
        ['Filter Type', formatValue(vehicle.tip_filtera)],
        ['Cartridge Type', formatValue(vehicle.filter_cartridge_type)],
        ['Filter Standard', formatValue(vehicle.filter_standard)],
        ['EWS', formatValue(vehicle.filter_ews)],
        ['Type Plate Number', formatValue(vehicle.filter_type_plate_no)],
        ['Vessel Plate Number', formatValue(vehicle.vessel_plate_no)],
        ['Vessel Type', formatValue(vehicle.filter_vessel_type)],
        ['Filter Vessel Number', formatValue(vehicle.filter_vessel_number)],
                 ['Installation Date', formatDate(vehicle.filter_installation_date)],
         ['Expiry Date', formatDate(vehicle.filter_expiry_date)],
         ['Replacement Date', formatDate(vehicle.filter_replacement_date)],
         ['Annual Inspection Date', formatDate(vehicle.filter_annual_inspection_date)],
         ['Next Annual Inspection', formatDate(vehicle.filter_next_annual_inspection_date)],
         ['EW Sensor Inspection', formatDate(vehicle.filter_ew_sensor_inspection_date)],
        ['Separator Type', formatValue(vehicle.filter_separator_type)],
        ['Safety Valve', formatValue(vehicle.filter_safety_valve)],
        ['Vent Valve', formatValue(vehicle.filter_vent_valve)],
        ['Validity Period (months)', formatValue(vehicle.filter_validity_period_months)]
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
        ['Crijeva za točenje', formatValue(vehicle.crijeva_za_tocenje)],
        ['Broj crijeva HD38', formatValue(vehicle.broj_crijeva_hd38)],
        ['Godina proizvodnje HD38', formatValue(vehicle.godina_proizvodnje_crijeva_hd38)],
                 ['Test pritiska HD38', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd38)],
         ['Broj crijeva HD63', formatValue(vehicle.broj_crijeva_hd63)],
         ['Godina proizvodnje HD63', formatValue(vehicle.godina_proizvodnje_crijeva_hd63)],
         ['Test pritiska HD63', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd63)],
         ['Broj crijeva TW75', formatValue(vehicle.broj_crijeva_tw75)],
         ['Godina proizvodnje TW75', formatValue(vehicle.godina_proizvodnje_crijeva_tw75)],
         ['Test pritiska TW75', formatDate(vehicle.datum_testiranja_pritiska_crijeva_tw75)],
        ['Nadkrilno - standard', formatValue(vehicle.overwing_hose_standard)],
        ['Nadkrilno - tip', formatValue(vehicle.overwing_hose_type)],
        ['Nadkrilno - veličina', formatValue(vehicle.overwing_hose_size)],
        ['Nadkrilno - dužina', formatValue(vehicle.overwing_hose_length)],
        ['Nadkrilno - prečnik', formatValue(vehicle.overwing_hose_diameter)],
        ['Podkrilno - standard', formatValue(vehicle.underwing_hose_standard)],
        ['Podkrilno - tip', formatValue(vehicle.underwing_hose_type)],
        ['Podkrilno - veličina', formatValue(vehicle.underwing_hose_size)],
        ['Podkrilno - dužina', formatValue(vehicle.underwing_hose_length)],
        ['Podkrilno - prečnik', formatValue(vehicle.underwing_hose_diameter)]
      ] : [
        ['Fueling Hoses', formatValue(vehicle.crijeva_za_tocenje)],
        ['HD38 Hose Number', formatValue(vehicle.broj_crijeva_hd38)],
        ['HD38 Production Year', formatValue(vehicle.godina_proizvodnje_crijeva_hd38)],
                 ['HD38 Pressure Test', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd38)],
         ['HD63 Hose Number', formatValue(vehicle.broj_crijeva_hd63)],
         ['HD63 Production Year', formatValue(vehicle.godina_proizvodnje_crijeva_hd63)],
         ['HD63 Pressure Test', formatDate(vehicle.datum_testiranja_pritiska_crijeva_hd63)],
         ['TW75 Hose Number', formatValue(vehicle.broj_crijeva_tw75)],
         ['TW75 Production Year', formatValue(vehicle.godina_proizvodnje_crijeva_tw75)],
         ['TW75 Pressure Test', formatDate(vehicle.datum_testiranja_pritiska_crijeva_tw75)],
        ['Overwing - Standard', formatValue(vehicle.overwing_hose_standard)],
        ['Overwing - Type', formatValue(vehicle.overwing_hose_type)],
        ['Overwing - Size', formatValue(vehicle.overwing_hose_size)],
        ['Overwing - Length', formatValue(vehicle.overwing_hose_length)],
        ['Overwing - Diameter', formatValue(vehicle.overwing_hose_diameter)],
        ['Underwing - Standard', formatValue(vehicle.underwing_hose_standard)],
        ['Underwing - Type', formatValue(vehicle.underwing_hose_type)],
        ['Underwing - Size', formatValue(vehicle.underwing_hose_size)],
        ['Underwing - Length', formatValue(vehicle.underwing_hose_length)],
        ['Underwing - Diameter', formatValue(vehicle.underwing_hose_diameter)]
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
        // Osnovne kalibracije
        ['Posljednja kalibracija volumetra', formatDate(vehicle.last_volumeter_calibration_date)],
        ['Sljedeća kalibracija volumetra', formatDate(vehicle.next_volumeter_calibration_date)],
        ['Posljednja kalibracija manometra', formatDate(vehicle.last_manometer_calibration_date)],
        ['Sljedeća kalibracija manometra', formatDate(vehicle.next_manometer_calibration_date)],
        ['Posljednji test sigurnosti od požara', formatDate(vehicle.tanker_last_fire_safety_test_date)],
        ['Sljedeći test sigurnosti od požara', formatDate(vehicle.tanker_next_fire_safety_test_date)],
        
        // Tahograf kalibracija
        ['Posljednja kalibracija tahografa', formatDate(vehicle.tahograf_zadnja_kalibracija)],
        ['Sljedeća kalibracija tahografa', formatDate(vehicle.tahograf_naredna_kalibracija)],
        
        // Dodatni datumi kalibracije
        ['Datum kalibracije hidrometra', formatDate(vehicle.datum_kalibracije_hidrometra)],
        ['Datum kalibracije moment ključa', formatDate(vehicle.datum_kalibracije_moment_kljuca)],
        ['Datum kalibracije termometra', formatDate(vehicle.datum_kalibracije_termometra)],
        ['Datum kalibracije el. provodljivosti', formatDate(vehicle.datum_kalibracije_uredjaja_elektricne_provodljivosti)],
        ['Manometer kalibracija', formatDate(vehicle.manometer_calibration_date)],
        ['Manometer kalibracija važi do', formatDate(vehicle.manometer_calibration_valid_until)],
        ['Volumeter kalibracija', formatDate(vehicle.volumeter_kalibracija_datum)],
        ['Volumeter kalibracija važi do', formatDate(vehicle.volumeter_kalibracija_vazi_do)],
        
        // Kalibracije opreme
        ['Hemijski test na vodu', formatDate(vehicle.water_chemical_test_date)],
        ['Hemijski test važi do', formatDate(vehicle.water_chemical_test_valid_until)],
        ['Moment ključ kalibracija', formatDate(vehicle.torque_wrench_calibration_date)],
        ['Moment ključ važi do', formatDate(vehicle.torque_wrench_calibration_valid_until)],
        ['Termometar kalibracija', formatDate(vehicle.thermometer_calibration_date)],
        ['Termometar važi do', formatDate(vehicle.thermometer_calibration_valid_until)],
        ['Hidrometar kalibracija', formatDate(vehicle.hydrometer_calibration_date)],
        ['Hidrometar važi do', formatDate(vehicle.hydrometer_calibration_valid_until)],
        ['Mjerač el. provodljivosti', formatDate(vehicle.conductivity_meter_calibration_date)],
        ['Mjerač el. provodljivosti važi do', formatDate(vehicle.conductivity_meter_calibration_valid_until)],
        ['Mjerač otpora', formatDate(vehicle.resistance_meter_calibration_date)],
        ['Mjerač otpora važi do', formatDate(vehicle.resistance_meter_calibration_valid_until)],
        ['Glavni mjerač protoka', formatDate(vehicle.main_flow_meter_calibration_date)],
        ['Glavni mjerač protoka važi do', formatDate(vehicle.main_flow_meter_calibration_valid_until)]
      ] : [
                  // Basic calibrations
          ['Last Volumeter Calibration', formatDate(vehicle.last_volumeter_calibration_date)],
          ['Next Volumeter Calibration', formatDate(vehicle.next_volumeter_calibration_date)],
          ['Last Manometer Calibration', formatDate(vehicle.last_manometer_calibration_date)],
          ['Next Manometer Calibration', formatDate(vehicle.next_manometer_calibration_date)],
          ['Last Fire Safety Test', formatDate(vehicle.tanker_last_fire_safety_test_date)],
          ['Next Fire Safety Test', formatDate(vehicle.tanker_next_fire_safety_test_date)],
          
          // Tahograph calibration
          ['Last Tahograph Calibration', formatDate(vehicle.tahograf_zadnja_kalibracija)],
          ['Next Tahograph Calibration', formatDate(vehicle.tahograf_naredna_kalibracija)],
          
          // Additional calibration dates
          ['Hydrometer Calibration Date', formatDate(vehicle.datum_kalibracije_hidrometra)],
          ['Torque Wrench Calibration Date', formatDate(vehicle.datum_kalibracije_moment_kljuca)],
          ['Thermometer Calibration Date', formatDate(vehicle.datum_kalibracije_termometra)],
          ['Conductivity Device Calibration Date', formatDate(vehicle.datum_kalibracije_uredjaja_elektricne_provodljivosti)],
          ['Manometer Calibration', formatDate(vehicle.manometer_calibration_date)],
          ['Manometer Calibration Valid Until', formatDate(vehicle.manometer_calibration_valid_until)],
          ['Volumeter Calibration', formatDate(vehicle.volumeter_kalibracija_datum)],
        ['Volumeter Calibration Valid Until', formatDate(vehicle.volumeter_kalibracija_vazi_do)],
        
          // Equipment calibrations
          ['Water Chemical Test', formatDate(vehicle.water_chemical_test_date)],
        ['Water Chemical Test Valid Until', formatDate(vehicle.water_chemical_test_valid_until)],
          ['Torque Wrench Calibration', formatDate(vehicle.torque_wrench_calibration_date)],
          ['Torque Wrench Valid Until', formatDate(vehicle.torque_wrench_calibration_valid_until)],
          ['Thermometer Calibration', formatDate(vehicle.thermometer_calibration_date)],
          ['Thermometer Valid Until', formatDate(vehicle.thermometer_calibration_valid_until)],
          ['Hydrometer Calibration', formatDate(vehicle.hydrometer_calibration_date)],
          ['Hydrometer Valid Until', formatDate(vehicle.hydrometer_calibration_valid_until)],
          ['Conductivity Meter Calibration', formatDate(vehicle.conductivity_meter_calibration_date)],
          ['Conductivity Meter Valid Until', formatDate(vehicle.conductivity_meter_calibration_valid_until)],
          ['Resistance Meter Calibration', formatDate(vehicle.resistance_meter_calibration_date)],
          ['Resistance Meter Valid Until', formatDate(vehicle.resistance_meter_calibration_valid_until)],
          ['Main Flow Meter Calibration', formatDate(vehicle.main_flow_meter_calibration_date)],
          ['Main Flow Meter Valid Until', formatDate(vehicle.main_flow_meter_calibration_valid_until)]
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
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error: error
      });
      alert('Došlo je do greške prilikom generisanja PDF izvještaja: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
