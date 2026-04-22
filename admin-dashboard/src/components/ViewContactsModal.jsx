import React, { useEffect, useState } from 'react';
import { employeeAPI } from '../services/api';
import './ViewContactsModal.css';

const ViewContactsModal = ({ employee, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await employeeAPI.getContacts(employee._id);
        setContacts(res.data);
      } catch (err) {
        // toast.error('No contacts found for this employee.');
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [employee._id]);

  const filtered = (contacts || []).filter(c => 
    (c?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c?.phoneNumbers || []).some(p => (p || '').includes(searchTerm))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal contacts-modal glass-effect" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">📱 Device Contacts</h2>
            <p className="text-xs text-muted">COLLECTED FROM {(employee?.name || 'Employee').toUpperCase()}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="contacts-search">
          <input 
            type="text" 
            placeholder="Search contacts..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="contacts-list custom-scroll">
          {loading ? (
            <div className="flex justify-center p-40"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state p-40">No contacts found.</div>
          ) : (
            filtered.map((contact, idx) => (
              <div key={idx} className="contact-item">
                <div className="contact-avatar">{(contact?.name || '?').charAt(0)}</div>
                <div className="contact-info">
                  <div className="contact-name">{contact?.name || 'Unnamed Contact'}</div>
                  <div className="contact-phones">
                    {contact?.phoneNumbers?.map((p, i) => (
                      <span key={i} className="contact-phone">{p || 'No Number'}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewContactsModal;
