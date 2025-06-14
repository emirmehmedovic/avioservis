'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataDisplay, DataGrid } from '@/components/ui/DataDisplay';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/Table';
import { 
  Car, 
  Users, 
  Building2, 
  MapPin, 
  AlertTriangle, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { title: 'Ukupno vozila', value: '24', icon: <Car size={20} />, trend: { value: 12, isPositive: true } },
    { title: 'Aktivni korisnici', value: '8', icon: <Users size={20} /> },
    { title: 'Partnerske firme', value: '5', icon: <Building2 size={20} /> },
    { title: 'Lokacije', value: '3', icon: <MapPin size={20} /> },
  ];

  const upcomingEvents = [
    { id: 1, type: 'Servis', vehicle: 'Mercedes Sprinter', date: '18.05.2025', status: 'Zakazano' },
    { id: 2, type: 'Registracija', vehicle: 'BMW X5', date: '22.05.2025', status: 'Uskoro' },
    { id: 3, type: 'Inspekcija', vehicle: 'Audi A6', date: '01.06.2025', status: 'Zakazano' },
  ];

  const alerts = [
    { id: 1, title: 'Ističe registracija', description: 'BMW X5 - registracija ističe za 7 dana', severity: 'high' },
    { id: 2, title: 'Potreban servis', description: 'Mercedes Sprinter - 2000km do redovnog servisa', severity: 'medium' },
    { id: 3, title: 'Inspekcija zakazana', description: 'Audi A6 - inspekcija zakazana za 01.06.2025', severity: 'low' },
  ];

  const recentActivities = [
    { id: 1, action: 'Dodano vozilo', user: 'admin', timestamp: 'Prije 2 sata', details: 'Dodano novo vozilo: Audi A6' },
    { id: 2, action: 'Ažuriran servis', user: 'marko', timestamp: 'Prije 1 dan', details: 'Ažuriran servisni zapis za Mercedes Sprinter' },
    { id: 3, action: 'Dodana slika', user: 'admin', timestamp: 'Prije 2 dana', details: 'Dodana nova slika za BMW X5' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">Dobrodošli na AvioServis Dashboard</h1>
                <p className="text-muted-foreground">Pregled ključnih informacija i aktivnosti u sistemu</p>
              </div>
              <div className="flex space-x-3">
                <Link href="/dashboard/vehicles/new">
                  <Button className="btn btn-primary flex items-center gap-2"><Car size={16} /> Dodaj vozilo</Button>
                </Link>
                <Link href="/dashboard/users/new">
                  <Button className="btn btn-outline flex items-center gap-2"><Users size={16} /> Dodaj korisnika</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats section */}
      <div>
        <DataGrid>
          {stats.map((stat, index) => (
            <div key={stat.title}>
              <DataDisplay 
                title={stat.title} 
                value={stat.value} 
                icon={stat.icon} 
                trend={stat.trend}
              />
            </div>
          ))}
        </DataGrid>
      </div>

      {/* Main content section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Upcoming events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                  Nadolazeći događaji
                </CardTitle>
                <Link href="/dashboard/events">
                  <Button className="btn btn-ghost text-sm">Vidi sve</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tip</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.type}</TableCell>
                      <TableCell className="font-medium">{event.vehicle}</TableCell>
                      <TableCell>{event.date}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'Zakazano' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                          event.status === 'Uskoro' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        }`}>
                          {event.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Alerts */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-muted-foreground" />
                Upozorenja i obavijesti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-lg border ${alert.severity === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800' : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'}`}
                  >
                    <h3 className="font-semibold mb-1">{alert.title}</h3>
                    <p className="text-sm">{alert.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity section */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center">
              <Activity className="mr-2 h-5 w-5 text-muted-foreground" />
              Nedavne aktivnosti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mr-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{activity.action}</h4>
                      <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm">{activity.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">Korisnik: {activity.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground py-6">
        <p> 2025 AvioServis. Sva prava pridržana.</p>
      </footer>
    </div>
  );
}
