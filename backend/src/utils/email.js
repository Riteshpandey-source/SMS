const nodemailer = require('nodemailer');
const { config } = require('../config/index');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      if (!config.email.auth.user || !config.email.auth.pass) {
        console.log('⚠️  Email service not configured - email features will be disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass
        }
      });

      this.isConfigured = true;
      console.log('📧 Email service configured successfully');
    } catch (error) {
      console.error('❌ Email service configuration failed:', error.message);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"CampusBuddy" <${config.email.auth.user}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  generateEmailTemplate(title, content, actionButton = null) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎓 CampusBuddy</h1>
            <p>Your Campus Companion</p>
        </div>
        <div class="content">
            <h2>${title}</h2>
            ${content}
            ${actionButton || ''}
        </div>
        <div class="footer">
            <p>This email was sent from CampusBuddy. If you didn't request this, please ignore this email.</p>
            <p>&copy; 2025 CampusBuddy. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    const content = `
      <p>Welcome to CampusBuddy! Please verify your email address to complete your registration.</p>
      <p>Click the button below to verify your email:</p>
    `;

    const actionButton = `<a href="${verificationUrl}" class="button">Verify Email Address</a>`;

    const html = this.generateEmailTemplate('Verify Your Email', content, actionButton);

    return await this.sendEmail(
      email,
      'Verify Your CampusBuddy Account',
      html
    );
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    const content = `
      <p>You requested a password reset for your CampusBuddy account.</p>
      <p>Click the button below to reset your password. This link will expire in 10 minutes.</p>
      <p><strong>If you didn't request this, please ignore this email.</strong></p>
    `;

    const actionButton = `<a href="${resetUrl}" class="button">Reset Password</a>`;

    const html = this.generateEmailTemplate('Reset Your Password', content, actionButton);

    return await this.sendEmail(
      email,
      'Reset Your CampusBuddy Password',
      html
    );
  }

  async sendWelcomeEmail(email, name) {
    const content = `
      <p>Hello ${name},</p>
      <p>Welcome to CampusBuddy! We're excited to have you join our campus community.</p>
      <p>Here's what you can do with CampusBuddy:</p>
      <ul>
        <li>📚 Access and share study notes</li>
        <li>📅 Stay updated with campus events</li>
        <li>💬 Get help in our discussion forum</li>
        <li>📊 Track your academic progress</li>
        <li>🔔 Receive important notifications</li>
      </ul>
      <p>Get started by exploring your dashboard!</p>
    `;

    const actionButton = `<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>`;

    const html = this.generateEmailTemplate('Welcome to CampusBuddy!', content, actionButton);

    return await this.sendEmail(
      email,
      'Welcome to CampusBuddy!',
      html
    );
  }

  async sendAccountLockedEmail(email, name) {
    const content = `
      <p>Hello ${name},</p>
      <p>Your CampusBuddy account has been temporarily locked due to multiple failed login attempts.</p>
      <p>For security reasons, your account will be automatically unlocked after 30 minutes.</p>
      <p>If you believe this was not you, please contact our support team immediately.</p>
    `;

    const html = this.generateEmailTemplate('Account Temporarily Locked', content);

    return await this.sendEmail(
      email,
      'CampusBuddy Account Locked',
      html
    );
  }

  async sendPasswordChangedEmail(email, name) {
    const content = `
      <p>Hello ${name},</p>
      <p>Your CampusBuddy account password has been successfully changed.</p>
      <p>If you didn't make this change, please contact our support team immediately.</p>
      <p>For security, all your active sessions have been logged out.</p>
    `;

    const html = this.generateEmailTemplate('Password Changed', content);

    return await this.sendEmail(
      email,
      'CampusBuddy Password Changed',
      html
    );
  }

  async sendParentVerificationEmail(email, token, childName) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    const content = `
      <p>Welcome to CampusBuddy Parent Portal!</p>
      <p>You have successfully registered as a parent for <strong>${childName}</strong>.</p>
      <p>Please verify your email address to complete your registration and gain access to your child's academic information.</p>
      <p>Click the button below to verify your email:</p>
    `;

    const actionButton = `<a href="${verificationUrl}" class="button">Verify Parent Account</a>`;

    const html = this.generateEmailTemplate('Verify Your Parent Account', content, actionButton);

    return await this.sendEmail(
      email,
      'Verify Your CampusBuddy Parent Account',
      html
    );
  }

  async sendStudentParentNotificationEmail(studentEmail, parentName, parentEmail) {
    const content = `
      <p>Hello,</p>
      <p>A parent account has been registered for your CampusBuddy profile.</p>
      <p><strong>Parent Details:</strong></p>
      <ul>
        <li>Name: ${parentName}</li>
        <li>Email: ${parentEmail}</li>
      </ul>
      <p>This parent will have read-only access to your academic information including:</p>
      <ul>
        <li>📊 Attendance records</li>
        <li>📝 Academic marks and grades</li>
        <li>📈 Performance metrics</li>
        <li>⚠️ Academic alerts and notifications</li>
      </ul>
      <p>If you did not authorize this parent registration, please contact our support team immediately.</p>
    `;

    const html = this.generateEmailTemplate('Parent Account Registered', content);

    return await this.sendEmail(
      studentEmail,
      'CampusBuddy: Parent Account Registered for Your Profile',
      html
    );
  }

  async sendNotificationEmail(email, name, title, message, actionUrl = null) {
    const content = `
      <p>Hello ${name},</p>
      <p>${message}</p>
    `;

    const actionButton = actionUrl ? 
      `<a href="${actionUrl}" class="button">View Details</a>` : '';

    const html = this.generateEmailTemplate(title, content, actionButton);

    return await this.sendEmail(
      email,
      `CampusBuddy: ${title}`,
      html
    );
  }

  async sendBulkEmail(recipients, subject, html) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - skipping bulk email send');
      return { success: false, error: 'Email service not configured' };
    }

    const results = [];
    const batchSize = 10; // Send in batches to avoid overwhelming the server

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.sendEmail(email, subject, html));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Batch email error:', error);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📧 Bulk email completed: ${successful} sent, ${failed} failed`);
    
    return {
      success: true,
      total: results.length,
      successful,
      failed,
      results
    };
  }

  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = {
  sendEmail: (to, subject, html, text) => emailService.sendEmail(to, subject, html, text),
  sendVerificationEmail: (email, token) => emailService.sendVerificationEmail(email, token),
  sendPasswordResetEmail: (email, token) => emailService.sendPasswordResetEmail(email, token),
  sendWelcomeEmail: (email, name) => emailService.sendWelcomeEmail(email, name),
  sendAccountLockedEmail: (email, name) => emailService.sendAccountLockedEmail(email, name),
  sendPasswordChangedEmail: (email, name) => emailService.sendPasswordChangedEmail(email, name),
  sendParentVerificationEmail: (email, token, childName) => 
    emailService.sendParentVerificationEmail(email, token, childName),
  sendStudentParentNotificationEmail: (studentEmail, parentName, parentEmail) => 
    emailService.sendStudentParentNotificationEmail(studentEmail, parentName, parentEmail),
  sendNotificationEmail: (email, name, title, message, actionUrl) => 
    emailService.sendNotificationEmail(email, name, title, message, actionUrl),
  sendBulkEmail: (recipients, subject, html) => emailService.sendBulkEmail(recipients, subject, html),
  testConnection: () => emailService.testConnection(),
  isConfigured: () => emailService.isConfigured
};
