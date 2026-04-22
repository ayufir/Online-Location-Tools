import React, { useEffect, useState } from 'react';
import { employeeAPI } from '../services/api';
import './ViewSmsModal.css';

const ViewSmsModal = ({ employee, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSms = async () => {
      try {
        const res = await employeeAPI.getSms(employee._id);
        setMessages(res.data || []);
      } catch (err) {
        // toast.error('No SMS data found.');
      } finally {
        setLoading(false);
      }
    };
    fetchSms();
  }, [employee._id]);

  const filteredMessages = messages.filter(msg => 
    msg.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.address.includes(searchTerm)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sms-modal glass-effect" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">💬 SMS Logs</h2>
            <p className="text-xs text-muted">MONITORING: {employee.name.toUpperCase()}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="search-bar p-20">
          <input 
            type="text" 
            placeholder="Search messages or numbers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="sms-content custom-scroll">
          {loading ? (
            <div className="flex justify-center p-40"><div className="spinner" /></div>
          ) : filteredMessages.length === 0 ? (
            <div className="empty-state p-40">No messages found.</div>
          ) : (
            <div className="message-list">
              {filteredMessages.map((msg, idx) => (
                <div key={idx} className={`message-item ${msg.type === '2' ? 'sent' : 'received'}`}>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <span className="message-address">{msg.address}</span>
                      <span className="message-date">{new Date(msg.date).toLocaleString()}</span>
                    </div>
                    <p className="message-body">{msg.body}</p>
                    <span className="message-type-tag">{msg.type === '2' ? 'Sent' : 'Received'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSmsModal;
