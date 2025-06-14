import React, { useState } from 'react';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

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

interface ActivityTableProps {
  activities: Activity[];
}

const ActivityTable: React.FC<ActivityTableProps> = ({ activities }) => {
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  // Toggle expanded row
  const toggleExpand = (id: number) => {
    if (expandedActivity === id) {
      setExpandedActivity(null);
    } else {
      setExpandedActivity(id);
    }
  };

  // Format action type for display
  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ');
  };

  // Get badge color based on action type
  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('DELETE')) {
      return 'bg-red-100 text-red-800';
    } else if (actionType.includes('CREATE')) {
      return 'bg-green-100 text-green-800';
    } else if (actionType.includes('UPDATE')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Vrijeme</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Korisnik</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Akcija</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Resurs</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Opis</th>
            <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">Detalji</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((activity) => (
            <React.Fragment key={activity.id}>
              <tr className={expandedActivity === activity.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'} data-activity-id={activity.id}>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  <div className="flex flex-col">
                    <span>{format(new Date(activity.timestamp), 'dd.MM.yyyy', { locale: hr })}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(activity.timestamp), 'HH:mm:ss', { locale: hr })}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="font-medium text-gray-900 dark:text-gray-200">{activity.username}</div>
                    {activity.user && (
                      <span className="mt-1 sm:mt-0 sm:ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {activity.user.role}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 block sm:hidden mt-1">
                      {format(new Date(activity.timestamp), 'dd.MM.yyyy HH:mm', { locale: hr })}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(activity.actionType)}`}>
                    {formatActionType(activity.actionType)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  <div className="flex items-center">
                    <span className="truncate max-w-[100px]">{activity.resourceType}</span>
                    {activity.resourceId && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">#{activity.resourceId}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-md truncate hidden lg:table-cell">
                  {activity.description}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-center">
                  <button
                    onClick={() => toggleExpand(activity.id)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 focus:outline-none transition-colors p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    aria-label={expandedActivity === activity.id ? 'Sakrij detalje' : 'Prikaži detalje'}
                  >
                    {expandedActivity === activity.id ? (
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
              
              {/* Expanded details row */}
              {expandedActivity === activity.id && (
                <tr className="bg-indigo-50/50 dark:bg-indigo-900/20">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="text-xs">
                      <div className="flex items-center mb-3">
                        <div className="w-1 h-5 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2"></div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-200">Detalji aktivnosti</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                          <h5 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Osnovne informacije</h5>
                          <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
                            <dt className="text-gray-500 dark:text-gray-400">ID:</dt>
                            <dd className="col-span-2 text-gray-900 dark:text-gray-200">{activity.id}</dd>
                            
                            <dt className="text-gray-500 dark:text-gray-400">Vrijeme:</dt>
                            <dd className="col-span-2 text-gray-900 dark:text-gray-200">
                              {format(new Date(activity.timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: hr })}
                            </dd>
                            
                            <dt className="text-gray-500 dark:text-gray-400">Korisnik:</dt>
                            <dd className="col-span-2 text-gray-900 dark:text-gray-200">
                              {activity.username} 
                              {activity.user && <span className="ml-1 text-gray-500 dark:text-gray-400">({activity.user.role})</span>}
                            </dd>
                            
                            <dt className="text-gray-500 dark:text-gray-400">IP adresa:</dt>
                            <dd className="col-span-2 text-gray-900 dark:text-gray-200 font-mono">{activity.ipAddress || 'N/A'}</dd>
                          </dl>
                        </div>
                        
                        {activity.metadata && (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <h5 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Dodatni podaci</h5>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-48 border border-gray-100 dark:border-gray-700">
                              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                                {JSON.stringify(activity.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <h5 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Opis</h5>
                        <p className="text-gray-800 dark:text-gray-200">{activity.description}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTable;
