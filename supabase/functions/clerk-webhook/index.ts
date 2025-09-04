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
    object: string
    created_at: number
    updated_at: number
    email_addresses: Array<{
      id: string
      object: string
      email_address: string
      verification: {
        status: string
      }
    }>
    first_name?: string
    last_name?: string
    username?: string
    image_url?: string
    primary_email_address_id?: string
    external_accounts?: Array<{
      id: string
      object: string
      provider: string
      identification_id: string
      provider_user_id: string
      approved_scopes: string
      email_address: string
      given_name?: string
      family_name?: string
      username?: string
      avatar_url?: string
    }>
  }
}

Deno.serve(async (req) => {
  try {
    console.log('=== WEBHOOK REQUEST RECEIVED ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Log environment variables (without exposing secrets)
    console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    // Get raw body
    const body = await req.text()
    console.log('Raw body length:', body.length)
    console.log('Raw body preview:', body.substring(0, 500))

    // Try to parse as JSON
    let payload;
    try {
      payload = JSON.parse(body)
      console.log('=== PARSED PAYLOAD ===')
      console.log('Type:', payload.type)
      console.log('Data ID:', payload.data?.id)
      console.log('Full payload keys:', Object.keys(payload))
      console.log('Data keys:', payload.data ? Object.keys(payload.data) : 'No data')
    } catch (parseError) {
      console.log('Failed to parse JSON:', parseError.message)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle different event types
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
    console.error('=== WEBHOOK ERROR ===', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleUserCreated(userData: any) {
  console.log('=== HANDLING USER CREATED ===')
  console.log('User data keys:', Object.keys(userData))
  console.log('User data:', JSON.stringify(userData, null, 2))

  const userId = userData.id
  if (!userId) {
    throw new Error('No user ID in payload')
  }

  // Extract name from various possible sources
  let name: string | null = null

  // Try direct name fields
  if (userData.first_name && userData.last_name) {
    name = `${userData.first_name} ${userData.last_name}`
  } else if (userData.first_name) {
    name = userData.first_name
  } else if (userData.last_name) {
    name = userData.last_name
  } else if (userData.username) {
    name = userData.username
  }

  // Try external accounts (GitHub, Google, etc.)
  if (!name && userData.external_accounts && Array.isArray(userData.external_accounts)) {
    const account = userData.external_accounts[0]
    if (account) {
      console.log('External account:', JSON.stringify(account, null, 2))
      if (account.given_name && account.family_name) {
        name = `${account.given_name} ${account.family_name}`
      } else if (account.given_name) {
        name = account.given_name
      } else if (account.family_name) {
        name = account.family_name
      } else if (account.username) {
        name = account.username
      }
    }
  }

  // Try email as fallback
  if (!name && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      name = email.split('@')[0]
    }
  }

  // Final fallback
  if (!name) {
    name = `User ${userId.slice(0, 8)}`
  }

  // Extract handle
  let handle = userData.username

  // Try external accounts for handle
  if (!handle && userData.external_accounts && Array.isArray(userData.external_accounts)) {
    handle = userData.external_accounts[0]?.username
  }

  // Email fallback for handle
  if (!handle && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      handle = email.split('@')[0]
    }
  }

  // Final fallback for handle
  if (!handle) {
    handle = `user_${userId.slice(0, 8)}`
  }

  console.log('Final extracted name:', name)
  console.log('Final extracted handle:', handle)

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      clerk_id: userId,
      name: name,
      image: userData.image_url || userData.external_accounts?.[0]?.avatar_url,
      handle: handle
    })

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  console.log('Profile created successfully for user:', userId)
}

async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  console.log('Updating user profile for:', userData.id)
  console.log('User data:', JSON.stringify(userData, null, 2))

  // Extract name from various sources
  let name = userData.first_name && userData.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : userData.first_name || userData.last_name || userData.username

  // If no name from direct fields, try external accounts (GitHub, Google)
  if (!name && userData.external_accounts && userData.external_accounts.length > 0) {
    const primaryAccount = userData.external_accounts[0]
    name = primaryAccount.given_name && primaryAccount.family_name
      ? `${primaryAccount.given_name} ${primaryAccount.family_name}`
      : primaryAccount.given_name || primaryAccount.family_name || primaryAccount.username
  }

  // Fallback to email username if still no name
  if (!name && userData.email_addresses && userData.email_addresses.length > 0) {
    const email = userData.email_addresses[0].email_address
    name = email.split('@')[0]
  }

  // Final fallback
  if (!name) {
    name = `User ${userData.id.slice(0, 8)}`
  }

  // Extract handle
  let handle = userData.username

  // If no username, try external accounts
  if (!handle && userData.external_accounts && userData.external_accounts.length > 0) {
    handle = userData.external_accounts[0].username
  }

  // If still no handle, use email username
  if (!handle && userData.email_addresses && userData.email_addresses.length > 0) {
    handle = userData.email_addresses[0].email_address.split('@')[0]
  }

  // Final fallback for handle
  if (!handle) {
    handle = `user_${userData.id.slice(0, 8)}`
  }

  console.log('Extracted name:', name)
  console.log('Extracted handle:', handle)

  const { error } = await supabase
    .from('profiles')
    .update({
      clerk_id: userData.id,
      name: name,
      image: userData.image_url,
      handle: handle
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
