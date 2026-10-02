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

  // Use only real employees from database (0 employees when clean)
  const combinedEmployees = fetchedEmps;

  // Build unique departments: lookups + from employees + defaults
  const empDepts = combinedEmployees.map(e => e.department).filter(Boolean);
  const deptSet = new Set([...fetchedDepts, ...empDepts, ...DEFAULT_DEPARTMENTS]);
  const departments = Array.from(deptSet).sort();

  return {
    employees: combinedEmployees,
    departments
  };
}
