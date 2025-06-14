'use client';

import React, { useState, useEffect } from 'react';
import { ValveTestRecord, ValveTestType, CreateValveTestRecordPayload } from '@/types/valve';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { createValveTestRecord, updateValveTestRecord } from '@/lib/valveTestService';
import { format } from 'date-fns';
import { FaVial, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

interface ValveTestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  test?: ValveTestRecord;
  vehicleId: number;
  onSave: () => void;
  isEdit?: boolean;
}

const ValveTestDetailsModal: React.FC<ValveTestDetailsModalProps> = ({
  isOpen,
  onClose,
  test,
  vehicleId,
  onSave,
  isEdit = false
}) => {
  const [formData, setFormData] = useState<CreateValveTestRecordPayload>({
    vehicleId,
    testType: ValveTestType.ILPCV, // Default, can be changed by user
    testDate: format(new Date(), 'yyyy-MM-dd'),
    vehicleNumber: '',
    fuelHoseType: '',
    fuelHoseProductionDate: '',
    notes: '',

    // PREPERATION TEST
    preparationTestPressureAtZero: null,
    preparationTestPressureReading: null,

    // "HECPV" SURGE CONTROL TEST
    hecpvSurgeControlMaxFlowRate: null,
    hecpvSurgeControlMaxPressure: null,
    hecpvSurgeControlPressureReading: null,

    // RECORD OF SLOWLY TEST "HECPV"
    hecpvSlowlyTestFlowRate: null,
    hecpvSlowlyTestMaxPressure: null,
    hecpvSlowlyTestPressureAtNoFlow: null,
    hecpvSlowlyTestCreepTestPressure: null,

    // RECORD OF "ILPCV"
    ilpcvRecordFlowRate: null,
    ilpcvRecordMaxPressure: null,
    ilpcvRecordPressureAtNoFlow: null,
    ilpcvRecordCreepTestPressure: null,

    // Footer fields
    nextTestDate: '',
    placeOfPerformedTest: '',
    controlPerformedBy: '',
    approvedControlBy: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const FONT_NAME = 'NotoSans';

  const registerFont = (doc: jsPDF) => {
    const stripPrefix = (base64String: string) => {
      const prefix = 'data:font/ttf;base64,';
      if (base64String.startsWith(prefix)) {
        return base64String.substring(prefix.length);
      }
      const prefixGeneric = 'data:application/octet-stream;base64,'; // Ponekad se koristi i ovaj prefix
      if (base64String.startsWith(prefixGeneric)) {
        return base64String.substring(prefixGeneric.length);
      }
      return base64String;
    };

    try {
      if (notoSansRegularBase64) {
        const cleanedRegular = stripPrefix(notoSansRegularBase64);
        doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
        doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
      } else {
        console.error('Noto Sans Regular font data not loaded.');
        throw new Error('Noto Sans Regular font data not loaded.');
      }

      if (notoSansBoldBase64) {
        const cleanedBold = stripPrefix(notoSansBoldBase64);
        doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
        doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
      } else {
        console.error('Noto Sans Bold font data not loaded.');
        throw new Error('Noto Sans Bold font data not loaded.');
      }
      doc.setFont(FONT_NAME, 'normal');
    } catch (error) {
      console.error('Error registering NotoSans font:', error);
      toast.error('Greška pri učitavanju NotoSans fonta za PDF. PDF možda neće izgledati ispravno. Koristi se zamjenski font.');
      doc.setFont('helvetica', 'normal'); // Fallback
    }
  };

  const handleGenerateSingleTestPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    const doc = new jsPDF();
    registerFont(doc); // Više nije async

    const currentTestData = formData;
    const testIdForDisplay = test?.id ? test.id.toString() : 'Novi test';

    const margin = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const contentWidth = doc.internal.pageSize.getWidth() - 2 * margin;
    let yPosition = 20;

    const addField = (label: string, value: any) => {
      const fieldLabel = `${label}:`;
      let displayValue = value !== null && value !== undefined && value !== '' ? String(value) : 'N/A';
      
      if (label === 'Test Result' && typeof value === 'boolean') {
        displayValue = value ? 'Pass' : 'Fail';
      }
      if (label.includes('Date') && value) {
        try {
          displayValue = format(new Date(value), 'dd.MM.yyyy');
        } catch (e) { /* Keep original if formatting fails */ }
      }

      const textLines = doc.splitTextToSize(`${fieldLabel} ${displayValue}`, contentWidth);
      const fieldHeight = textLines.length * (doc.getLineHeight() / doc.internal.scaleFactor);

      if (yPosition + fieldHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = 20;
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(`(Nastavak za Test ID: ${testIdForDisplay})`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineSpacing;
      }
      doc.setFont(FONT_NAME, 'bold');
      doc.text(fieldLabel, margin, yPosition);
      doc.setFont(FONT_NAME, 'normal');
      const labelWidth = doc.getTextWidth(fieldLabel);
      doc.text(displayValue, margin + labelWidth + 2, yPosition, { maxWidth: contentWidth - labelWidth - 2 });
      yPosition += fieldHeight + (lineSpacing / 2);
    };

    // PDF Title
    doc.setFontSize(16);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Valve Test Report - ID: ${testIdForDisplay}`, margin, yPosition);
    yPosition += sectionSpacing;

    // --- General Information ---
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('General Information', margin, yPosition);
    yPosition += lineSpacing;
    doc.line(margin, yPosition - lineSpacing / 2.5, contentWidth + margin, yPosition - lineSpacing / 2.5);
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal');
    addField('Test Type', currentTestData.testType);
    addField('Test Date', currentTestData.testDate);
    addField('Vehicle Number', currentTestData.vehicleNumber);
    addField('Fuel Hose Type', currentTestData.fuelHoseType);
    addField('Fuel Hose Production Date', currentTestData.fuelHoseProductionDate);
    addField('Next Test Date', currentTestData.nextTestDate);
    addField('Place of Performed Test', currentTestData.placeOfPerformedTest);
    addField('Control Performed By', currentTestData.controlPerformedBy);
    addField('Approved Control By', currentTestData.approvedControlBy);
    yPosition += sectionSpacing;

    // --- Preparation Test Section ---
    if (currentTestData.preparationTestPressureAtZero !== null || currentTestData.preparationTestPressureReading !== null) {
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('Preparation Test', margin, yPosition);
      yPosition += lineSpacing;
      doc.line(margin, yPosition - lineSpacing / 2.5, contentWidth + margin, yPosition - lineSpacing / 2.5);
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      addField('Pressure at Zero Flow (bar)', currentTestData.preparationTestPressureAtZero);
      addField('Pressure Reading (bar)', currentTestData.preparationTestPressureReading);
      yPosition += sectionSpacing;
    }

    // --- HECPV Section ---
    if (currentTestData.testType === ValveTestType.HECPV) {
      const hasHecpvData = [
        currentTestData.hecpvTestPressure, currentTestData.hecpvTestPressureGauge,
        currentTestData.hecpvSurgeControlSetPressure, currentTestData.hecpvSurgeControlGauge,
        currentTestData.hecpvSurgeControlMaxFlowRate, currentTestData.hecpvSurgeControlMaxPressure,
        currentTestData.hecpvSurgeControlPressureReading, currentTestData.hecpvSurgeControlTestResult,
        currentTestData.hecpvSlowlyTestFlowRate, currentTestData.hecpvSlowlyTestMaxPressure,
        currentTestData.hecpvSlowlyTestPressureAtNoFlow, currentTestData.hecpvSlowlyTestCreepTestPressure
      ].some(value => value !== null && value !== undefined && (typeof value === 'string' ? value !== '' : true));

      if (hasHecpvData) {
        doc.setFontSize(12);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('HECPV Test Details', margin, yPosition);
        yPosition += lineSpacing;
        doc.line(margin, yPosition - lineSpacing / 2.5, contentWidth + margin, yPosition - lineSpacing / 2.5);
        
        doc.setFontSize(11);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('Test Procedure', margin + 5, yPosition);
        yPosition += lineSpacing;
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        addField('Test Pressure (bar)', currentTestData.hecpvTestPressure);
        addField('Test Pressure Gauge (ID)', currentTestData.hecpvTestPressureGauge);
        yPosition += lineSpacing * 0.5;

        doc.setFontSize(11);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('Surge Control Test', margin + 5, yPosition);
        yPosition += lineSpacing;
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        addField('Set Pressure (bar)', currentTestData.hecpvSurgeControlSetPressure);
        addField('Gauge (ID)', currentTestData.hecpvSurgeControlGauge);
        addField('Max. Flow Rate (L/min)', currentTestData.hecpvSurgeControlMaxFlowRate);
        addField('Max. Pressure (2-3s closing) (bar)', currentTestData.hecpvSurgeControlMaxPressure);
        addField('Pressure Reading (bar)', currentTestData.hecpvSurgeControlPressureReading);
        addField('Test Result', currentTestData.hecpvSurgeControlTestResult);
        yPosition += lineSpacing * 0.5;

        doc.setFontSize(11);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('Record of Slowly Test', margin + 5, yPosition);
        yPosition += lineSpacing;
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        addField('Flow Rate (L/min)', currentTestData.hecpvSlowlyTestFlowRate);
        addField('Max. Pressure (bar)', currentTestData.hecpvSlowlyTestMaxPressure);
        addField('Pressure at No Flow (bar)', currentTestData.hecpvSlowlyTestPressureAtNoFlow);
        addField('Creep Test Pressure (bar)', currentTestData.hecpvSlowlyTestCreepTestPressure);
        yPosition += sectionSpacing;
      }
    }

    // --- ILPCV Section ---
    if (currentTestData.testType === ValveTestType.ILPCV) {
      const hasIlpcvData = [
        currentTestData.ilpcvRecordFlowRate, currentTestData.ilpcvRecordMaxPressure,
        currentTestData.ilpcvRecordPressureAtNoFlow, currentTestData.ilpcvRecordCreepTestPressure
      ].some(value => value !== null && value !== undefined);

      if (hasIlpcvData) {
        doc.setFontSize(12);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('ILPCV Test Details', margin, yPosition);
        yPosition += lineSpacing;
        doc.line(margin, yPosition - lineSpacing / 2.5, contentWidth + margin, yPosition - lineSpacing / 2.5);
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        addField('Flow Rate (L/min)', currentTestData.ilpcvRecordFlowRate);
        addField('Max. Pressure (bar)', currentTestData.ilpcvRecordMaxPressure);
        addField('Pressure at No Flow (bar)', currentTestData.ilpcvRecordPressureAtNoFlow);
        addField('Creep Test Pressure (bar)', currentTestData.ilpcvRecordCreepTestPressure);
        yPosition += sectionSpacing;
      }
    }

    // --- Notes Section ---
    if (currentTestData.notes && currentTestData.notes.trim() !== '') {
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('Notes', margin, yPosition);
      yPosition += lineSpacing;
      doc.line(margin, yPosition - lineSpacing / 2.5, contentWidth + margin, yPosition - lineSpacing / 2.5);
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      const notesText = doc.splitTextToSize(currentTestData.notes, contentWidth - 5);
      const notesHeight = notesText.length * (doc.getLineHeight() / doc.internal.scaleFactor);
      if (yPosition + notesHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = 20;
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(`(Nastavak za Test ID: ${testIdForDisplay} - Notes)`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineSpacing;
      }
      doc.text(notesText, margin + 5, yPosition);
    }

    doc.save(`valve_test_report_${testIdForDisplay.replace(/\s+/g, '_')}.pdf`);
    setIsGeneratingPdf(false);
    toast.success('PDF izvještaj uspješno generiran!');
  };

  useEffect(() => {
    if (test) {
      // Format dates for form inputs
      const formattedTestDate = test.testDate ? format(new Date(test.testDate), 'yyyy-MM-dd') : '';
      const formattedFuelHoseDate = test.fuelHoseProductionDate ? format(new Date(test.fuelHoseProductionDate), 'yyyy-MM-dd') : '';
      const formattedNextTestDate = test.nextTestDate ? format(new Date(test.nextTestDate), 'yyyy-MM-dd') : '';
      
      setFormData({
        vehicleId: test.vehicleId,
        testType: test.testType as ValveTestType,
        testDate: formattedTestDate,
        vehicleNumber: test.vehicleNumber || '',
        fuelHoseType: test.fuelHoseType || '',
        fuelHoseProductionDate: formattedFuelHoseDate,
        notes: test.notes || '',
        preparationTestPressureAtZero: test.preparationTestPressureAtZero ?? 0,
        preparationTestPressureReading: test.preparationTestPressureReading ?? 0,
        hecpvSurgeControlMaxFlowRate: test.hecpvSurgeControlMaxFlowRate ?? 0,
        hecpvSurgeControlMaxPressure: test.hecpvSurgeControlMaxPressure ?? 0,
        hecpvSurgeControlPressureReading: test.hecpvSurgeControlPressureReading ?? 0,
        hecpvSlowlyTestFlowRate: test.hecpvSlowlyTestFlowRate ?? 0,
        hecpvSlowlyTestMaxPressure: test.hecpvSlowlyTestMaxPressure ?? 0,
        hecpvSlowlyTestPressureAtNoFlow: test.hecpvSlowlyTestPressureAtNoFlow ?? 0,
        hecpvSlowlyTestCreepTestPressure: test.hecpvSlowlyTestCreepTestPressure ?? 0,
        ilpcvRecordFlowRate: test.ilpcvRecordFlowRate ?? 0,
        ilpcvRecordMaxPressure: test.ilpcvRecordMaxPressure ?? 0,
        ilpcvRecordPressureAtNoFlow: test.ilpcvRecordPressureAtNoFlow ?? 0,
        ilpcvRecordCreepTestPressure: test.ilpcvRecordCreepTestPressure ?? 0,
        nextTestDate: formattedNextTestDate,
        placeOfPerformedTest: test.placeOfPerformedTest || '',
        controlPerformedBy: test.controlPerformedBy || '',
        approvedControlBy: test.approvedControlBy || '',
      });
    } else {
      // Initialize with default values
      setFormData({
        vehicleId,
        testType: ValveTestType.ILPCV,
        testDate: format(new Date(), 'yyyy-MM-dd'),
        vehicleNumber: '',
        fuelHoseType: '',
        fuelHoseProductionDate: '',
        notes: '',
        preparationTestPressureAtZero: 0,
        preparationTestPressureReading: 0,
        hecpvSurgeControlMaxFlowRate: 0,
        hecpvSurgeControlMaxPressure: 0,
        hecpvSurgeControlPressureReading: 0,
        hecpvSlowlyTestFlowRate: 0,
        hecpvSlowlyTestMaxPressure: 0,
        hecpvSlowlyTestPressureAtNoFlow: 0,
        hecpvSlowlyTestCreepTestPressure: 0,
        ilpcvRecordFlowRate: 0,
        ilpcvRecordMaxPressure: 0,
        ilpcvRecordPressureAtNoFlow: 0,
        ilpcvRecordCreepTestPressure: 0,
        nextTestDate: '',
        placeOfPerformedTest: '',
        controlPerformedBy: '',
        approvedControlBy: '',
      });
    }
  }, [test, vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Create a copy of formData with proper handling of numeric values
      const processedData = {
        ...formData,
        // Ensure numeric fields are properly formatted for API
        preparationTestPressureAtZero: formData.preparationTestPressureAtZero ?? 0,
        preparationTestPressureReading: formData.preparationTestPressureReading ?? 0,
      };
      
      // Add specific fields based on test type
      if (formData.testType === ValveTestType.HECPV) {
        // Map HECPV fields to the expected backend field names
        Object.assign(processedData, {
          // HECPV Surge Control Test fields
          hecpvSurgeControlMaxFlowRate: formData.hecpvSurgeControlMaxFlowRate ?? 0,
          hecpvSurgeControlMaxPressure: formData.hecpvSurgeControlMaxPressure ?? 0,
          hecpvSurgeControlPressureReading: formData.hecpvSurgeControlPressureReading ?? 0,
          
          // HECPV Slowly Test fields
          hecpvSlowlyTestFlowRate: formData.hecpvSlowlyTestFlowRate ?? 0,
          hecpvSlowlyTestMaxPressure: formData.hecpvSlowlyTestMaxPressure ?? 0,
          hecpvSlowlyTestPressureAtNoFlow: formData.hecpvSlowlyTestPressureAtNoFlow ?? 0,
          hecpvSlowlyTestCreepTestPressure: formData.hecpvSlowlyTestCreepTestPressure ?? 0,
          
          // Legacy field names that might be expected by the backend
          maxFlowRate: formData.hecpvSurgeControlMaxFlowRate ?? 0,
          maxPressureDuringClosing: formData.hecpvSurgeControlMaxPressure ?? 0,
          pressureReading: formData.hecpvSurgeControlPressureReading ?? 0,
          pressureAtZeroFlow: formData.hecpvSlowlyTestPressureAtNoFlow ?? 0,
          pressureAfterThirtySeconds: formData.hecpvSlowlyTestCreepTestPressure ?? 0,
          pressureIncrease: formData.hecpvSlowlyTestMaxPressure ?? 0
        });
      } else if (formData.testType === ValveTestType.ILPCV) {
        // Map ILPCV fields
        Object.assign(processedData, {
          ilpcvRecordFlowRate: formData.ilpcvRecordFlowRate ?? 0,
          ilpcvRecordMaxPressure: formData.ilpcvRecordMaxPressure ?? 0,
          ilpcvRecordPressureAtNoFlow: formData.ilpcvRecordPressureAtNoFlow ?? 0,
          ilpcvRecordCreepTestPressure: formData.ilpcvRecordCreepTestPressure ?? 0
        });
      }
      
      if (test && test.id) {
        await updateValveTestRecord(test.id, processedData);
        toast.success('Test ventila uspješno ažuriran');
      } else {
        await createValveTestRecord(processedData);
        toast.success('Test ventila uspješno kreiran');
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving valve test:', error);
      toast.error('Greška pri spremanju testa ventila');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

        <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-xl bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-gray-200 shadow-xl transition-all text-left align-middle">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] rounded-t-xl border-b border-neutral-700">
            <div className="flex items-center">
              <div className="bg-[#F08080]/20 p-2 rounded-lg border border-white/10 shadow-lg mr-3">
                <FaVial className="mr-3 h-6 w-6 text-[#F08080]" />
              </div>
              <Dialog.Title className="text-xl font-semibold leading-6 text-white flex items-center">
                {test && test.id ? 'Uredi test ventila' : 'Novi test ventila'}
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(100vh-220px)] overflow-y-auto styled-scrollbar text-gray-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <select
                  name="testType"
                  value={formData.testType}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  required
                  disabled={isSubmitting}
                >
                  <option value={ValveTestType.ILPCV} className="bg-neutral-800 text-gray-200">ILPCV</option>
                  <option value={ValveTestType.HECPV} className="bg-neutral-800 text-gray-200">HECPV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Datum testa
                </label>
                <input
                  type="date"
                  name="testDate"
                  value={formData.testDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Broj vozila
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Tip crijeva
                </label>
                <input
                  type="text"
                  name="fuelHoseType"
                  value={formData.fuelHoseType}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Datum proizvodnje crijeva
                </label>
                <input
                  type="date"
                  name="fuelHoseProductionDate"
                  value={formData.fuelHoseProductionDate || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="placeOfPerformedTest" className="block text-sm font-medium text-gray-400 mb-1">
                  Mjesto obavljenog ispitivanja
                </label>
                <input
                  type="text"
                  id="placeOfPerformedTest"
                  name="placeOfPerformedTest"
                  value={formData.placeOfPerformedTest || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="controlPerformedBy" className="block text-sm font-medium text-gray-400 mb-1">
                  Kontrolu obavio
                </label>
                <input
                  type="text"
                  id="controlPerformedBy"
                  name="controlPerformedBy"
                  value={formData.controlPerformedBy || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="approvedControlBy" className="block text-sm font-medium text-gray-400 mb-1">
                  Odobrio kontrolu
                </label>
                <input
                  type="text"
                  id="approvedControlBy"
                  name="approvedControlBy"
                  value={formData.approvedControlBy || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  disabled={isSubmitting}
                />
              </div>

              {/* Preparation Test Section */}
              <div className="space-y-6 pt-6 mt-6 border-t border-neutral-700">
                <h3 className="text-lg font-semibold text-[#F08080] mb-4">Priprema testa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="preparationTestPressureAtZero" className="block text-sm font-medium text-gray-400 mb-1">
                      Pritisak kod nultog protoka (bar)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="preparationTestPressureAtZero"
                      name="preparationTestPressureAtZero"
                      value={formData.preparationTestPressureAtZero ?? 0}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="preparationTestPressureReading" className="block text-sm font-medium text-gray-400 mb-1">
                      Očitani pritisak (bar)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="preparationTestPressureReading"
                      name="preparationTestPressureReading"
                      value={formData.preparationTestPressureReading ?? 0}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
              {/* End Preparation Test Section */}

              {/* HECPV Section */}
              {formData.testType === ValveTestType.HECPV && (
                <div className="space-y-6 pt-6 mt-6 border-t border-neutral-700">
                  <h3 className="text-lg font-semibold text-[#F08080] mb-4">HECPV - Postupak ispitivanja</h3>
                  
                  {/* Test Pressure for HECPV */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="hecpvTestPressure" className="block text-sm font-medium text-gray-400 mb-1">
                        Testni pritisak (bar)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="hecpvTestPressure"
                        name="hecpvTestPressure"
                        value={formData.hecpvTestPressure === null ? '' : formData.hecpvTestPressure}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="hecpvTestPressureGauge" className="block text-sm font-medium text-gray-400 mb-1">
                        Manometar za testni pritisak (ID)
                      </label>
                      <input
                        type="text"
                        id="hecpvTestPressureGauge"
                        name="hecpvTestPressureGauge"
                        value={formData.hecpvTestPressureGauge || ''}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Surge Control Subsection */}
                  <div className="pt-4 mt-4 border-t border-neutral-800">
                    <h4 className="text-md font-semibold text-gray-300 mb-3">Surge Control</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="hecpvSurgeControlSetPressure" className="block text-sm font-medium text-gray-400 mb-1">
                          Podešeni pritisak (bar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSurgeControlSetPressure"
                          name="hecpvSurgeControlSetPressure"
                          value={formData.hecpvSurgeControlSetPressure ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSurgeControlGauge" className="block text-sm font-medium text-gray-400 mb-1">
                          Manometar (ID)
                        </label>
                        <input
                          type="text"
                          id="hecpvSurgeControlGauge"
                          name="hecpvSurgeControlGauge"
                          value={formData.hecpvSurgeControlGauge || ''}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSurgeControlPressureReading" className="block text-sm font-medium text-gray-400 mb-1">
                          Zabilježeni pritisak (bar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSurgeControlPressureReading"
                          name="hecpvSurgeControlPressureReading"
                          value={formData.hecpvSurgeControlPressureReading ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSurgeControlMaxFlowRate" className="block text-sm font-medium text-gray-400 mb-1">
                          Max. protok (L/min)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSurgeControlMaxFlowRate"
                          name="hecpvSurgeControlMaxFlowRate"
                          value={formData.hecpvSurgeControlMaxFlowRate ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                       <div>
                        <label htmlFor="hecpvSurgeControlTestResult" className="block text-sm font-medium text-gray-400 mb-1">
                          Rezultat testa
                        </label>
                        <select
                          id="hecpvSurgeControlTestResult"
                          name="hecpvSurgeControlTestResult"
                          value={formData.hecpvSurgeControlTestResult || ''}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        >
                          <option value="" className="bg-neutral-800 text-gray-500">Odaberi rezultat</option>
                          <option value="Prolazi" className="bg-neutral-800 text-gray-200">Prolazi</option>
                          <option value="Ne prolazi" className="bg-neutral-800 text-gray-200">Ne prolazi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {/* End Surge Control Subsection */}

                  {/* Record of Slowly Test HECPV Subsection */}
                  <div className="pt-4 mt-4 border-t border-neutral-800">
                    <h4 className="text-md font-semibold text-gray-300 mb-3">Zapisnik sporog testa HECPV</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="hecpvSlowlyTestFlowRate" className="block text-sm font-medium text-gray-400 mb-1">
                          Protok (L/min)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSlowlyTestFlowRate"
                          name="hecpvSlowlyTestFlowRate"
                          value={formData.hecpvSlowlyTestFlowRate ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSlowlyTestMaxPressure" className="block text-sm font-medium text-gray-400 mb-1">
                          Max. pritisak (sporo zatvaranje) (bar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSlowlyTestMaxPressure"
                          name="hecpvSlowlyTestMaxPressure"
                          value={formData.hecpvSlowlyTestMaxPressure ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSlowlyTestPressureAtNoFlow" className="block text-sm font-medium text-gray-400 mb-1">
                          Pritisak kod protoka 0 (bar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSlowlyTestPressureAtNoFlow"
                          name="hecpvSlowlyTestPressureAtNoFlow"
                          value={formData.hecpvSlowlyTestPressureAtNoFlow ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="hecpvSlowlyTestCreepTestPressure" className="block text-sm font-medium text-gray-400 mb-1">
                          Pritisak nakon 30 sek. (zatvoren ventil A) (bar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="hecpvSlowlyTestCreepTestPressure"
                          name="hecpvSlowlyTestCreepTestPressure"
                          value={formData.hecpvSlowlyTestCreepTestPressure ?? 0}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                  {/* End Record of Slowly Test HECPV Subsection */}
                </div>
              )}
              {/* End HECPV Section */}

              {/* ILPCV Section */}
              {formData.testType === ValveTestType.ILPCV && (
                <div className="space-y-6 pt-6 mt-6 border-t border-neutral-700">
                  <h3 className="text-lg font-semibold text-[#F08080] mb-4">ILPCV - Postupak ispitivanja</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="ilpcvRecordFlowRate" className="block text-sm font-medium text-gray-400 mb-1">
                        Protok (L/min)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="ilpcvRecordFlowRate"
                        name="ilpcvRecordFlowRate"
                        value={formData.ilpcvRecordFlowRate ?? 0}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="ilpcvRecordMaxPressure" className="block text-sm font-medium text-gray-400 mb-1">
                        Max. pritisak (normalno zatvaranje) (bar)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="ilpcvRecordMaxPressure"
                        name="ilpcvRecordMaxPressure"
                        value={formData.ilpcvRecordMaxPressure ?? 0}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="ilpcvRecordPressureAtNoFlow" className="block text-sm font-medium text-gray-400 mb-1">
                        Pritisak kod protoka 0 (bar)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="ilpcvRecordPressureAtNoFlow"
                        name="ilpcvRecordPressureAtNoFlow"
                        value={formData.ilpcvRecordPressureAtNoFlow ?? 0}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="ilpcvRecordCreepTestPressure" className="block text-sm font-medium text-gray-400 mb-1">
                        Pritisak nakon 30 sek. (zatvoren ventil A) (bar)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="ilpcvRecordCreepTestPressure"
                        name="ilpcvRecordCreepTestPressure"
                        value={formData.ilpcvRecordCreepTestPressure ?? 0}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* End ILPCV Section */}

              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-400 mb-1">
                  Napomene / Primjedbe
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-[#F08080] focus:border-[#F08080] focus:bg-neutral-700/60 outline-none transition-all duration-150 backdrop-blur-sm shadow-sm"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 pb-2 border-t border-neutral-700 sticky bottom-0 bg-neutral-900/80 backdrop-blur-sm -mx-6 px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-neutral-700/60 hover:bg-neutral-600/80 border border-neutral-600 shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Odustani
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSingleTestPdf}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-blue-600/80 hover:bg-blue-700/90 border border-blue-500 shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting || isGeneratingPdf}
                >
                  <FaFilePdf className="mr-2 h-4 w-4" />
                  {isGeneratingPdf ? 'Generiranje...' : 'Download PDF'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#F08080]/80 hover:bg-[#F08080] border border-[#F08080]/90 shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F08080] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Spremanje...
                    </span>
                  ) : (test && test.id ? 'Ažuriraj Test' : 'Spremi Test')}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ValveTestDetailsModal;
