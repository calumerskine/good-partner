// Reminder dispatch — called every 5 minutes by pg_cron
// Handles morning, evening, and action-specific reminders in one pass
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface DueReminder {
  user_id: string
  reminder_type: 'morning' | 'evening' | 'action'
  has_outstanding_actions: boolean
  outstanding_count: number
  action_id: string | null
  action_title: string | null
  user_action_id: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID')!
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: reminders, error } = await supabase.rpc('get_due_reminders')
    if (error) {
      console.error('Error fetching due reminders:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders due', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Processing ${reminders.length} due reminders`)

    const sendNotification = async (
      userId: string,
      heading: string,
      message: string,
      data: Record<string, unknown>,
    ) => {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${oneSignalApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          include_external_user_ids: [userId],
          contents: { en: message },
          headings: { en: heading },
          data,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(result))
      return result
    }

    const results = await Promise.all(
      (reminders as DueReminder[]).map(async (reminder) => {
        try {
          if (reminder.reminder_type === 'morning') {
            const heading = reminder.has_outstanding_actions
              ? 'Complete Your Actions'
              : 'Choose an Action'
            const message = reminder.has_outstanding_actions
              ? `You have ${reminder.outstanding_count} action${reminder.outstanding_count > 1 ? 's' : ''} to complete today. Keep up the great work!`
              : 'Time to strengthen your relationship! Choose your action for today.'
            await sendNotification(reminder.user_id, heading, message, {
              type: reminder.has_outstanding_actions ? 'complete_actions' : 'choose_action',
              has_outstanding_actions: reminder.has_outstanding_actions,
              outstanding_count: reminder.outstanding_count,
            })

          } else if (reminder.reminder_type === 'evening') {
            const count = reminder.outstanding_count
            await sendNotification(
              reminder.user_id,
              'Evening Check-In',
              `You still have ${count} action${count > 1 ? 's' : ''} to complete. You've got this!`,
              {
                type: 'evening_reminder',
                has_outstanding_actions: true,
                outstanding_count: count,
              },
            )

          } else if (reminder.reminder_type === 'action') {
            await sendNotification(
              reminder.user_id,
              'Reminder',
              `Time for: ${reminder.action_title}`,
              {
                type: 'action_reminder',
                has_outstanding_actions: false,
                outstanding_count: 0,
              },
            )
            // Clear the one-shot reminder after sending
            const { error: clearError } = await supabase
              .from('user_actions')
              .update({ reminder_at: null })
              .eq('id', reminder.user_action_id)
            if (clearError) {
              console.error(`Failed to clear reminder_at for ${reminder.user_action_id}:`, clearError)
            }
          }

          return { user_id: reminder.user_id, type: reminder.reminder_type, success: true }
        } catch (err) {
          console.error(`Error processing reminder for user ${reminder.user_id}:`, err)
          return { user_id: reminder.user_id, type: reminder.reminder_type, success: false, error: String(err) }
        }
      }),
    )

    const successCount = results.filter((r) => r.success).length
    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        total: reminders.length,
        success_count: successCount,
        failure_count: reminders.length - successCount,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
