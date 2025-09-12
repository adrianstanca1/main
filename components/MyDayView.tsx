// full contents of components/MyDayView.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Timesheet, View, TodoStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapView, MapMarker } from './MapView';
import { PriorityDisplay } from './ui/PriorityDisplay';

interface MyDayViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

export const MyDayView: React.FC<MyDayViewProps> = ({ user, addToast, setActiveView }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);

    const { data: geoData, getLocation } = useGeolocation();
    const activeTimesheet = useMemo(() => timesheets.find(ts => ts.clockOut === null), [timesheets]);
    const currentProject = useMemo(() => {
        if (!activeTimesheet) return null;
        return projects.find(p => p.id === activeTimesheet.projectId);
    }, [activeTimesheet, projects]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [projData, tsData] = await Promise.all([
                api.getProjectsByUser(user.id),
                api.getTimesheetsByUser(user.id),
            ]);
            setProjects(projData);
            setTimesheets(tsData.sort((a,b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()));

            const projectIds = projData.map(p => p.id);
            if (projectIds.length > 0) {
                const todosData = await api.getTodosByProjectIds(projectIds);
                setTodos(todosData.filter(t => t.assigneeId === user.id && t.status !== TodoStatus.DONE));
            }
        } catch (error) {
            addToast("Failed to load your data for the day.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.id, addToast]);

    useEffect(() => {
        fetchData();
        getLocation();
    }, [fetchData, getLocation]);

    const mapMarkers = useMemo(() => {
        const markers: MapMarker[] = [];
        if (currentProject) {
            markers.push({ lat: currentProject.location.lat, lng: currentProject.location.lng, radius: currentProject.geofenceRadius, status: currentProject.status, popupContent: currentProject.name });
        }
        if (geoData) {
            markers.push({ lat: geoData.coords.latitude, lng: geoData.coords.longitude, isUserLocation: true, popupContent: "Your Location" });
        }
        return markers;
    }, [currentProject, geoData]);


    if (loading) {
        return <Card>Loading your day...</Card>;
    }
    
    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-slate-800">My Day</h1>
             <Card>
                 <h2 className="text-xl font-semibold mb-2">Time Clock</h2>
                 {activeTimesheet ? (
                     <div>
                         <p className="text-center text-lg">You are clocked in at <strong>{currentProject?.name}</strong></p>
                         <p className="text-center text-sm text-slate-500">Since {new Date(activeTimesheet.clockIn).toLocaleTimeString()}</p>
                         <Button variant="danger" className="w-full mt-4" onClick={() => setActiveView('time')}>Clock Out</Button>
                     </div>
                 ) : (
                      <p className="text-center text-slate-600">You are currently clocked out.</p>
                 )}
                 {!activeTimesheet && <Button className="w-full mt-4" onClick={() => setActiveView('time')}>Go to Time Clock</Button>}
             </Card>
             
             {currentProject && (
                 <Card>
                     <h2 className="text-xl font-semibold mb-2">Current Project: {currentProject.name}</h2>
                     <MapView markers={mapMarkers} height="h-64" />
                 </Card>
             )}

             <Card>
                 <h2 className="text-xl font-semibold mb-4">My Open Tasks ({todos.length})</h2>
                 <div className="space-y-3">
                     {todos.map(todo => (
                         <div key={todo.id} className="p-3 border rounded-lg flex justify-between items-center bg-white">
                             <div>
                                 <p className="font-medium text-slate-800">{todo.text}</p>
                                 <p className="text-xs text-slate-500">{projects.find(p => p.id === todo.projectId)?.name}</p>
                             </div>
                             <PriorityDisplay priority={todo.priority} />
                         </div>
                     ))}
                     {todos.length === 0 && <p className="text-slate-500 text-center py-4">You have no open tasks. Great job!</p>}
                 </div>
             </Card>
        </div>
    );
};
