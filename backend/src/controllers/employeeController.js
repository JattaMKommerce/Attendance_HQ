const employeeService = require('../services/employeeService');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class EmployeeController {
  async getEmployees(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const filters = req.query;
      
      const result = await employeeService.getEmployees(organizationId, filters);
      
      res.status(200).json({
        success: true,
        message: 'Employees retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeById(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeId = req.params.id;
      
      const result = await employeeService.getEmployeeById(organizationId, employeeId);
      
      res.status(200).json({
        success: true,
        message: 'Employee retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async createEmployee(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeData = req.body;

      // Basic required field validation (employee_code is optional as backend auto-generates if omitted)
      if (!employeeData.first_name || !employeeData.last_name || !employeeData.email || !employeeData.joining_date) {
        return res.status(400).json({ success: false, message: 'First name, last name, official email, and joining date are required' });
      }

      // Check for whitespace only
      if (employeeData.first_name.trim() === '' || employeeData.last_name.trim() === '' || employeeData.email.trim() === '') {
        return res.status(400).json({ success: false, message: 'Name and email cannot be empty' });
      }

      // Check terms and conditions
      if (!employeeData.terms_accepted) {
        return res.status(400).json({ success: false, message: 'Terms and conditions must be accepted' });
      }

      const result = await employeeService.createEmployee(organizationId, employeeData);
      
      const message = result.email_status === 'SENT'
        ? 'Employee created successfully and onboarding invitation sent.'
        : result.email_status === 'SAVED_NO_EMAIL'
        ? 'Employee created and saved successfully.'
        : 'Employee created successfully. Email delivery was not completed, but invitation link is available.';

      res.status(201).json({
        success: true,
        message,
        data: result
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async resendInvitation(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeId = req.params.id;

      const result = await employeeService.resendInvitation(organizationId, employeeId);

      res.status(200).json({
        success: true,
        message: result.email_status === 'SENT'
          ? 'Onboarding invitation email resent successfully.'
          : 'New activation link generated, but email delivery was not completed.',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('already active')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async updateEmployee(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeId = req.params.id;
      const employeeData = req.body;
      
      const result = await employeeService.updateEmployee(organizationId, employeeId, employeeData);
      
      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async updateEmployeeStatus(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeId = req.params.id;
      const { status } = req.body;
      const changedBy = req.user.id;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
      }
      
      const result = await employeeService.updateEmployeeStatus(organizationId, employeeId, status, changedBy);
      
      res.status(200).json({
        success: true,
        message: 'Employee status updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async getLookups(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const result = await employeeService.getLookups(organizationId);
      
      res.status(200).json({
        success: true,
        message: 'Lookups retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo provided or invalid format' });
      }
      
      // Store relative path
      const fileUrl = `/uploads/photos/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: { file_url: fileUrl }
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No document provided or invalid format' });
      }
      
      const fileUrl = `/uploads/documents/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { 
          file_url: fileUrl,
          original_name: req.file.originalname
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadResume(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No resume provided or invalid format' });
      }
      
      const fileUrl = `/uploads/documents/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: 'Resume uploaded successfully',
        data: { file_url: fileUrl }
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeIdCard(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const employeeId = req.params.id;
      
      const employee = await employeeService.getEmployeeById(organizationId, employeeId);
      
      // Create a PDF document (Portrait ID Card - 250x400)
      const doc = new PDFDocument({ size: [250, 400], margin: 0 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="IDCard_${employee.employee_code}.pdf"`);
      
      // Handle PDF errors
      doc.on('error', (err) => {
        console.error('PDF generation error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error generating PDF' });
        }
      });
      
      doc.pipe(res);
      
      // Background
      doc.rect(0, 0, 250, 400).fill('#ffffff');
      
      // Top Banner
      doc.rect(0, 0, 250, 50).fill('#4f46e5');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
         .text('EMPLOYEE ID CARD', 0, 18, { align: 'center', width: 250 });
      
      // Center Photo
      let photoW = 100;
      let photoH = 125;
      let photoX = (250 - photoW) / 2;
      let photoY = 70;
      
      // Photo border/background
      doc.rect(photoX - 2, photoY - 2, photoW + 4, photoH + 4).fill('#e5e7eb');
      doc.rect(photoX, photoY, photoW, photoH).fill('#ffffff');
      
      // Try to add profile image with error handling
      if (employee.profile_image_url) {
        try {
          const imagePath = path.join(__dirname, '../../', employee.profile_image_url);
          if (fs.existsSync(imagePath)) {
            doc.image(imagePath, photoX, photoY, { width: photoW, height: photoH, fit: [photoW, photoH], align: 'center', valign: 'center' });
          } else {
            console.warn(`Profile image not found: ${imagePath}`);
            // Add placeholder text if image doesn't exist
            doc.fillColor('#9ca3af').fontSize(12).font('Helvetica')
               .text('No Photo', photoX, photoY + 50, { width: photoW, align: 'center' });
          }
        } catch (imgError) {
          console.error('Error loading profile image:', imgError);
          // Add placeholder text if image fails to load
          doc.fillColor('#9ca3af').fontSize(12).font('Helvetica')
             .text('No Photo', photoX, photoY + 50, { width: photoW, align: 'center' });
        }
      } else {
        // Add initials if no profile image
        doc.fillColor('#9ca3af').fontSize(28).font('Helvetica-Bold')
           .text(`${employee.first_name[0]}${employee.last_name[0]}`, photoX, photoY + 40, { width: photoW, align: 'center' });
      }
      
      // Centered Name and Designation
      doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold')
         .text(`${employee.first_name} ${employee.last_name}`, 0, 210, { align: 'center', width: 250 });
         
      doc.fillColor('#6b7280').fontSize(11).font('Helvetica')
         .text(`${employee.designation_name || 'Employee'}`, 0, 230, { align: 'center', width: 250 });
         
      // Line separator
      doc.moveTo(40, 260).lineTo(210, 260).strokeColor('#e5e7eb').lineWidth(1).stroke();
      
      // Details Grid
      let startX = 40;
      let valX = 110;
      
      doc.fontSize(10).fillColor('#4b5563');
      
      // ID No
      doc.font('Helvetica').text(`ID No:`, startX, 280, { lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#1f2937').text(`${employee.employee_code}`, valX, 280, { lineBreak: false });
      
      // Department
      doc.font('Helvetica').fillColor('#4b5563').text(`Department:`, startX, 305, { lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#1f2937').text(`${employee.department_name || 'N/A'}`, valX, 305, { lineBreak: false });
      
      // Joined
      doc.font('Helvetica').fillColor('#4b5563').text(`Joined:`, startX, 330, { lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#1f2937').text(`${employee.joining_date ? employee.joining_date.toISOString().split('T')[0] : 'N/A'}`, valX, 330, { lineBreak: false });
      
      // Bottom Bar
      doc.rect(0, 380, 250, 20).fill('#4f46e5');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
         .text(employee.organization_name ? employee.organization_name.toUpperCase() : 'COMPANY', 0, 386, { align: 'center', width: 250 });
         
      doc.end();
      
    } catch (error) {
      console.error('ID Card generation error:', error);
      if (error.message === 'Employee not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Failed to generate ID card', error: error.message });
      }
      next(error);
    }
  }
}

module.exports = new EmployeeController();
