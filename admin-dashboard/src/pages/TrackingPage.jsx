import React, { useEffect, useState } from 'react';
import { employeeAPI, locationAPI } from '../services/api';
import FleetMap from '../components/FleetMap';
import { timeAgo, formatDate, toDateStr } from '../utils/helpers';
import toast from 'react-hot-toast';
import './TrackingPage.css';

const TrackingPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [historyCoords, setHistoryCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(toDateStr());

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchSessions(selectedId, date);
    } else {
      setSessions([]);
      setHistoryCoords([]);
    }
  }, [selectedId, date]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId]);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0]._id);
    } catch (err) {
      toast.error('Failed to load employees.');
    }
  };

  const fetchSessions = async (empId, targetDate) => {
    setLoading(true);
    try {
      const res = await locationAPI.getHistory(empId, { date: targetDate });
      setSessions(res.data);
      if (res.data.length > 0) {
        setSelectedSessionId(res.data[0].sessionId);
      } else {
        setSelectedSessionId('');
        setHistoryCoords([]);
      }
    } catch (err) {
      toast.error('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const res = await locationAPI.getSession(sessionId);
      setHistoryCoords(res.data.coordinates);
    } catch (err) {
      toast.error('Failed to load session details.');
    }
  };

  const selectedEmp = employees.find(e => e._id === selectedId);
  const activeSession = sessions.find(s => s.sessionId === selectedSessionId);

  return (
    <div className="tracking-page">
      <div className="tracking-sidebar">
        <div className="card h-full flex flex-col">
          <div className="card-header">
            <h2 className="card-title">TRACKING HISTORY</h2>
          </div>
          
          <div className="card-body flex flex-col gap-16 overflow-y-auto">
            <div className="form-group">
              <label className="form-label">Select Employee</label>
              <select 
                className="form-input form-select" 
                value={selectedId} 
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                max={toDateStr()}
              />
            </div>

            <div className="divider" />

            <div className="sessions-list flex-1">
              <label className="form-label mb-8">Movements for {date === toDateStr() ? 'Today' : formatDate(date)}</label>
              {loading ? (
                <div className="flex justify-center p-20"><div className="spinner" /></div>
              ) : sessions.length === 0 ? (
                <div className="empty-state">No movement data found for this date.</div>
              ) : (
                sessions.map(session => (
                  <div 
                    key={session.sessionId} 
                    className={`session-item ${selectedSessionId === session.sessionId ? 'active' : ''}`}
                    onClick={() => setSelectedSessionId(session.sessionId)}
                  >
                    <div className="session-info">
                      <div className="session-time">
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {session.endTime ? ` - ${new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Live)'}
                      </div>
                      <div className="session-meta">
                        <span>📏 {(session.totalDistance / 1000).toFixed(2)} km</span>
                        <span>⏱️ {session.totalPoints} points</span>
                      </div>
                    </div>
                    {session.isActive && <div className="badge badge-moving">Live</div>}
                  </div>
                ))
              )}
            </div>

            {activeSession && (
              <div className="session-details-card">
                <div className="detail-row">
                  <span>Max Speed:</span>
                  <span className="fw-700">{(activeSession.maxSpeed * 3.6).toFixed(1)} km/h</span>
                </div>
                <div className="detail-row">
                  <span>Avg Speed:</span>
                  <span className="fw-700">{(activeSession.avgSpeed * 3.6).toFixed(1)} km/h</span>
                </div>
                <div className="detail-row">
                  <span>Started:</span>
                  <span className="fw-700">{timeAgo(activeSession.startTime)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tracking-map-container card">
        <FleetMap 
          employees={selectedEmp ? [selectedEmp] : []}
          selectedId={selectedId}
          showHistory={true}
          historyCoords={historyCoords}
        />
        
        {activeSession && (
          <div className="map-overlay-info">
            <div className="overlay-title">Displaying Route Path</div>
            <div className="overlay-meta">
              Session ID: <span className="text-accent">{activeSession.sessionId.slice(-6)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
