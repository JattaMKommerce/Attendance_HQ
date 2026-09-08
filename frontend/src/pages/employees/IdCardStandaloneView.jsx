import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getEmployeeById } from '../../services/employeeApi';
import EmployeeIdCard from '../../components/EmployeeIdCard';

const IdCardStandaloneView = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const res = await getEmployeeById(id);
        if (res.success) {
          setEmployee(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load ID card');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <p>Loading ID Card...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Error</h2>
          <p style={{ margin: 0 }}>{error || 'Employee not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <EmployeeIdCard employee={employee} />
    </div>
  );
};

export default IdCardStandaloneView;
