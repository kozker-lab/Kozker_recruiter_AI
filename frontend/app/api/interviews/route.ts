import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { data: assignments, error } = await supabase
      .from('interview_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !assignments || assignments.length === 0) {
      // Mock assigned interviews for demonstration
      return NextResponse.json({
        success: true,
        interviews: [
          {
            id: 'int-001',
            candidate_name: 'Priya Nair',
            job_title: 'Senior React Developer',
            round_name: 'Technical Architecture & System Design',
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
            status: 'scheduled',
            experience: '6+ years React, TypeScript & Next.js',
            evaluation_areas: ['React Architecture', 'TypeScript', 'System Design', 'Communication']
          },
          {
            id: 'int-002',
            candidate_name: 'Rahul Mehta',
            job_title: 'Backend Python Engineer',
            round_name: 'FastAPI & Microservices Deep Dive',
            scheduled_at: new Date(Date.now() + 172800000).toISOString(),
            status: 'scheduled',
            experience: '4 years FastAPI, PostgreSQL & Docker',
            evaluation_areas: ['API Design', 'Database Queries', 'Concurrency', 'Problem Solving']
          }
        ]
      });
    }

    return NextResponse.json({ success: true, interviews: assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch assigned interviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { assignment_id, recommendation, notes, ratings } = await request.json();

    if (!assignment_id || !recommendation) {
      return NextResponse.json({ error: 'Assignment ID and recommendation decision are required' }, { status: 400 });
    }

    const { data: feedback, error } = await supabase
      .from('interview_feedback')
      .insert({
        assignment_id,
        recommendation,
        ratings: ratings || {},
        notes: notes || ''
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit interview feedback' }, { status: 500 });
  }
}
