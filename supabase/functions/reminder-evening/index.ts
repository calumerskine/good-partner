// Evening reminder (7pm) - sends only to users with outstanding actions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface ReminderUser {
  profile_id: string
  user_id: string
  has_outstanding_actions: boolean
  outstanding_action_count: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type' 
      } 
    })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID')!
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get only users with outstanding actions (evening reminder)
    const { data: users, error } = await supabase.rpc('get_reminder_users', { only_with_outstanding: true })

    if (error) {
      console.error('Error fetching users:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!users || users.length === 0) {
      console.log('No users with outstanding actions for evening reminder')
      return new Response(
        JSON.stringify({ message: 'No evening reminders to send', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending evening reminders to ${users.length} users with outstanding actions`)

    const results = await Promise.all(
      (users as ReminderUser[]).map(async (user) => {
        try {
          const heading = '🌙 Evening Check-In'
          const message = `You still have ${user.outstanding_action_count} action${user.outstanding_action_count > 1 ? 's' : ''} to complete today. A few minutes can make a big difference!`
          
          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${oneSignalApiKey}`,
            },
            body: JSON.stringify({
              app_id: oneSignalAppId,
              include_external_user_ids: [user.user_id],
              contents: { en: message },
              headings: { en: heading },
              data: {
                type: 'evening_reminder',
                has_outstanding_actions: true,
                outstanding_count: user.outstanding_action_count,
              },
            }),
          })

          const result = await response.json()
          
          if (!response.ok) {
            console.error(`Failed for user ${user.user_id}:`, result)
            return { user_id: user.user_id, success: false, error: result }
          }
          
          console.log(`Sent evening reminder to user ${user.user_id}`)
          return { user_id: user.user_id, success: true, notification_id: result.id }
        } catch (error) {
          console.error(`Error for user ${user.user_id}:`, error)
          return { user_id: user.user_id, success: false, error: String(error) }
        }
      })
    )

    const successCount = results.filter(r => r.success).length
    
    return new Response(
      JSON.stringify({
        message: 'Evening reminders processed',
        total_users: users.length,
        success_count: successCount,
        failure_count: users.length - successCount,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
