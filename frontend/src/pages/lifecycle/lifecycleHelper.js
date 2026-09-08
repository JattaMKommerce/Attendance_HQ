import { getEmployees, getLookups } from '../../services/employeeApi';

const DEFAULT_DEPARTMENTS = [
  'IT',
  'Human Resources',
  'Operations',
  'Finance',
  'Engineering',
  'Marketing',
  'Sales',
  'Customer Support'
];

const FALLBACK_EMPLOYEES = [
  { id: 'EMP002', employee_code: 'EMP002', name: 'Rahul Sharma', first_name: 'Rahul', last_name: 'Sharma', department: 'IT', designation: 'Software Engineer', joining_date: '2025-07-01', gross_salary: '₹6,00,000' },
  { id: 'EMP007', employee_code: 'EMP007', name: 'Priya Patel', first_name: 'Priya', last_name: 'Patel', department: 'Human Resources', designation: 'HR Executive', joining_date: '2025-07-15', gross_salary: '₹5,50,000' },
  { id: 'EMP011', employee_code: 'EMP011', name: 'Amit Kumar', first_name: 'Amit', last_name: 'Kumar', department: 'Operations', designation: 'Operations Lead', joining_date: '2025-08-01', gross_salary: '₹7,20,000' },
  { id: 'EMP014', employee_code: 'EMP014', name: 'Sneha Rao', first_name: 'Sneha', last_name: 'Rao', department: 'Finance', designation: 'Financial Analyst', joining_date: '2025-06-10', gross_salary: '₹6,80,000' },
];

export async function fetchLifecycleContext() {
  let fetchedEmps = [];
  let fetchedDepts = [];

  try {
    const [empRes, lookupsRes] = await Promise.allSettled([
      getEmployees(),
      getLookups()
    ]);

    if (empRes.status === 'fulfilled' && empRes.value?.success && empRes.value?.data?.employees) {
      fetchedEmps = empRes.value.data.employees.map(e => ({
        id: e.id || e.employee_code,
        employee_code: e.employee_code || `EMP${e.id}`,
        name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
        first_name: e.first_name || '',
        last_name: e.last_name || '',
        department: e.department_name || e.department?.name || e.department || 'Operations',
        designation: e.designation_name || e.designation?.name || e.designation || 'Specialist',
        joining_date: e.joining_date ? e.joining_date.split('T')[0] : '2025-01-01',
        gross_salary: e.gross_salary ? `₹${Number(e.gross_salary).toLocaleString('en-IN')}` : '₹6,00,000',
        email: e.email || ''
      }));
    }

    if (lookupsRes.status === 'fulfilled' && lookupsRes.value?.success && lookupsRes.value?.data?.departments) {
      fetchedDepts = lookupsRes.value.data.departments.map(d => d.name || d).filter(Boolean);
    }
  } catch (err) {
    console.error('Failed to load lifecycle context', err);
  }

  // Use real employees if available; if none found in DB, provide fallback employees
  const combinedEmployees = fetchedEmps.length > 0 ? fetchedEmps : FALLBACK_EMPLOYEES;

  // Build unique departments: lookups + from employees + defaults
  const empDepts = combinedEmployees.map(e => e.department).filter(Boolean);
  const deptSet = new Set([...fetchedDepts, ...empDepts, ...DEFAULT_DEPARTMENTS]);
  const departments = Array.from(deptSet).sort();

  return {
    employees: combinedEmployees,
    departments
  };
}
