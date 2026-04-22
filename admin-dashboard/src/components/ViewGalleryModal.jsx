import React, { useEffect, useState } from 'react';
import { employeeAPI } from '../services/api';
import './ViewGalleryModal.css';

const ViewGalleryModal = ({ employee, onClose }) => {
  const [photos, setPhotos] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await employeeAPI.getGallery(employee._id);
        setPhotos(res.data);
        setTotalCount(res.count);
      } catch (err) {
        // toast.error('No gallery data found.');
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [employee._id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gallery-modal glass-effect" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">🖼️ Device Gallery</h2>
            <p className="text-xs text-muted">MONITORING: {employee.name.toUpperCase()} ({totalCount} total assets)</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="gallery-content custom-scroll">
          {loading ? (
            <div className="flex justify-center p-40"><div className="spinner" /></div>
          ) : photos.length === 0 ? (
            <div className="empty-state p-40">No media assets indexed.</div>
          ) : (
            <div className="gallery-grid">
              {photos.map((photo, idx) => (
                <div key={idx} className="gallery-item">
                  {photo.thumbnail ? (
                    <img src={photo.thumbnail} alt={photo.filename} className="gallery-img" />
                  ) : (
                    <div className="gallery-placeholder">
                       <span className="text-xs">{photo.mediaType}</span>
                    </div>
                  )}
                  <div className="gallery-item-info">
                    <span className="gallery-item-name">{photo.filename}</span>
                    <span className="gallery-item-date">{new Date(photo.creationTime).toLocaleDateString()}</span>
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

export default ViewGalleryModal;
