// src/types/jspdf-autotable.d.ts
import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF; // You can use more specific types for options if available
  }
}
