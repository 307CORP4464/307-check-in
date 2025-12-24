import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { checkInFormSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the input
    const validatedData = checkInFormSchema.parse(body);

    const supabase = getSupabase();

    // Check if pickup number already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingCheckIn } = await supabase
      .from('check_ins')
      .select('id')
      .eq('pickup_number', validatedData.pickup_number)
      .gte('check_in_time', today.toISOString())
      .single();

    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'This pickup number has already checked in today' },
        { status: 400 }
      );
    }

    // Insert the check-in
    const { data, error } = await supabase
      .from('check_ins')
      .insert([{
        ...validatedData,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Check-in successful' 
    });

  } catch (error) {
    console.error('Check-in error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .gte('check_in_time', today.toISOString())
      .order('check_in_time', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}
