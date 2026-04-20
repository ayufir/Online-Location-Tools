import React, { useEffect, useState } from 'react';
import { employeeAPI } from '../services/api';
import AddEmployeeModal from '../components/AddEmployeeModal';
import { getInitials, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
    } catch (err) {
      toast.error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    setEditEmployee(emp);
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee removed.');
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="employees-page flex flex-col gap-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Fleet Directory</h1>
          <p className="page-sub">Add and manage your field technician accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEmployee(null); setShowModal(true); }}>
          ➕ Add New Employee
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-16 w-full">
            <div className="card-title">Employee Registry ({employees.length})</div>
            <div className="flex-1">
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Search by name, ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No matching employees found.</td></tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div className="flex items-center gap-12">
                        <div className="user-avatar" style={{width:'32px', height:'32px', fontSize:'11px'}}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <div className="fw-700 text-primary">{emp.name}</div>
                          <div className="text-xs text-muted">{emp.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{emp.email}</div>
                      <div className="text-xs text-muted">{emp.phone || '—'}</div>
                    </td>
                    <td>
                      <div className="badge badge-online" style={{background: 'rgba(59, 130, 246, 0.05)', color: '#3B82F6'}}>
                        {emp.department}
                      </div>
                    </td>
                    <td>{emp.designation}</td>
                    <td>{formatDate(emp.createdAt)}</td>
                    <td>
                      <div className={`badge badge-${emp.isActive ? 'moving' : 'offline'}`}>
                        {emp.isActive ? 'Active' : 'Disabled'}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(emp)} title="Edit">
                          ✏️
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(emp._id, emp.name)} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddEmployeeModal
          editData={editEmployee}
          onClose={() => setShowModal(false)}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
};

export default EmployeesPage;
