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
    console.log('=== WEBHOOK RECEIVED ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    console.log('Webhook function started')

    // Log environment variables (without exposing secrets)
    console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    // Verify webhook signature (recommended for production)
    const body = await req.text()
    console.log('Raw body length:', body.length)
    console.log('Raw body preview:', body.substring(0, 500))

    const payload: ClerkWebhookEvent = JSON.parse(body)

    console.log('Parsed payload type:', payload.type)
    console.log('Parsed payload data id:', payload.data?.id)
    console.log('Parsed payload data object:', payload.data?.object)

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
    .insert({
      id: userData.id,
      clerk_id: userData.id,
      name: name,
      image: userData.image_url,
      handle: handle
    })

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  console.log('Profile created successfully')
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
