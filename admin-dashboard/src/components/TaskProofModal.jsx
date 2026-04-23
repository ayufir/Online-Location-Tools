import React, { useState } from 'react';
import { employeeAPI } from '../services/api';
import toast from 'react-hot-toast';
import './TaskProofModal.css';

const TaskProofModal = ({ task, employeeId, employeeName, onClose }) => {
  const [approving, setApproving] = useState(false);
  if (!task) return null;

  let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1); // Remove trailing slash

  const images = Array.isArray(task.completionImage) 
    ? task.completionImage 
    : (task.completionImage ? [task.completionImage] : []);

  const handleApprove = async () => {
    try {
      setApproving(true);
      await employeeAPI.approveTask(employeeId, task._id);
      toast.success('Task approved and completed!');
      onClose();
    } catch (err) {
      toast.error('Failed to approve task');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal proof-modal glass-effect" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">✅ Mission Proof</h2>
            <p className="text-xs text-muted">EMPLOYEE: {employeeName.toUpperCase()}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="proof-content custom-scroll">
          <div className="proof-details">
            <div className="proof-info-item">
              <span className="proof-label">Mission:</span>
              <span className="proof-val">{task.label}</span>
            </div>
            <div className="proof-info-item">
              <span className="proof-label">Status:</span>
              <span className={`proof-val status-${task.status}`}>{task.status.toUpperCase()}</span>
            </div>
            <div className="proof-info-item">
              <span className="proof-label">Completed At:</span>
              <span className="proof-val">{new Date(task.completedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="proof-images-grid custom-scroll">
            {images.length > 0 ? images.map((img, idx) => {
              const fullUrl = img.startsWith('http') ? img : `${API_URL}${img}`;
              console.log('[ProofModal] Loading Image:', fullUrl);
              return (
                <div key={idx} className="proof-image-wrapper">
                  <img src={fullUrl} alt={`Proof ${idx + 1}`} className="proof-img" />
                </div>
              );
            }) : (
              <div className="no-proof-msg">No proof images found for this mission.</div>
            )}
          </div>

          {!task.isApproved && (
            <button 
              className="btn-approve" 
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Approving...' : 'APPROVE MISSION'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProofModal;
