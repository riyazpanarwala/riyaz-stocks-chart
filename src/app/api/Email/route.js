import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function GET(request) {
  // Do whatever you want
  return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

// To handle a POST request to /api
export async function POST(req) {
  const { to, subject, text } = req.body;

  console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);

  // Configure your email transporter
  const transporter = nodemailer.createTransport({
    service: "gmail", // Use your email service provider (e.g., Gmail, Outlook)
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender's email address
    to: to, // Recipient's email address
    subject: subject, // Email subject
    text: text, // Email body
  };

  try {
    await transporter.sendMail(mailOptions);
    // Do whatever you want
    return NextResponse.json(
      { success: true, message: "Email sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    // Do whatever you want
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
