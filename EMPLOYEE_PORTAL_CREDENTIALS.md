# Employee Portal Test Credentials

## Employee Login

Use these credentials to test the Employee Portal:

- **Email:** `employee@acme.com`
- **Password:** `password123`

## Other Available Credentials

### Super Admin
- **Email:** `superadmin@hrms.com`
- **Password:** `password123`

### Admin/HR Users
Check the database seed data in `backend/database/schema/12_seed_data.sql` for additional test users.

## Employee Portal Features

When logged in as an employee, you will have access to:

### ✅ Completed Features

1. **Employee Dashboard** (`/app/employee/dashboard`)
   - Quick check-in/check-out
   - Attendance summary
   - Leave balance overview
   - Upcoming holidays
   - Company announcements

2. **My Profile** (`/app/employee/profile`)
   - View/edit personal details
   - Contact information
   - Emergency contacts
   - Work information (read-only)

3. **My Attendance** (`/app/employee/attendance`)
   - Check-in/check-out functionality
   - Attendance history with filters
   - Monthly attendance summary
   - Working hours tracking

4. **My Leave** (`/app/employee/leave`)
   - Leave balance by type
   - View leave requests (pending, approved, rejected)
   - Apply for new leave
   - Cancel pending requests

5. **Apply Leave** (`/app/employee/leave/apply`)
   - Full leave application form
   - Duration calculation (weekdays only)
   - Half-day/full-day options
   - Document upload for sick leave
   - Real-time balance check

6. **My Payslips** (`/app/employee/payslips`)
   - View all payslips by year
   - Detailed salary breakdown
   - Download PDF functionality (ready for backend)

7. **My Documents** (`/app/employee/documents`)
   - Upload personal documents
   - View uploaded documents
   - Download documents
   - Document verification status

8. **Employee Directory** (`/app/employee/directory`)
   - Search colleagues by name, email, designation
   - Filter by department
   - View contact information
   - Email/call directly from directory

9. **My Settings** (`/app/employee/settings`)
   - Change password with validation
   - Password strength indicator
   - Notification preferences (email/push)

## Implementation Status

- ✅ All 9 employee portal pages completed
- ✅ Routing configured in App.jsx
- ✅ Mock data for testing UI/UX
- ✅ All buttons and actions functional in UI
- ✅ Form validations implemented
- ✅ Responsive design for mobile/tablet
- ⏳ Backend API integration pending (endpoints defined in employeePortalApi.js)

## How to Test

1. Start the application:
   ```bash
   npm run dev
   ```

2. Login with employee credentials above

3. You will be redirected to `/app/employee/dashboard`

4. Navigate through all employee portal features

5. Test actions:
   - Check in/out on dashboard
   - Edit profile information
   - Apply for leave
   - View payslips
   - Upload documents
   - Search employee directory
   - Change password
   - Update notification preferences

## Notes

- All pages use mock data for now
- Backend API endpoints are defined in `src/services/employeePortalApi.js`
- Forms have client-side validation
- No actual data is persisted (UI testing only)
- Backend integration required for full functionality

## Navigation

Employee-specific navigation will be added in the next step to show:
- My Dashboard
- My Profile
- My Attendance
- My Leave
- My Payslips
- My Documents
- Employee Directory
- Settings

This navigation will only appear for users with the EMPLOYEE role.
