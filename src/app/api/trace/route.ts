import { NextResponse } from 'next/server';
import { getFullTraceData } from '@/lib/trace-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID de trazabilidad.' }, { status: 400 });
  }

  const data = await getFullTraceData(id);
  return NextResponse.json(data);
}
