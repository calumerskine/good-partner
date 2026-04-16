-- Core tables for the daily actions app

-- action categories table: the master list of all possible action categories
CREATE TABLE action_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_profiles table: tracks each user's profile data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  relationship_status TEXT,
  gender TEXT,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  action_notifications_enabled BOOLEAN DEFAULT FALSE,
  current_streak_days INTEGER DEFAULT 0,
  last_completion_date DATE,
  total_days_active INTEGER DEFAULT 0,
  morning_reminder_enabled BOOLEAN DEFAULT FALSE,
  evening_reminder_enabled BOOLEAN DEFAULT FALSE,
  morning_reminder_time TIME DEFAULT '9:00',
  evening_reminder_time TIME DEFAULT '19:00',
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

-- user_categories table: many-to-many relationship between users and action categories
CREATE TABLE user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, category_id)
);

-- actions table: the master list of all possible actions
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_actions table: tracks which actions users have activated
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- For the "Remind me" bottom sheet
  reminder_at TIMESTAMPTZ, 
  -- To track if a card was dismissed/skipped for the day
  last_dismissed_at TIMESTAMPTZ,
  -- To handle the "Not today after all" logic (how many times it was skipped)
  skip_count INTEGER DEFAULT 0
);

CREATE TABLE user_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  skipped_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, action_id, skipped_at)
);

-- completions table: tracks each time a user completes an action
CREATE TABLE completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_action_id UUID NOT NULL REFERENCES user_actions(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  was_noticed TEXT DEFAULT NULL,
  felt TEXT CHECK (felt IN ('neutral', 'good', 'great'))
);

-- tags table: the master list of all possible tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- action_tags table: many-to-many relationship between actions and tags
CREATE TABLE action_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER UNIQUE NOT NULL, -- e.g., Day 1, Day 2
  headline_message TEXT NOT NULL,      -- "Everyone starts here"
  subtext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX idx_user_categories_profile_id ON user_categories(profile_id);
CREATE INDEX idx_user_categories_category_id ON user_categories(category_id);
CREATE INDEX idx_actions_category_id ON actions(category_id);
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action_id ON user_actions(action_id);
CREATE INDEX idx_user_actions_active ON user_actions(user_id, is_active);
CREATE INDEX idx_completions_user_action ON completions(user_action_id);
CREATE INDEX idx_user_profiles_user_tier ON user_profiles(user_tier);

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
BEGIN
    -- 1. Get the last completion date and current streak from user_profiles
    -- We join through user_actions to find the correct profile
    SELECT last_completion_date, current_streak_days 
    INTO last_date, current_streak
    FROM user_profiles
    JOIN user_actions ON user_actions.user_id = user_profiles.user_id
    WHERE user_actions.id = NEW.user_action_id;

    -- 2. Determine the new streak value
    IF last_date IS NULL THEN
        -- First time ever completing an action
        current_streak := 1;
    ELSIF last_date = CURRENT_DATE THEN
        -- Already completed something today, don't increment streak
        current_streak := current_streak; 
    ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Completed yesterday, increment streak
        current_streak := current_streak + 1;
    ELSE
        -- Streak broken (last completion was > 1 day ago)
        current_streak := 1;
    END IF;

    -- 3. Update the profile
    UPDATE user_profiles
    SET 
        current_streak_days = current_streak,
        last_completion_date = CURRENT_DATE,
        total_days_active = total_days_active + (CASE WHEN last_date = CURRENT_DATE THEN 0 ELSE 1 END)
    FROM user_actions
    WHERE user_profiles.user_id = user_actions.user_id
    AND user_actions.id = NEW.user_action_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streak ON completions;

CREATE TRIGGER trigger_update_streak
AFTER INSERT ON completions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

CREATE VIEW user_daily_status AS
SELECT 
  p.user_id,
  p.current_streak_days,
  (p.last_completion_date = CURRENT_DATE) AS is_completed_today
FROM user_profiles p;

-- Seed data for action categories
INSERT INTO action_categories (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ATTENTION', 'Being mentally/emotionally present, not distracted'),
  ('00000000-0000-0000-0000-000000000002', 'AFFECTION', 'Physical and verbal expressions of love'),
  ('00000000-0000-0000-0000-000000000003', 'INITIATIVE', 'Planning dates, handling tasks, taking on mental load'),
  ('00000000-0000-0000-0000-000000000004', 'REPAIR', 'Emotional skills + reconnecting after conflict');

-- Seed data for actions
INSERT INTO actions (id, category_id, title, description, reasoning) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Phone-Free First 10 Minutes', 'When you or your partner gets home, put your phone in another room for the first 10 minutes. Greet each other with a hug or kiss, ask about their day, and stay present. If 10 minutes feels hard, start with 5.', 'Couples who greet each other with full attention report stronger emotional connection and better communication. Being present in those first moments helps you both transition from work mode into being together.'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Active Listening Recap', 'After your partner shares something, repeat back what you heard in your own words before responding. Use phrases like ''So you''re saying...'' or ''Sounds like you''re frustrated because...'' Then let them confirm or correct you.', 'Reflecting back what you heard, even imperfectly, helps your partner feel understood and catches misunderstandings early. It''s one of the most reliable ways to improve communication without needing to be a perfect listener.'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Eye Contact Check-In', 'During one conversation today, stop what you''re doing, turn to face them, and maintain eye contact the whole time they''re talking. If full eye contact feels intense, focus on their face generally, but stay engaged.', 'Turning your body and making eye contact is one of the clearest signals that someone has your full attention. It makes your partner more likely to share what''s actually on their mind.'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ask One Follow-Up Question', 'When your partner tells you about their day, ask one genuine follow-up question about something they mentioned. Pick something they brought up and dig deeper: ''What did your boss say after that?'' or ''What happened next?'' or ''That sounds annoying, did it get resolved?'' Don''t just acknowledge and move on.', 'Responding to your partner''s stories with curiosity, not just acknowledgment, is one of the small daily behaviours that strengthens relationships over time. It shows their experiences matter to you, not just the headline.'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Device-Free Meal', 'Eat one meal together today with both phones away from the table, not just face-down, actually in another room. Pick breakfast, lunch, or dinner and commit to it being just the two of you talking. If you normally eat with the TV on, turn that off too.', 'Shared meals without distractions are one of the simplest daily rituals that keep couples connected. Even 15 minutes of uninterrupted conversation over food creates space for the kind of small talk that maintains intimacy.'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Morning Moment', 'Before checking your phone in the morning, spend 2-3 minutes talking or cuddling with your partner first. Ask about how they slept, mention something you''re looking forward to today, or just be close without saying much. Let your first interaction be with them, not your screen.', 'How you start the morning together sets a tone for the day. Couples who prioritise connection before diving into notifications and tasks report feeling more emotionally in sync throughout the day.'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Say You''re Busy, Then Follow Up', 'If you''re in the middle of focused work and your partner interrupts you, say so: ''I''m in the middle of something, can I come find you in 10 minutes?'' Then actually follow through and find them when you''re done. Don''t make them come back to you.', 'Following through on ''give me a minute'' shows you value what they wanted to tell you, even if the timing wasn''t perfect. It''s the difference between feeling dismissed and feeling like you''re still a priority once the work is done.'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Evening Wind-Down', 'Spend 10 minutes before bed talking about your days with no TV or phones in the background. Just the two of you on the couch or in bed, recapping what happened, what''s on your mind, or what''s coming up tomorrow. Make it a consistent end-of-day ritual.', 'Couples who have a regular check-in ritual stay more connected to each other''s daily lives and catch small issues before they build up. A brief wind-down creates a buffer between the stress of the day and going to sleep together.'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Curious Check-In', 'Ask about something your partner cares about right now that you don''t fully understand: their work project, a friend situation, a hobby they''re into. Be genuinely curious, ask questions, let them explain it, don''t just nod along. Show interest even if it''s not naturally your thing.', 'When partners show curiosity about each other''s separate interests and experiences, it prevents that slow drift of ''we have nothing to talk about anymore.'' You don''t have to share every interest, but staying curious keeps you connected to their world.'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Feelings Check-In', 'Ask: ''How are you feeling today, not just what happened, but how you''re feeling?'' Then just listen without trying to fix anything. Let them name emotions (stressed, excited, overwhelmed, grateful) without immediately offering solutions or advice.', 'Most daily conversations focus on logistics and events, not emotional states. Asking directly about feelings creates space for vulnerability and helps you stay connected to what''s actually going on with your partner internally.'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Work Boundary for One Evening', 'Pick one evening this week and set a hard stop time for work, no laptop after 7pm, no checking emails after dinner, whatever makes sense. Protect that time for being present with your partner, even if it means leaving something unfinished.', 'Work expands to fill whatever time you give it. Setting occasional hard boundaries signals to your partner that relationship time isn''t just ''whatever''s left over'' after everything else is done.'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Share Your Emotional State', 'Tell your partner one thing you''re feeling today (anxious, excited, overwhelmed, grateful) and why. Practice naming emotions out loud instead of just reporting facts about your day. ''I''m feeling stressed about the presentation tomorrow'' instead of just ''I have a presentation tomorrow.''', 'Sharing your internal emotional state helps your partner understand you better and creates opportunities for support. Many people default to sharing logistics and events but skip the feelings underneath, which is where real connection happens.'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'The Six-Second Kiss', 'Give a real kiss (not a peck) that lasts at least six seconds, count it out if you need to. Do it when saying goodbye, hello, or just randomly during the day.', 'Couples who regularly kiss for longer rather than treating it as a routine gesture maintain stronger physical and emotional intimacy over time. Six seconds is long enough to shift from habit to intention.'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002', 'The 20-Second Hug', 'Hug your partner for a full 20 seconds. You''ll want to pull away around 5-7 seconds, but keep going. Full body contact, no patting, just holding.', 'Twenty seconds is the threshold where oxytocin release kicks in, reducing stress and increasing feelings of safety for both people. It transforms a hug from a greeting gesture into an actual moment of connection.'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002', 'Send a Midday Text', 'Text something specific during the day: ''Still thinking about what you said this morning'' or an inside joke or a memory that just popped into your head. Not just ''love you'' or a logistics text, something that shows you''re thinking about them specifically.', 'Small, unexpected messages during the day remind your partner they''re on your mind even when you''re apart. It breaks up the routine of only connecting about schedules and to-do lists.'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000002', 'Specific Compliment', 'Give one specific compliment today. Not ''you look nice'', something like ''I love how you handled that conversation'' or ''You''re really good at making people feel comfortable'' or ''That color looks great on you.'' Notice something particular and name it.', 'Specific compliments land differently than generic ones because they show you''re actually paying attention to who your partner is and what they do. People remember the specific praise much longer than vague niceness.'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000002', 'Touch Every Time You Pass', 'Make it a game: every time you pass each other at home today, make physical contact. Hand on shoulder, quick hug, squeeze their arm, high-five, whatever feels natural. Just don''t let a pass by be touch free.', 'Frequent small touches throughout the day maintain physical connection without pressure or expectation. Couples who have more casual physical contact report feeling more connected overall, not just during intentional intimate moments.'),
  ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000002', 'Non-Sexual Physical Touch', 'Initiate touch with zero expectation of sex: shoulder rub while they''re working, hold hands during a show, play with their hair, scratch their back. Make it clear through your energy that this isn''t leading anywhere, it''s just about being close.', 'When all physical touch becomes a potential initiation for sex, partners can start avoiding touch altogether to avoid sending the wrong signal. Non-sexual touch maintains physical intimacy and closeness without pressure.'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000002', 'Leave a Hidden Note', 'Write something you appreciate on a sticky note and hide it somewhere they''ll find it later: bathroom mirror, laptop, wallet, car dashboard, inside their book. Keep it simple, it doesn''t need to be poetic, just genuine.', 'Small surprise gestures break up the routine and create positive moments throughout the day. A hidden note shows thoughtfulness and effort in a way that feels more deliberate than just saying something in passing.'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'Say Why You Love Them', 'Instead of just ''love you,'' add the why: ''I love how you always know how to make me laugh'' or ''I love that you never give up on things'' or ''I love the way you care about your friends.'' Be specific about what you appreciate about who they are.', '''I love you'' can become automatic over time. Adding the specific reason reminds your partner what you value about them as a person, not just that you''re in a relationship. It reinforces what makes them uniquely them.'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'The Goodbye Ritual', 'Create a consistent goodbye moment when you leave for work or errands. A specific type of kiss, a hug, a phrase like ''love you, have a good day,'' something that''s yours. Do it every single time one of you leaves, even if you''re annoyed or rushed.', 'Small rituals create predictability and safety in relationships. A consistent goodbye, especially when maintained even during conflict, becomes a anchor point that says ''we''re solid even when things are hard.'''),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'Gratitude Before Sleep', 'As you''re going to bed, tell them one thing from today you''re grateful for about them or your relationship. Could be something big or tiny: ''I''m grateful you made coffee this morning'' or ''I appreciated how patient you were with me earlier.''', 'Ending the day with gratitude shifts your focus toward what''s working rather than what''s not. Couples who regularly express appreciation for small things maintain more positive feelings about the relationship overall.'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002', 'Acknowledge Their Effort', 'Thank them for something emotional they do regularly that often goes unnoticed: ''I really appreciate how patient you are with me'' or ''Thank you for always checking in when I''m stressed'' or ''I notice how much you care about making us work.''', 'Emotional labor like staying patient, checking in, or managing their own reactions is invisible work that rarely gets acknowledged. Naming it specifically shows you see the effort they put into the relationship, not just the outcomes.'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000002', 'Compliment Them to Others', 'Say something positive about your partner to someone else while they can hear it, or tell them later what you said: ''I was telling my coworker how good you are at...'' or brag about something they did to a friend while they''re in the room. Make sure they know you''re proud of them.', 'Hearing your partner speak positively about you to others, or knowing they did, hits differently than a private compliment. It shows you''re not just being nice to their face; you genuinely admire them and want others to know it.'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000003', 'Book the Date Night', 'Pick a date in the next two weeks, choose the place/activity, make the reservation, and put it in both calendars. Don''t ask them to plan it or give you ideas, you fully own this one from start to finish.', 'Taking full ownership of planning removes the mental load from your partner and shows intentionality about spending quality time together. Having something concrete on the calendar also gives you both something to look forward to.'),
  ('00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000003', 'Handle One Invisible Task', 'Pick something that needs doing and just do it without being asked or announcing it: restock toilet paper, schedule car maintenance, buy a birthday gift for their parent, book the next dentist appointment. Choose something that usually falls to them or gets forgotten.', 'Invisible tasks are the endless small things that someone has to remember and manage. Handling one without being prompted shows you''re paying attention to what needs doing, not just waiting to be told.'),
  ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000003', 'Take One Thing Off Their Plate', 'Ask directly: ''What''s one thing you''re worried about getting done this week?'' Then do it or help them do it. Don''t just offer vaguely, actually take ownership of the specific thing they mention.', 'Asking what they need and then following through shows you''re willing to share the mental load, not just help when convenient. It also gives them permission to name something they''ve been carrying alone.'),
  ('00000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000003', 'Plan a Mini-Surprise', 'Set up one small thing for this week without asking permission first: pick up their favourite coffee on your way home, queue up a movie they mentioned wanting to watch, plan a walk to somewhere new, order takeout from the place they love. Small but intentional.', 'Small surprises show thoughtfulness and break up the predictability of routine. It signals you''re thinking about what would make them happy, not just responding to what they ask for.'),
  ('00000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000003', 'Weekend Plan by Wednesday', 'By Wednesday, text them 2-3 options for something to do this weekend. Make it easy, they just pick one, you handle the rest. Could be a hike, a restaurant reservation, a movie, visiting friends. Give them choices but own the execution.', 'Planning ahead reduces weekend decision fatigue and prevents the ''what do you want to do?'' loop. It also ensures you actually have plans together instead of letting the weekend disappear into errands and screens.'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000003', 'Remember and Execute', 'Think back to something your partner mentioned wanting or needing last week. Take one concrete step toward making it happen: order the book they mentioned, research the restaurant they wanted to try, schedule the appointment they''ve been putting off, buy the ingredient for the recipe they talked about.', 'Following through on something they mentioned, without them having to remind you, shows you''re listening and that their wants matter enough for you to take action. It''s the difference between ''yeah, that sounds nice'' and actually making it happen.'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000003', 'Own One Recurring Task', 'Pick one household or relationship task that happens regularly (weekly grocery run, taking out bins on collection day, managing a certain bill, scheduling social plans) and fully own it for the next month. Not ''help with it,'' actually take it off their radar completely.', 'Recurring tasks carry invisible mental load because someone has to remember they exist and when they need doing. Fully owning one removes both the doing and the remembering from your partner''s plate.'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000003', 'Calendar Check-In', 'Spend 5 minutes looking at the next two weeks together. Ask: ''What''s on your mind? Is there anything coming up you need help with?'' Look for birthdays, appointments, deadlines, or social commitments that might need planning or support.', 'Many conflicts happen because one person is stressed about something the other person didn''t realise was coming. A quick calendar sync catches potential stress points early and shows you''re thinking ahead as a team.'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000003', 'Create a New Ritual', 'Propose one new weekly ritual and get the first one on the calendar: Sunday breakfast together, Friday evening walk, Wednesday check-in over coffee. Pick something small and sustainable, then actually schedule the first occurrence.', 'Rituals create predictable moments of connection that don''t require constant planning or decision-making. Couples with regular shared rituals report feeling more like a team and less like roommates managing logistics.'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000003', 'Plan Something Big', 'Put a date 2-3 months out on the calendar for something special: concert tickets, weekend trip, fancy dinner reservation, show you both want to see. Book it now, not ''someday.'' Having something concrete to look forward to matters.', 'Research shows that anticipating positive experiences together increases relationship satisfaction almost as much as the experience itself. A future plan also signals you''re investing in the relationship long-term, not just getting through the week.'),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000003', 'Protect One Weekend Morning', 'Before scheduling anything for next weekend, block out one morning that''s just for the two of you. No errands, no obligations, no plans with other people. Schedule everything else around it, not through it.', 'Weekend time together often gets eaten by everything else on the list. Protecting time proactively before it gets claimed by other commitments shows that couple time is a priority, not just what''s left over.'),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000003', 'Decline One Thing for Relationship Time', 'Say no to one work or social obligation this week to protect time together. A work drinks invitation, an extra project, plans with friends you see often. Practice prioritising your relationship over being available to everyone else.', 'Relationships suffer when they always come second to everything else. Occasionally saying no to other commitments, and telling your partner you did so, demonstrates that time together is valuable and protected, not just assumed.'),
  ('00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000003', 'Weekly Relationship Check-In', 'Set up a recurring 15-minute ''state of us'' meeting, Sunday evenings work well. Ask: ''How are we doing? Anything bothering you? Anything you need more or less of from me?'' Make it a regular ritual, not just when there''s a problem.', 'Regular check-ins catch small issues before they become big resentments and create a designated space for relationship conversations. Couples who have structured check-ins report feeling more heard and less like they have to ''find the right moment'' to bring things up.'),
  ('00000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000004', 'Practice Naming Your Emotions', 'During any conversation today, try saying ''I feel [emotion]'' instead of ''You always [behaviour].'' Take ownership of your feelings: ''I feel overwhelmed'' instead of ''You never help'' or ''I feel disconnected lately'' instead of ''You''re always on your phone.''', 'Starting with ''you always'' or ''you never'' immediately puts people on the defensive. Naming your own emotions keeps the focus on your experience rather than blaming, which makes your partner more likely to hear you instead of shutting down.'),
  ('00000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000004', 'Ask How Something Made Them Feel', 'Instead of assuming or defending when there''s tension, pause and ask: ''How are you feeling about this?'' or ''What''s going on for you right now?'' Then listen to understand what they experienced, not to prepare your response.', 'Most conflicts escalate because both people are focused on defending their intentions rather than understanding impact. Asking about their experience, and actually listening, shifts the conversation from ''who''s right'' to ''what happened between us.'''),
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000004', 'Share a Vulnerability', 'Tell them one thing you''re worried about or insecure about in the relationship. Could be ''I worry I''m not doing enough'' or ''I feel insecure when you don''t respond to my texts'' or ''I''m nervous we''re drifting apart.'' Be honest even when it''s uncomfortable.', 'Vulnerability invites connection and honesty in return. When you share what you''re actually worried about instead of just criticising or withdrawing, it gives your partner a chance to understand you and respond to what''s really going on.'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000004', 'Thank Them for Emotional Work', 'Acknowledge something emotional they do regularly that often goes unnoticed: ''Thank you for being patient with me when I''m stressed'' or ''I appreciate that you always try to understand my side even when we disagree'' or ''I notice how you manage your reactions when I''m being difficult.''', 'Emotional regulation, patience, and trying to understand during conflict are all forms of invisible work. Acknowledging that your partner is putting in effort even when things are hard helps them feel seen and makes them more likely to keep trying.'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000004', 'Notice When You''re Getting Defensive', 'Catch yourself in the moment when you feel that urge to justify, explain, or counter-argue, and say it out loud: ''I''m getting defensive right now. Let me take a breath and try again.'' Then actually pause and listen to what they''re saying.', 'Defensiveness is one of the most reliable predictors of conflict escalation. Simply naming it when it''s happening breaks the cycle and shows your partner you''re trying to stay engaged rather than just winning the argument.'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000004', 'Make a Full Apology', 'Use the complete formula: ''I''m sorry for [specific behaviour]. I understand it made you feel [emotion]. Next time I''ll [specific change].'' No ''but,'' no justifications, no ''I''m sorry you feel that way.'' Own what you did and what you''ll do differently.', 'Partial apologies that include justifications or deflection don''t actually repair anything. A full apology that names what happened, acknowledges impact, and commits to change gives your partner something concrete to accept and helps rebuild trust.'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000004', 'Ask for a Do-Over', 'If a conversation went badly, say: ''That didn''t go the way I wanted. Can we start over? I want to understand what you were trying to tell me.'' Then actually try again with fresh energy, not just rehashing the same argument.', 'Conversations derail all the time: someone''s tired, defensive, or just caught off guard. Asking for a do-over acknowledges that the first attempt didn''t work and shows you care more about connecting than being right or moving on.'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000004', 'Take Full Responsibility', 'Say out loud, with no justification or context: ''That was on me. I handled that poorly.'' Then stop talking and listen. Don''t explain why you did it, don''t add ''but you also,'' just own your part completely.', 'Taking responsibility without hedging or defending is rare and powerful. It signals that you''re prioritising the relationship over your ego and gives your partner space to soften rather than having to keep pushing to be heard.'),
  ('00000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000004', 'Ask What They Need', 'After a fight or tense moment, ask directly: ''What do you need from me right now to feel better? Space? To talk more? A hug?'' Then actually do what they say, even if it''s not what you would need.', 'People need different things after conflict, some need to process alone, others need reassurance right away. Asking instead of assuming shows you''re willing to meet them where they are rather than just doing what would make you feel better.'),
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000004', 'Circle Back After Cooling Off', 'If you both needed space after an argument, be the one to initiate reconnection within a few hours: ''I''ve had time to think. Can we talk about what happened?'' Don''t wait for them to come to you or let it sit unresolved for days.', 'Someone has to be willing to restart the conversation after cooling off, and waiting to see who breaks first creates unnecessary distance. Taking the initiative to reconnect shows the relationship matters more than who ''gives in'' first.'),
  ('00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000004', 'Acknowledge Their Perspective', 'Even if you still disagree, validate their experience: ''I can see how from your side, it looked like I was dismissing you'' or ''I understand why that hurt you'' or ''That makes sense that you felt that way.'' You don''t have to agree to acknowledge their reality.', 'Most people don''t need you to admit you''re completely wrong, they need to know you understand why they''re upset. Validation doesn''t mean agreeing; it means showing you can see the situation through their eyes, which often defuses conflict faster than anything else.'),
  ('00000000-0000-0000-0000-000000000049', '00000000-0000-0000-0000-000000000004', 'Identify Your Part', 'Reflect on your last argument. Text or tell them one specific thing you could have done better, even if you think you were mostly right. ''I shouldn''t have raised my voice'' or ''I should have listened instead of jumping to solutions'' or ''I was defensive when you were just trying to tell me how you felt.''', 'Taking responsibility for even a small part of a conflict, without waiting for them to do it first, breaks the stalemate of mutual blame. It shows you''re more interested in moving forward together than keeping score of who was more wrong.'),
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000004', 'Make a Repair Attempt', 'During or right after tension, try humour, affection, or vulnerability to break the cycle: ''I''m being defensive, aren''t I?'' or ''Can we hug even though we''re annoyed?'' or ''This is silly, we''re both tired.'' Use something that acknowledges the tension and tries to soften it.', 'Repair attempts are small gestures during conflict that signal ''we''re okay even though this is hard.'' Couples who successfully use repair attempts, even clumsy ones, recover from fights faster and prevent arguments from spiralling into lasting damage.'),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000004', 'Follow Through on Your Promise', 'If you said you''d change something during a conflict, do one concrete action today that proves you meant it. If you said you''d be more present, put your phone away tonight. If you said you''d help more, handle a task without being asked. Show don''t just tell.', 'Apologies and promises during conflict are easy. Following through afterward is what actually rebuilds trust. One concrete action that shows you listened and you''re trying matters more than ten more apologies.');


-- Seed data for tags
INSERT INTO tags (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'featured');

-- Seed data for action_tags
INSERT INTO action_tags (id, action_id, tag_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001');

INSERT INTO daily_content (id, day_number, headline_message, subtext) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Everyone starts here.', ''),
  ('00000000-0000-0000-0000-000000000002', 2, 'You came back.', ''),
  ('00000000-0000-0000-0000-000000000003', 3, 'It''s starting to stick.', ''),
  ('00000000-0000-0000-0000-000000000004', 4, 'Most people quit around now. You didn''t.', ''),
  ('00000000-0000-0000-0000-000000000005', 5, 'Five days in.', ''),
  ('00000000-0000-0000-0000-000000000006', 6, 'Almost a week.', ''),
  ('00000000-0000-0000-0000-000000000007', 7, 'One week in.', ''),
  ('00000000-0000-0000-0000-000000000008', 8, 'Week two starts now.', ''),
  ('00000000-0000-0000-0000-000000000009', 9, 'Keep the pace.', ''),
  ('00000000-0000-0000-0000-000000000010', 10, 'Double digits.', ''),
  ('00000000-0000-0000-0000-000000000011', 11, 'Still here. So is the work.', ''),
  ('00000000-0000-0000-0000-000000000012', 12, 'Getting consistent.', ''),
  ('00000000-0000-0000-0000-000000000013', 13, 'One more day to two weeks.', ''),
  ('00000000-0000-0000-0000-000000000014', 14, 'Two weeks. You''re building something real.', ''),
  ('00000000-0000-0000-0000-000000000015', 15, 'Halfway to a month.', ''),
  ('00000000-0000-0000-0000-000000000016', 16, 'This is a habit now.', ''),
  ('00000000-0000-0000-0000-000000000017', 17, 'Keep going.', ''),
  ('00000000-0000-0000-0000-000000000018', 18, 'Almost three weeks.', ''),
  ('00000000-0000-0000-0000-000000000019', 19, 'One more day.', ''),
  ('00000000-0000-0000-0000-000000000020', 20, 'Twenty days of showing up.', ''),
  ('00000000-0000-0000-0000-000000000021', 21, 'Three weeks. This is who you''re becoming.', ''),
  ('00000000-0000-0000-0000-000000000022', 22, 'Don''t stop now.', ''),
  ('00000000-0000-0000-0000-000000000023', 23, 'One week to go.', ''),
  ('00000000-0000-0000-0000-000000000024', 24, 'Getting close.', ''),
  ('00000000-0000-0000-0000-000000000025', 25, 'Twenty-five days in.', ''),
  ('00000000-0000-0000-0000-000000000026', 26, 'Four days left.', ''),
  ('00000000-0000-0000-0000-000000000027', 27, 'Almost there.', ''),
  ('00000000-0000-0000-0000-000000000028', 28, 'Four weeks done.', ''),
  ('00000000-0000-0000-0000-000000000029', 29, 'One more day.', ''),
  ('00000000-0000-0000-0000-000000000030', 30, 'This is who you are now.', '');
  

-- ============================================================================
-- REMINDER DISPATCH: Single RPC for all due reminders
-- ============================================================================

CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
  user_id UUID,
  reminder_type TEXT,
  has_outstanding_actions BOOLEAN,
  outstanding_count BIGINT,
  action_id UUID,
  action_title TEXT,
  user_action_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH
  user_action_status AS (
    SELECT
      ua.user_id,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM completions c
          WHERE c.user_action_id = ua.id
          AND c.completed_at::DATE = CURRENT_DATE
        )
      ) AS outstanding_count
    FROM user_actions ua
    WHERE ua.is_active = true
    GROUP BY ua.user_id
  ),
  eligible_users AS (
    SELECT
      up.user_id,
      up.timezone,
      up.morning_reminder_enabled,
      up.evening_reminder_enabled,
      up.morning_reminder_time,
      up.evening_reminder_time,
      COALESCE(uas.outstanding_count, 0) AS outstanding_count,
      COALESCE(uas.outstanding_count, 0) > 0 AS has_outstanding
    FROM user_profiles up
    LEFT JOIN user_action_status uas ON uas.user_id = up.user_id
    WHERE
      up.has_completed_onboarding = true
  )
  -- Morning reminders: fire when the user's local time matches their stored morning time
  SELECT
    eu.user_id,
    'morning'::TEXT,
    eu.has_outstanding,
    eu.outstanding_count,
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID
  FROM eligible_users eu
  WHERE
    eu.morning_reminder_enabled = true
    AND (NOW() AT TIME ZONE eu.timezone)::time
      BETWEEN eu.morning_reminder_time - INTERVAL '2 minutes 30 seconds'
          AND eu.morning_reminder_time + INTERVAL '2 minutes 30 seconds'

  UNION ALL

  -- Evening reminders: only users WITH outstanding actions, at their evening time
  SELECT
    eu.user_id,
    'evening'::TEXT,
    TRUE::BOOLEAN,
    eu.outstanding_count,
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID
  FROM eligible_users eu
  WHERE
    eu.evening_reminder_enabled = true
    AND eu.has_outstanding = true
    AND (NOW() AT TIME ZONE eu.timezone)::time
      BETWEEN eu.evening_reminder_time - INTERVAL '2 minutes 30 seconds'
          AND eu.evening_reminder_time + INTERVAL '2 minutes 30 seconds'

  UNION ALL

  -- Action-specific one-shot reminders
  SELECT
    ua.user_id,
    'action'::TEXT,
    FALSE::BOOLEAN,
    0::BIGINT,
    ua.action_id,
    a.title,
    ua.id
  FROM user_actions ua
  JOIN actions a ON a.id = ua.action_id
  JOIN user_profiles up ON up.user_id = ua.user_id
  WHERE
    up.action_notifications_enabled = true
    AND ua.is_active = true
    AND ua.reminder_at BETWEEN
      (NOW() - INTERVAL '2 minutes 30 seconds')
      AND (NOW() + INTERVAL '2 minutes 30 seconds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_due_reminders() TO service_role;

CREATE INDEX IF NOT EXISTS idx_user_actions_reminder_at
  ON user_actions(reminder_at)
  WHERE reminder_at IS NOT NULL;

  