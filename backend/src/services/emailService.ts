import nodemailer from 'nodemailer';
import { EmailDispatchStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Imap from 'imap';
import { promisify } from 'util';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private imapConfig: ImapConfig | null;

  constructor(config: EmailConfig, imapConfig?: ImapConfig | null) {
    this.config = config;
    this.imapConfig = imapConfig || null;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Try to save email to Sent folder (not all SMTP servers support this)
      try {
        await this.saveSentEmail(mailOptions);
      } catch (sentError) {
        console.warn('Could not save email to Sent folder:', sentError);
        // Continue even if saving to Sent fails
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async saveSentEmail(mailOptions: any): Promise<void> {
    // Check if IMAP is explicitly disabled via environment variable
    if (process.env.DISABLE_IMAP === 'true' || process.env.IMAP_DISABLED === 'true') {
      console.log('IMAP disabled via environment variable, skipping Sent folder save');
      return;
    }
    
    // IMAP permanently disabled to prevent CRON job blocking
    // This prevents "Logging in is disabled on this server" errors
    console.log('IMAP disabled to prevent CRON job blocking, skipping Sent folder save');
    return;
    
    if (!this.imapConfig) {
      console.log('IMAP not configured, skipping Sent folder save');
      return;
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.imapConfig!.user,
        password: this.imapConfig!.password,
        host: this.imapConfig!.host,
        port: this.imapConfig!.port,
        tls: this.imapConfig!.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        console.log('IMAP connection established');
        
        // Open the Sent folder (try different common names)
        const sentFolderNames = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages'];
        
        const tryOpenSentFolder = (folderIndex: number): void => {
          if (folderIndex >= sentFolderNames.length) {
            console.warn('Could not find Sent folder, email not saved');
            imap.end();
            resolve();
            return;
          }

          const folderName = sentFolderNames[folderIndex];
          imap.openBox(folderName, false, (err: any, box: any) => {
            if (err) {
              console.log(`Failed to open ${folderName}, trying next...`);
              tryOpenSentFolder(folderIndex + 1);
              return;
            }

            console.log(`Opened Sent folder: ${folderName}`);
            
            // Create the email message in RFC2822 format
            const emailMessage = this.createEmailMessage(mailOptions);
            
            // Append the message to Sent folder
            imap.append(emailMessage, { mailbox: folderName, flags: ['\\Seen'] }, (appendErr: any) => {
              if (appendErr) {
                console.error('Error saving email to Sent folder:', appendErr);
                reject(appendErr);
              } else {
                console.log('Email successfully saved to Sent folder');
                resolve();
              }
              imap.end();
            });
          });
        };

        tryOpenSentFolder(0);
      });

      imap.once('error', (err: any) => {
        console.error('IMAP connection error:', err);
        
        // Provide specific error analysis
        if (err.message.includes('Logging in is disabled')) {
          console.error('💡 IMAP Error Analysis:');
          console.error('  - Server has disabled plaintext login for security');
          console.error('  - May require OAuth or App Password');
          console.error('  - Consider disabling IMAP to prevent CRON blocking');
        } else if (err.message.includes('ECONNREFUSED')) {
          console.error('💡 IMAP Connection Refused:');
          console.error('  - Check if server is running');
          console.error('  - Verify port (993 for SSL, 143 for TLS)');
          console.error('  - Check firewall settings');
        }
        
        reject(err);
      });

      imap.once('end', () => {
        console.log('IMAP connection ended');
      });

      // Set timeout for IMAP connection
      setTimeout(() => {
        if (imap.state !== 'disconnected') {
          console.warn('IMAP connection timeout, closing...');
          imap.end();
          resolve(); // Don't reject, just continue without saving
        }
      }, 10000); // 10 second timeout

      imap.connect();
    });
  }

  private createEmailMessage(mailOptions: any): string {
    const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36)}`;
    const date = new Date().toUTCString();
    
    let message = [
      `From: ${mailOptions.from}`,
      `To: ${mailOptions.to}`,
      `Subject: ${mailOptions.subject}`,
      `Date: ${date}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36)}@hifapetrol.ba>`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      '',
      mailOptions.html || mailOptions.text || '',
      ''
    ];

    // Add attachments if any
    if (mailOptions.attachments && mailOptions.attachments.length > 0) {
      mailOptions.attachments.forEach((attachment: any) => {
        message.push(`--${boundary}`);
        message.push(`Content-Type: ${attachment.contentType || 'application/octet-stream'}`);
        message.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        message.push(`Content-Transfer-Encoding: base64`);
        message.push('');
        
        if (Buffer.isBuffer(attachment.content)) {
          message.push(attachment.content.toString('base64'));
        } else {
          message.push(attachment.content);
        }
        message.push('');
      });
    }

    message.push(`--${boundary}--`);
    
    return message.join('\r\n');
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

/**
 * Load HIFA header image as optimized base64 for email compatibility
 */
const loadHifaHeaderImageAsBase64 = (): string => {
  try {
    // Path to header image in frontend/public
    const imagePath = path.join(__dirname, '../../../frontend/public/hifa-header.png');
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.warn('HIFA header image not found:', imagePath);
      return '';
    }
    
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Return as data URL for email compatibility
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('Error loading HIFA header image:', error);
    return '';
  }
};

export function buildEmailConfigFromEnv(): EmailConfig {
  return {
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || '"HIFA-Petrol Invoices" <airport.tuzla@hifapetrol.ba>',
  };
}

export function buildImapConfigFromEnv(): ImapConfig | null {
  // Return null if IMAP is not configured
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASS) {
    return null;
  }

  return {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    tls: process.env.IMAP_SECURE !== 'false',
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASS,
  };
}

export function buildEmailSubject(operation: any): string {
  const date = new Date(operation.dateTime).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const deliveryNumber = operation.delivery_note_number || operation.id;
  return `Fuel Invoice #${deliveryNumber} - ${operation.airline?.name} - ${date}`;
}

export function buildEmailBody(operation: any): string {
  const date = new Date(operation.dateTime).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
  const deliveryNumber = operation.delivery_note_number || operation.id;
  const quantityLiters = Number(operation.quantity_liters).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quantityKg = Number(operation.quantity_kg || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pricePerKg = Number(operation.price_per_kg || 0).toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  const amount = Number(operation.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = operation.currency || 'BAM';

  // Load HIFA header image as base64
  const hifaHeaderImage = loadHifaHeaderImageAsBase64();

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fuel Invoice - HIFA-PETROL</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Official Red Background (Maximum Outlook Compatibility) -->
          <!-- Table-based header that works in ALL email clients including Outlook -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #c0392b;">
            <tr>
              <td style="padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 1px; color: white; font-family: Arial, sans-serif;">HIFA-PETROL</h1>
                <p style="margin: 5px 0 0 0; font-size: 16px; color: white; font-family: Arial, sans-serif;">Aviation Fuel Services</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: white; font-family: Arial, sans-serif;">Tuzla International Airport, Bosnia and Herzegovina</p>
              </td>
            </tr>
          </table>
          
          <!-- Main Content -->
          <div style="padding: 30px 20px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1e3a8a; margin: 0 0 10px 0; font-size: 22px;">Dear ${operation.airline?.name} Team,</h2>
              <p style="margin: 0; color: #666; font-size: 16px;">Please find attached your fuel invoice for the recent service at Tuzla International Airport.</p>
            </div>
            
            <!-- Invoice Details Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #1e3a8a; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Service Details</h3>
              
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Airline:</span>
                  <span style="color: #1f2937;">${operation.airline?.name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Service Date:</span>
                  <span style="color: #1f2937;">${date}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Delivery Note Number:</span>
                  <span style="color: #1f2937; font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${deliveryNumber}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Aircraft Registration:</span>
                  <span style="color: #1f2937; font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${operation.aircraft_registration}</span>
                </div>
                
                ${operation.flight_number ? `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Flight Number:</span>
                  <span style="color: #1f2937; font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${operation.flight_number}</span>
                </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Destination:</span>
                  <span style="color: #1f2937; font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${operation.destination || 'N/A'}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Fuel Quantity (Liters):</span>
                  <span style="color: #1f2937; font-weight: 600;">${quantityLiters} L</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Fuel Quantity (Kilograms):</span>
                  <span style="color: #1f2937; font-weight: 600;">${quantityKg} kg</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600; color: #374151;">Price per Kilogram:</span>
                  <span style="color: #1f2937; font-weight: 600;">${pricePerKg} ${currency}/kg</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #1e3a8a; margin: 8px -25px -25px -25px; padding-left: 25px; padding-right: 25px; border-radius: 0 0 8px 8px;">
                  <span style="font-weight: 600; color: white; font-size: 16px;">Total Amount:</span>
                  <span style="color: white; font-weight: 700; font-size: 18px;">${amount} ${currency}</span>
                </div>
              </div>
            </div>
            
            <!-- Payment Terms -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
              <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px;">Payment Terms</h4>
              <p style="margin: 0; color: #92400e; font-size: 14px;">Payment is due within <strong>15 days</strong> from the invoice date. Please reference the delivery note number in your payment.</p>
            </div>
            
            <!-- Message -->
            <div style="margin: 25px 0;">
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Thank you for choosing HIFA-PETROL for your aviation fuel needs. We appreciate your business and look forward to serving you again.</p>
              <p style="margin: 0; color: #374151; font-size: 16px;">Should you have any questions regarding this invoice or require additional documentation, please don't hesitate to contact us.</p>
            </div>
            
            <!-- Contact Information -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 16px;">Contact Information</h4>
              <div style="color: #475569; font-size: 14px;">
                <p style="margin: 5px 0; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">📧</span>
                  <strong>Email:</strong>&nbsp;<a href="mailto:airport.tuzla@hifapetrol.ba" style="color: #3b82f6; text-decoration: none;">airport.tuzla@hifapetrol.ba</a>
                </p>
                <p style="margin: 5px 0; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">📞</span>
                  <strong>Phone:</strong>&nbsp;+387 35 411 156
                </p>
                <p style="margin: 5px 0; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">🌐</span>
                  <strong>Website:</strong>&nbsp;<a href="https://hifapetrol.ba" style="color: #3b82f6; text-decoration: none;">www.hifapetrol.ba</a>
                </p>
                <p style="margin: 5px 0; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">📍</span>
                  <strong>Address:</strong>&nbsp;Hotonj bb, 71320 Vogošća, Bosnia and Herzegovina
                </p>
              </div>
            </div>
            
            <!-- Professional Closing -->
            <div style="margin: 30px 0 0 0; padding: 20px 0; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Best regards,</p>
              <p style="margin: 0; color: #1e3a8a; font-weight: 600; font-size: 16px;">HIFA-PETROL Billing Department</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; font-weight: 600;">HIFA-PETROL d.o.o. Sarajevo</p>
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;">Tax ID: 4200468580006 | VAT: BA200468580006</p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">This is an automated message. Please do not reply to this email address.</p>
          </div>
          
        </div>
      </body>
    </html>
  `;
}

export function getAirlineEmailFromContact(contactDetails?: string | null): string | null {
  if (!contactDetails) return null;
  
  // Try to extract multiple emails from contact details, separated by comma
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = contactDetails.match(emailRegex);
  
  if (!matches || matches.length === 0) return null;
  
  // Join multiple emails with comma and space for proper email field format
  return matches.join(', ');
}
