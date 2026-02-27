import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = request.nextUrl.searchParams.get('limit') || '10';
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // Fetch from your backend server
    const response = await fetch(`${API_URL}/tenants/${userId}/recent-properties?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent properties');
    }
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching recent properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}