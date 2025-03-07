import SibApiV3Sdk from 'sib-api-v3-sdk';

// Function to send verification code via Brevo Email
export async function sendVerificationCodeEmail(email, verificationCode) {
  try {
    // Configure API key
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    // Create API instance
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // Create email object
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    // Configure email
    sendSmtpEmail.sender = {
      email: 'codetribetime@gmail.com',
      name: 'Time Management System'
    };
    
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = 'Your Verification Code';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Verification Code</h2>
        <p>Your two-factor authentication code is:</p>
        <div style="background-color: #f5f5f5; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px;">
          ${verificationCode}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `;
    
    // Send the email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully. Message ID:', data.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}