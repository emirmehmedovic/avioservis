import { 
  FaCar,
  FaTools,
  FaGasPump,
  FaFilter,
  FaShippingFast,
  FaBalanceScale,
  FaStickyNote,
  FaFileMedical,
  FaCamera,
  FaChartBar
} from 'react-icons/fa';

export const sections = [
  { key: 'general', label: 'Opšti podaci', icon: FaCar },
  { key: 'technical', label: 'Tehnički podaci', icon: FaTools },
  { key: 'tanker', label: 'Specifikacija cisterne', icon: FaGasPump },
  { key: 'filter', label: 'Filter podaci', icon: FaFilter },
  { key: 'hoses', label: 'Crijeva', icon: FaShippingFast },
  { key: 'calibration', label: 'Kalibracije', icon: FaBalanceScale },
  { key: 'notes', label: 'Napomene', icon: FaStickyNote },
  { key: 'service', label: 'Servisni zapisi', icon: FaFileMedical },
  { key: 'images', label: 'Slike vozila', icon: FaCamera },
  { key: 'reports', label: 'Izvještaji', icon: FaChartBar },
];
