import nodemailer from 'nodemailer';

const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasEmailCredentials
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

export async function sendOTPEmail(to, otp) {
  if (!transporter) {
    throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS in Server/.env to send OTP emails.');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your GoalTracker OTP',
    text: `Your OTP for GoalTracker registration is: ${otp}`,
  };
  await transporter.sendMail(mailOptions);
}
