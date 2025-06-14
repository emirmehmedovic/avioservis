'use client';

import React from 'react';
import { Vehicle } from '@/types';
import { FaStickyNote } from 'react-icons/fa';
import Card from './Card';
import EditableItem from './EditableItem';

interface NotesSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({ vehicle, onUpdate }) => {
  return (
    <Card title="Napomene" icon={<FaStickyNote />} className="mb-6">
      <div className="grid grid-cols-1 gap-4">
        <EditableItem 
          label="Napomene" 
          value={vehicle.notes} 
          icon={<FaStickyNote />} 
          vehicleId={vehicle.id} 
          fieldName="notes" 
          type="textarea" 
          onUpdate={onUpdate} 
        />
      </div>
    </Card>
  );
};

export default NotesSection;
