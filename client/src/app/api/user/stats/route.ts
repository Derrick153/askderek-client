import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // Fetch from your backend server
    const response = await fetch(`${API_URL}/tenants/${userId}/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}