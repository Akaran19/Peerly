// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
    username?: string
    image_url?: string
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Webhook function started')

    // Log environment variables (without exposing secrets)
    console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    // Verify webhook signature (recommended for production)
    const body = await req.text()
    console.log('Raw body length:', body.length)
    console.log('Raw body preview:', body.substring(0, 200))

    const payload: ClerkWebhookEvent = JSON.parse(body)

    console.log('Parsed payload type:', payload.type)
    console.log('Parsed payload data id:', payload.data?.id)

    switch (payload.type) {
      case 'user.created':
        await handleUserCreated(payload.data)
        break
      case 'user.updated':
        await handleUserUpdated(payload.data)
        break
      case 'user.deleted':
        await handleUserDeleted(payload.data)
        break
      default:
        console.log('Unhandled event type:', payload.type)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleUserCreated(userData: ClerkWebhookEvent['data']) {
  console.log('Creating user profile for:', userData.id)

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userData.id,
      email: userData.email_addresses[0]?.email_address,
      name: userData.first_name && userData.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : userData.first_name || userData.last_name || userData.username,
      image: userData.image_url,
      handle: userData.username || userData.email_addresses[0]?.email_address?.split('@')[0]
    })

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  console.log('Profile created successfully')
}

async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  console.log('Updating user profile for:', userData.id)

  const { error } = await supabase
    .from('profiles')
    .update({
      email: userData.email_addresses[0]?.email_address,
      name: userData.first_name && userData.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : userData.first_name || userData.last_name || userData.username,
      image: userData.image_url,
      handle: userData.username || userData.email_addresses[0]?.email_address?.split('@')[0]
    })
    .eq('id', userData.id)

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  console.log('Profile updated successfully')
}

async function handleUserDeleted(userData: ClerkWebhookEvent['data']) {
  console.log('Deleting user profile for:', userData.id)

  // Note: You might want to soft delete instead of hard delete
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userData.id)

  if (error) {
    console.error('Error deleting profile:', error)
    throw error
  }

  console.log('Profile deleted successfully')
}
