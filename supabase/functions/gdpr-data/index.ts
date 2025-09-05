import { createClient } from 'jsr:@supabase/supabase-js@2'

interface GDPRRequest {
  action: 'export' | 'delete'
  userIdentifier: string // clerk_id or email
  confirmation?: string // For deletion: "DELETE_MY_DATA"
}

console.log('GDPR Data Function Started')

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Parse request
    const body: GDPRRequest = await req.json()
    const { action, userIdentifier, confirmation } = body

    if (!action || !userIdentifier) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action and userIdentifier' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find user by clerk_id or email
    let userQuery = supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userIdentifier)

    let userData = await userQuery.single()

    // If not found by clerk_id, try email
    if (!userData.data) {
      const emailQuery = supabase
        .from('profiles')
        .select('*')
        .eq('email', userIdentifier)

      userData = await emailQuery.single()
    }

    if (!userData.data) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const user = userData.data

    if (action === 'export') {
      // Export user data
      console.log(`Exporting data for user: ${user.clerk_id}`)

      // Get user papers
      const { data: userPapers, error: papersError } = await supabase
        .from('user_papers')
        .select(`
          *,
          papers (
            id,
            doi,
            title,
            authors,
            year,
            journal,
            abstract
          )
        `)
        .eq('user_id', user.id)

      if (papersError) {
        console.error('Error fetching user papers:', papersError)
      }

      const exportData = {
        user: {
          id: user.id,
          clerk_id: user.clerk_id,
          name: user.name,
          handle: user.handle,
          image: user.image,
          created_at: user.created_at,
          email: user.email
        },
        papers: userPapers || [],
        export_date: new Date().toISOString(),
        data_portability_format: 'GDPR Article 20'
      }

      return new Response(
        JSON.stringify(exportData, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="peerly-data-export-${user.clerk_id}.json"`
          }
        }
      )

    } else if (action === 'delete') {
      // Delete user data
      console.log(`Deleting data for user: ${user.clerk_id}`)

      // Safety check
      if (confirmation !== 'DELETE_MY_DATA') {
        return new Response(
          JSON.stringify({ error: 'Deletion requires confirmation: "DELETE_MY_DATA"' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Delete user papers first (due to foreign key constraints)
      const { error: deletePapersError } = await supabase
        .from('user_papers')
        .delete()
        .eq('user_id', user.id)

      if (deletePapersError) {
        console.error('Error deleting user papers:', deletePapersError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user papers' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Delete user profile
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (deleteProfileError) {
        console.error('Error deleting user profile:', deleteProfileError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user profile' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`Successfully deleted data for user: ${user.clerk_id}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User data has been permanently deleted',
          deleted_at: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "export" or "delete"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('GDPR function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
