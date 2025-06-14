import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/apiService';
import { toast } from 'react-hot-toast';
import ActivityFilters from './ActivityFilters';
import ActivityTable from './ActivityTable';
import Pagination from '../common/Pagination';

// Types
interface Activity {
  id: number;
  timestamp: string;
  userId: number | null;
  username: string;
  actionType: string;
  resourceType: string;
  resourceId: number | null;
  description: string;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
}

interface ActivityResponse {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const ActivityLog: React.FC = () => {
  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    username: '',
    actionType: '',
    resourceType: '',
    resourceId: '',
  });
  
  // Filter visibility state
  const [showFilters, setShowFilters] = useState(false);

  // Fetch activity types for filter options
  useEffect(() => {
    const fetchActivityTypes = async () => {
      try {
        const response = await fetchWithAuth<{ actionTypes: string[], resourceTypes: string[] }>('/api/activities/types');
        setActionTypes(response.actionTypes);
        setResourceTypes(response.resourceTypes);
      } catch (err) {
        console.error('Error fetching activity types:', err);
        toast.error('Greška pri dohvaćanju tipova aktivnosti');
      }
    };

    fetchActivityTypes();
  }, []);

  // Fetch activities with pagination and filters
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.username) params.append('username', filters.username);
        if (filters.actionType) params.append('actionType', filters.actionType);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.resourceId) params.append('resourceId', filters.resourceId);

        const response = await fetchWithAuth<ActivityResponse>(`/api/activities?${params.toString()}`);
        
        setActivities(response.activities);
        setTotalPages(response.pagination.pages);
        setTotalItems(response.pagination.total);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Greška pri dohvaćanju aktivnosti');
        toast.error('Greška pri dohvaćanju aktivnosti');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [currentPage, itemsPerPage, filters]);

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg">
      {/* Subtle red shadows in corners */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
      {/* Stats and Filter Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 relative z-10">
        <div className="flex flex-wrap gap-4 mb-4 md:mb-0">
          <div className="bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-3">
            <div className="text-xs text-white font-medium">Ukupno zapisa</div>
            <div className="text-xl font-bold text-white">{totalItems}</div>
          </div>
          
          <div className="bg-[#4FC3C7]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-3">
            <div className="text-xs text-white font-medium">Stranica</div>
            <div className="text-xl font-bold text-white">{currentPage} / {totalPages || 1}</div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Sakrij filtere' : 'Prikaži filtere'}
        </button>
      </div>
      
      {/* Filters - Collapsible */}
      {showFilters && (
        <div className="border-b border-white/10 bg-black/30 backdrop-blur-md">
          <ActivityFilters 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            actionTypes={actionTypes}
            resourceTypes={resourceTypes}
          />
        </div>
      )}
      
      {/* Activity Table */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e53e3e]"></div>
          <p className="mt-4 text-sm text-white/70">Učitavanje aktivnosti...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-64 p-6">
          <div className="rounded-full bg-[#e53e3e]/20 backdrop-blur-md border border-white/10 shadow-lg p-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e53e3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-3 text-white font-medium">{error}</p>
          <p className="text-sm text-white/70 mt-1">Molimo pokušajte ponovo kasnije</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 p-6">
          <div className="rounded-full bg-[#4FC3C7]/20 backdrop-blur-md border border-white/10 shadow-lg p-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4FC3C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="mt-3 text-white font-medium">Nema rezultata</p>
          <p className="text-sm text-white/70 mt-1">Nema aktivnosti koje odgovaraju zadanim filterima</p>
        </div>
      ) : (
        <>
          <ActivityTable activities={activities} />
          
          {/* Pagination */}
          <div className="border-t border-white/10 p-4 bg-black/30 backdrop-blur-md">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLog;
