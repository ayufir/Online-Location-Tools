import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../services/api';
import './AddEmployeeModal.css';

const INITIAL = {
  name: '', email: '', password: '', phone: '', department: 'Installation', designation: 'Solar Technician',
};

const departments = ['Installation', 'Maintenance', 'Survey', 'Sales', 'Inspection', 'Field Operations'];
const designations = ['Solar Technician', 'Senior Technician', 'Field Engineer', 'Site Inspector', 'Field Sales Executive', 'Supervisor'];

const AddEmployeeModal = ({ onClose, onSuccess, editData = null }) => {
  const [form, setForm] = useState(editData ? { ...editData, password: '' } : INITIAL);
  const [loading, setLoading] = useState(false);

  const isEdit = !!editData;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      return toast.error('Name and email are required.');
    }
    if (!isEdit && !form.password) {
      return toast.error('Password is required for new employees.');
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await employeeAPI.update(editData._id, payload);
        toast.success(`${form.name} updated successfully.`);
      } else {
        await employeeAPI.create(form);
        toast.success(`${form.name} added to the fleet.`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? '✏️ Edit Employee' : '➕ Add New Employee'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="emp-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                name="name"
                className="form-input"
                placeholder="e.g. Rajesh Kumar"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                name="email"
                type="email"
                className="form-input"
                placeholder="rajesh@solartech.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                name="password"
                type="password"
                className="form-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                name="phone"
                className="form-input"
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select name="department" className="form-input form-select" value={form.department} onChange={handleChange}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <select name="designation" className="form-input form-select" value={form.designation} onChange={handleChange}>
                {designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving…</> : isEdit ? '✅ Save Changes' : '➕ Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
