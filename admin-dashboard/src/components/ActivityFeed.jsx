import React from 'react';
import { useSocket } from '../context/SocketContext';
import { timeAgo } from '../utils/helpers';
import './ActivityFeed.css';

const icons = {
  location: '📍',
  status: '🔄',
  tracking: '🎯',
};

const ActivityFeed = ({ maxItems = 20 }) => {
  const { activityFeed } = useSocket();
  const items = activityFeed.slice(0, maxItems);

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <span className="card-title">Activity Feed</span>
        <span className="activity-count">{activityFeed.length} events</span>
      </div>
      <div className="activity-list">
        {items.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">📡</div>
            <div>Waiting for live events…</div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={`activity-item ${item.type}`}>
              <div className="activity-icon">{icons[item.type] || '🔔'}</div>
              <div className="activity-body">
                <div className="activity-msg">{item.message}</div>
                <div className="activity-time">{timeAgo(item.timestamp)}</div>
              </div>
              {item.status && (
                <div className={`badge badge-${item.status === 'active' ? 'moving' : item.status}`}>
                  {item.status}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
