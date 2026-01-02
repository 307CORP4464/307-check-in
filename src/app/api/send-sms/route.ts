import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, dockNumber, driverName, referenceNumber, appointmentTime } = await request.json();

    if (!phoneNumber || !dockNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const message = `
Hello ${driverName || 'Driver'}!

You've been assigned to ${dockNumber === 'Ramp' ? 'the Ramp' : `Dock ${dockNumber}`}.

Reference #: ${referenceNumber || 'N/A'}
Appointment: ${appointmentTime || 'N/A'}

Please proceed to your assigned dock.
    `.trim();

    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: phoneNumber,
    });

    return NextResponse.json({
      success: true,
      messageId: result.sid,
    });
  } catch (error: any) {
    console.error('SMS Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
