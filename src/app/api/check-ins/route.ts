
export async function GET(request: Request) {
  try {
    // Your database query here
    const checkIns = await fetchCheckIns(); // Your logic
    
    return Response.json({ checkIns });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}
