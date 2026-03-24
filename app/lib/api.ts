import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { XP_PER_COMPLETION } from "./xp";

// Query key factory for better type safety and management
const queryKeys = {
  hasOnboarded: (userId: string) => ["hasOnboarded", userId] as const,
  upcomingEvents: (userId: string) => ["upcomingEvents", userId] as const,
  notificationsEnabled: (userId: string) =>
    ["notificationsEnabled", userId] as const,
  activeActions: (userId: string) => ["activeActions", userId] as const,
  allActiveActions: () => ["activeActions"] as const,
  allUserActions: () => ["allUserActions"] as const,
  actionsCatalog: () => ["actionsCatalog"] as const,
  actionsCatalogByCategory: (category: string) =>
    ["actionsCatalog", category] as const,
  actionDetail: (actionId: string) => ["actionDetail", actionId] as const,
  userActionDetail: (userActionId: string) =>
    ["userActionDetail", userActionId] as const,
  userProfile: (userId: string) => ["userProfile", userId] as const,
  categories: () => ["categories"] as const,
  suggestedActions: () => ["suggestedActions"] as const,
  dailyContent: (dayNumber: number) => ["dailyContent", dayNumber] as const,
  reminderConfig: (userId: string) => ["reminderConfig", userId] as const,
};

const mutationKeys = {
  notifications: ["notifications"] as const,
  nukeUser: ["nukeUser"] as const,
  completeAction: ["completeAction"] as const,
  activateAction: ["activateAction"] as const,
  deactivateAction: ["deactivateAction"] as const,
  createProfile: ["createProfile"] as const,
  updateCategories: ["updateCategories"] as const,
  submitFeedback: ["submitFeedback"] as const,
  skipAction: ["skipAction"] as const,
  updateReminderConfig: ["updateReminderConfig"] as const,
  setActionReminder: ["setActionReminder"] as const,
  clearActionReminder: ["clearActionReminder"] as const,
};

type OnboardForm = {
  partnerName: string;
  events: {
    name: string;
    date: Date;
    type: "birthday" | "anniversary" | "custom";
    isRecurring: boolean;
  }[];
};

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: OnboardForm) => completeOnboarding(form),
    onSuccess: (user) => {
      // Invalidate the hasOnboarded so route guard re-evaluates
      queryClient.invalidateQueries({
        queryKey: queryKeys.hasOnboarded(user.id),
      });
      // Also invalidate the upcoming events query so new events are visible
      queryClient.invalidateQueries({
        queryKey: queryKeys.upcomingEvents(user.id),
      });
    },
  });
}

export async function completeOnboarding(form: OnboardForm) {
  // Create anonymous user at the end of onboarding
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInAnonymously();

  if (authError || !user) {
    throw authError ?? new Error("Failed to create anonymous user");
  }

  // TODO: Do all this work as a transaction via rpc for atomicity.
  const partnerRes = await supabase
    .from("partners")
    .insert({
      user_id: user.id,
      name: form.partnerName,
    })
    .select()
    .single();

  if (partnerRes.error) {
    throw partnerRes.error;
  }

  const events = form.events.map((event) => ({
    user_id: user.id,
    partner_id: partnerRes.data.id,
    name: event.name,
    date: event.date.toISOString(),
    type: event.type,
    is_recurring: event.isRecurring,
  }));

  const { error: eventError } = await supabase.from("events").insert(events);

  if (eventError) {
    console.error("Error creating events:", eventError);
    throw eventError;
  }

  return user;
}

export function useHasOnboarded(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hasOnboarded(userId!),
    queryFn: () => hasOnboarded(userId!),
    enabled: !!userId,
  });
}

export async function hasOnboarded(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found", which is expected for new users
    console.error("Error checking onboard status:", error);
  }

  return data !== null;
}

export function useGetUpcomingEvents(userId?: string) {
  return useQuery({
    queryKey: queryKeys.upcomingEvents(userId!),
    queryFn: () => getUpcomingEvents(),
    enabled: !!userId,
  });
}

export type PartnerEvent = {
  id: string;
  name: string;
  date: Date;
  type: "birthday" | "anniversary" | "custom";
  isRecurring: boolean;
};

type UpcomingEventResponse = {
  id: string;
  name: string;
  date: string;
  type: "birthday" | "anniversary" | "custom";
  is_recurring: boolean;
};
export async function getUpcomingEvents(): Promise<PartnerEvent[]> {
  const { data, error } = await supabase.rpc("get_upcoming_events", {
    limit_count: 3,
  });

  if (error) {
    throw error;
  }

  return data.map((event: UpcomingEventResponse) => ({
    id: event.id,
    name: event.name,
    date: new Date(event.date),
    type: event.type as "birthday" | "anniversary" | "custom",
    isRecurring: event.is_recurring,
  }));
}

export function useToggleNotificationsEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.notifications,
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      toggleNotificationsEnabled(userId, enabled),
    onMutate: async ({ userId, enabled }) => {
      // Cancel any outgoing refetches for the notifications query
      await queryClient.cancelQueries({
        queryKey: queryKeys.notificationsEnabled(userId),
      });

      // Snapshot the previous value for rollback
      const previousValue = queryClient.getQueryData<boolean>(
        queryKeys.notificationsEnabled(userId),
      );

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.notificationsEnabled(userId), enabled);

      // Return context with the previous value for rollback
      return { previousValue, userId };
    },
    onError: (error, variables, context) => {
      console.error(error);
      // Rollback to previous value on error
      if (context) {
        queryClient.setQueryData(
          queryKeys.notificationsEnabled(context.userId),
          context.previousValue,
        );
      }
    },
    onSettled: (data, error, { userId }) => {
      // Only invalidate once after the mutation completes
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationsEnabled(userId),
      });
    },
  });
}
async function toggleNotificationsEnabled(userId: string, enabled: boolean) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ notifications_enabled: enabled })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
}

export function useGetNotificationsEnabled(userId?: string) {
  return useQuery({
    queryKey: queryKeys.notificationsEnabled(userId!),
    queryFn: () => getNotificationsEnabled(userId!),
    enabled: !!userId,
  });
}
async function getNotificationsEnabled(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("notifications_enabled")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.notifications_enabled;
}

// ============================================================
// REMINDER CONFIGURATION
// ============================================================

export function useGetReminderConfig(userId?: string) {
  return useQuery({
    queryKey: queryKeys.reminderConfig(userId!),
    queryFn: () => getReminderConfig(userId!),
    enabled: !!userId,
  });
}

async function getReminderConfig(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "morning_reminder_enabled, evening_reminder_enabled, morning_reminder_time, evening_reminder_time",
    )
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return {
    morningReminderEnabled: data.morning_reminder_enabled ?? true,
    eveningReminderEnabled: data.evening_reminder_enabled ?? true,
    morningReminderTime: data.morning_reminder_time ?? "10:00",
    eveningReminderTime: data.evening_reminder_time ?? "19:00",
  };
}

export function useUpdateReminderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.updateReminderConfig,
    mutationFn: async ({
      userId,
      config,
    }: {
      userId: string;
      config: Partial<{
        morningReminderEnabled: boolean;
        eveningReminderEnabled: boolean;
        morningReminderTime: string;
        eveningReminderTime: string;
      }>;
    }) => {
      const dbConfig: Record<string, unknown> = {};
      if (config.morningReminderEnabled !== undefined) dbConfig.morning_reminder_enabled = config.morningReminderEnabled;
      if (config.eveningReminderEnabled !== undefined) dbConfig.evening_reminder_enabled = config.eveningReminderEnabled;
      if (config.morningReminderTime !== undefined) dbConfig.morning_reminder_time = config.morningReminderTime;
      if (config.eveningReminderTime !== undefined) dbConfig.evening_reminder_time = config.eveningReminderTime;
      const { error } = await supabase
        .from("user_profiles")
        .update(dbConfig)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reminderConfig(userId),
      });
      // Also invalidate userProfile so settings screen reflects changes
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
    },
  });
}

// ============================================================
// ACTION-SPECIFIC REMINDERS
// ============================================================

export function useSetActionReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.setActionReminder,
    mutationFn: async ({
      userId,
      userActionId,
      reminderAt,
    }: {
      userId: string;
      userActionId: string;
      reminderAt: string; // ISO timestamp
    }) => {
      const { error } = await supabase
        .from("user_actions")
        .update({ reminder_at: reminderAt })
        .eq("id", userActionId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeActions(userId),
      });
    },
  });
}

export function useClearActionReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.clearActionReminder,
    mutationFn: async ({
      userId,
      userActionId,
    }: {
      userId: string;
      userActionId: string;
    }) => {
      const { error } = await supabase
        .from("user_actions")
        .update({ reminder_at: null })
        .eq("id", userActionId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeActions(userId),
      });
    },
  });
}

export function useNukeUser() {
  return useMutation({
    mutationKey: mutationKeys.nukeUser,
    mutationFn: (userId: string) => nukeUser(userId),
  });
}
async function nukeUser(userId: string) {
  const { error } = await supabase
    .from("user_profiles")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
  await supabase.auth.signOut();
}

// ============================================================
// Actions API
// ============================================================

export type CatalogAction = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  reasoning: string | null;
};

/**
 * Get all actions from the catalog
 */
export function useGetActionsCatalog() {
  return useQuery({
    queryKey: queryKeys.actionsCatalog(),
    queryFn: getActionsCatalog,
    staleTime: Infinity, // Catalog rarely changes
  });
}

async function getActionsCatalog(): Promise<CatalogAction[]> {
  const { data, error } = await supabase
    .from("actions")
    .select(
      `
      id,
      title,
      description,
      reasoning,
      action_categories (
        name
      )
    `,
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  // Transform the data to match the CatalogAction interface
  const transformedData = (data || []).map((action) => ({
    id: action.id,
    category: (action.action_categories as any)?.name || "",
    title: action.title,
    description: action.description,
    reasoning: action.reasoning,
  }));

  // Sort by category name, then by title
  return transformedData.sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Get suggested actions
 */
export function useGetSuggestedActions(
  userId?: string,
  categories: Category[] = [],
) {
  return useQuery({
    queryKey: queryKeys.suggestedActions(),
    queryFn: () => getSuggestedActions(userId!, categories),
    staleTime: Infinity,
    enabled: !!userId && categories.length > 0,
  });
}

async function getSuggestedActions(
  userId: string,
  categories: Category[],
): Promise<CatalogAction[]> {
  // Get all user_actions for this user to find active or completed action IDs
  const { data: userActionsData, error: userActionsError } = await supabase
    .from("user_actions")
    .select("id, action_id, is_active")
    .eq("user_id", userId);

  if (userActionsError) {
    throw userActionsError;
  }

  const activeActionIds = new Set(
    userActionsData?.filter((ua) => ua.is_active).map((ua) => ua.action_id) ||
      [],
  );

  // Also exclude actions that have been completed
  const userActionIds = userActionsData?.map((ua: any) => ua.action_id) || [];
  const completedActionIds = new Set<string>();

  if (userActionIds.length > 0) {
    const { data: completionsData, error: completionsError } = await supabase
      .from("completions")
      .select("user_action_id, user_actions!inner(action_id)")
      .in("user_action_id", userActionsData?.map((ua: any) => ua.id) || []);

    // If completions query fails, we still filter active — don't throw
    if (!completionsError && completionsData) {
      completionsData.forEach((c: any) => {
        if (c.user_actions?.action_id) {
          completedActionIds.add(c.user_actions.action_id);
        }
      });
    }
  }

  // Exclude actions that are either currently active or have been completed
  const excludedIds = [...new Set([...activeActionIds, ...completedActionIds])];

  // Fetch today's skips for this user
  const { data: skipsData, error: skipsError } = await supabase
    .from("user_skips")
    .select("action_id")
    .eq("user_id", userId)
    .eq("skipped_at", new Date().toISOString().split("T")[0]);

  // If skips query fails, fall back to empty — skipped cards may re-appear but won't break the flow
  if (skipsError) {
    console.warn("Failed to fetch skips:", skipsError);
  }

  const skippedActionIds = skipsData?.map((s: any) => s.action_id) || [];
  const allExcludedIds = [...new Set([...excludedIds, ...skippedActionIds])];

  // Fetch available actions with tags, ordered by title
  let query = supabase
    .from("actions")
    .select(
      `
      id,
      title,
      description,
      reasoning,
      action_categories (
        name
      ),
      action_tags (
        tags (
          name
        )
      )
    `,
    )
    .in(
      "category_id",
      categories.map((cat) => cat.id),
    )
    .order("title", { ascending: true });

  if (allExcludedIds.length > 0) {
    query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) throw error;

  const actions: (CatalogAction & { isFeatured: boolean })[] = (data || []).map(
    (action: any) => ({
      id: action.id,
      category: action.action_categories?.name || "",
      title: action.title,
      description: action.description,
      reasoning: action.reasoning,
      isFeatured:
        action.action_tags?.some((at: any) => at.tags?.name === "featured") ||
        false,
    }),
  );

  // Sort by featured first, then by title
  actions.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return a.title.localeCompare(b.title);
  });

  // Distribute actions evenly across categories
  if (actions.length === 0) return [];

  const actionsByCategory = new Map<string, typeof actions>();
  actions.forEach((action) => {
    if (!actionsByCategory.has(action.category)) {
      actionsByCategory.set(action.category, []);
    }
    actionsByCategory.get(action.category)!.push(action);
  });

  // Round-robin across categories to fill 5 slots, picking featured-first within each
  const result: typeof actions = [];
  const categoryList = Array.from(actionsByCategory.values());
  let round = 0;

  while (result.length < 5) {
    let addedInRound = false;
    for (const catActions of categoryList) {
      if (result.length >= 5) break;
      if (round < catActions.length) {
        result.push(catActions[round]);
        addedInRound = true;
      }
    }
    if (!addedInRound) break;
    round++;
  }

  // Remove isFeatured from final result and shuffle
  const final = result.map(({ isFeatured, ...action }: any) => action);
  for (let i = final.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [final[i], final[j]] = [final[j], final[i]];
  }
  return final;
}

/**
 * Get actions catalog filtered by category
 */
export function useGetActionsByCategory(category: string) {
  return useQuery({
    queryKey: queryKeys.actionsCatalogByCategory(category),
    queryFn: () => getActionsByCategory(category),
    staleTime: Infinity,
  });
}

async function getActionsByCategory(
  category: string,
): Promise<CatalogAction[]> {
  // First get the category ID by name
  const { data: categoryData, error: categoryError } = await supabase
    .from("action_categories")
    .select("id")
    .eq("name", category.toUpperCase())
    .single();

  if (categoryError) {
    throw categoryError;
  }

  if (!categoryData) {
    return []; // Category not found
  }

  const { data, error } = await supabase
    .from("actions")
    .select(
      `
      id,
      title,
      description,
      reasoning,
      action_categories (
        name
      )
    `,
    )
    .eq("category_id", categoryData.id)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  // Transform the data to match the CatalogAction interface
  return (data || []).map((action) => ({
    id: action.id,
    category: (action.action_categories as any)?.name || "",
    title: action.title,
    description: action.description,
    reasoning: action.reasoning,
  }));
}

/**
 * Get a single action from the catalog by ID
 */
export function useGetActionDetail(actionId?: string) {
  return useQuery({
    queryKey: queryKeys.actionDetail(actionId!),
    queryFn: () => getActionDetail(actionId!),
    enabled: !!actionId,
    staleTime: Infinity,
  });
}

async function getActionDetail(actionId: string): Promise<CatalogAction> {
  const { data, error } = await supabase
    .from("actions")
    .select(
      `
      id,
      title,
      description,
      reasoning,
      action_categories (
        name
      )
    `,
    )
    .eq("id", actionId)
    .single();

  if (error) {
    throw error;
  }

  // Transform the data to match the CatalogAction interface
  return {
    id: data.id,
    category: (data.action_categories as any)?.name || "",
    title: data.title,
    description: data.description,
    reasoning: data.reasoning,
  };
}

export type UserAction = {
  id: string;
  actionId: string;
  userId: string;
  activatedAt: Date;
  isActive: boolean;
  completionCount: number;
  reminderAt: Date | null;
  action: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    reasoning: string | null;
  };
};

type UserActionResponse = {
  id: string;
  action_id: string;
  user_id: string;
  activated_at: string;
  is_active: boolean;
  reminder_at: string | null;
  actions: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    reasoning: string | null;
  } | null;
};

/**
 * Get user's active actions with completion counts
 * Query: SELECT * FROM user_actions WHERE user_id = $1 AND is_active = true
 * JOIN completions and COUNT(*)
 */
export function useGetActiveActions(userId?: string) {
  return useQuery({
    queryKey: queryKeys.activeActions(userId!),
    queryFn: () => getActiveActions(userId!),
    enabled: !!userId,
  });
}

async function getActiveActions(userId: string): Promise<UserAction[]> {
  // Get active user actions with their action details
  const { data: userActions, error } = await supabase
    .from("user_actions")
    .select(
      `
      id,
      action_id,
      user_id,
      activated_at,
      is_active,
      reminder_at,
      actions (
        id,
        title,
        description,
        reasoning,
        action_categories (
          name
        )
      )
    `,
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  if (!userActions) {
    return [];
  }

  // Get completion counts for each user action
  const userActionIds = userActions.map((ua) => ua.id);

  if (userActionIds.length === 0) {
    return [];
  }

  const { data: completionCounts, error: countError } = await supabase
    .from("completions")
    .select("user_action_id")
    .in("user_action_id", userActionIds);

  if (countError) {
    throw countError;
  }

  // Count completions per user action
  const countMap = new Map<string, number>();
  completionCounts?.forEach((completion) => {
    const current = countMap.get(completion.user_action_id) || 0;
    countMap.set(completion.user_action_id, current + 1);
  });

  // Map to UserAction type with completion counts
  const mappedActions = userActions
    .filter((ua: any) => ua.actions) // Filter out any without action data
    .map((ua: any) => ({
      id: ua.id,
      actionId: ua.action_id,
      userId: ua.user_id,
      activatedAt: new Date(ua.activated_at),
      isActive: ua.is_active,
      completionCount: countMap.get(ua.id) || 0,
      reminderAt: ua.reminder_at ? new Date(ua.reminder_at) : null,
      action: {
        id: ua.actions.id,
        category: ua.actions.action_categories?.name || "",
        title: ua.actions.title,
        description: ua.actions.description,
        reasoning: ua.actions.reasoning,
      },
    }));

  // Deduplicate by action_id: if multiple user_actions point to same action,
  // keep the most recently activated one and sum completion counts
  const deduplicatedMap = new Map<string, UserAction>();

  mappedActions.forEach((userAction) => {
    const existing = deduplicatedMap.get(userAction.actionId);

    if (!existing) {
      deduplicatedMap.set(userAction.actionId, userAction);
    } else {
      // If we already have this action, keep the more recent one
      // and sum the completion counts
      const totalCompletions =
        existing.completionCount + userAction.completionCount;

      if (userAction.activatedAt > existing.activatedAt) {
        // Use the newer activation, but keep summed completions
        deduplicatedMap.set(userAction.actionId, {
          ...userAction,
          completionCount: totalCompletions,
        });
      } else {
        // Keep existing, but update completion count
        deduplicatedMap.set(userAction.actionId, {
          ...existing,
          completionCount: totalCompletions,
        });
      }
    }
  });

  return Array.from(deduplicatedMap.values());
}

/**
 * Get ALL user's actions (both active and inactive) with completion counts
 * This is useful for the progress screen to show completion history
 */
export function useGetAllUserActions(userId?: string) {
  return useQuery({
    queryKey: queryKeys.allUserActions(),
    queryFn: () => getAllUserActions(userId!),
    enabled: !!userId,
  });
}

async function getAllUserActions(userId: string): Promise<UserAction[]> {
  // Get all user actions (active and inactive) with their action details
  const { data: userActions, error } = await supabase
    .from("user_actions")
    .select(
      `
      id,
      action_id,
      user_id,
      activated_at,
      is_active,
      reminder_at,
      actions (
        id,
        title,
        description,
        reasoning,
        action_categories (
          name
        )
      )
    `,
    )
    .eq("user_id", userId);
  // No filter on is_active - get all actions

  if (error) {
    throw error;
  }

  if (!userActions) {
    return [];
  }

  // Get completion counts for each user action
  const userActionIds = userActions.map((ua) => ua.id);

  if (userActionIds.length === 0) {
    return [];
  }

  const { data: completionCounts, error: countError } = await supabase
    .from("completions")
    .select("user_action_id")
    .in("user_action_id", userActionIds);

  if (countError) {
    throw countError;
  }

  // Count completions per user action
  const countMap = new Map<string, number>();
  completionCounts?.forEach((completion) => {
    const current = countMap.get(completion.user_action_id) || 0;
    countMap.set(completion.user_action_id, current + 1);
  });

  // Map to UserAction type with completion counts
  const mappedActions = userActions
    .filter((ua: any) => ua.actions) // Filter out any without action data
    .map((ua: any) => ({
      id: ua.id,
      actionId: ua.action_id,
      userId: ua.user_id,
      activatedAt: new Date(ua.activated_at),
      isActive: ua.is_active,
      completionCount: countMap.get(ua.id) || 0,
      reminderAt: ua.reminder_at ? new Date(ua.reminder_at) : null,
      action: {
        id: ua.actions.id,
        category: ua.actions.action_categories?.name || "",
        title: ua.actions.title,
        description: ua.actions.description,
        reasoning: ua.actions.reasoning,
      },
    }));

  // Deduplicate by action_id: if multiple user_actions point to same action,
  // keep the most recently activated one and sum completion counts
  const deduplicatedMap = new Map<string, UserAction>();

  mappedActions.forEach((userAction) => {
    const existing = deduplicatedMap.get(userAction.actionId);

    if (!existing) {
      deduplicatedMap.set(userAction.actionId, userAction);
    } else {
      // If we already have this action, keep the more recent one
      // and sum the completion counts
      const totalCompletions =
        existing.completionCount + userAction.completionCount;

      if (userAction.activatedAt > existing.activatedAt) {
        // Use the newer activation, but keep summed completions
        deduplicatedMap.set(userAction.actionId, {
          ...userAction,
          completionCount: totalCompletions,
        });
      } else {
        // Keep existing, but update completion count
        deduplicatedMap.set(userAction.actionId, {
          ...existing,
          completionCount: totalCompletions,
        });
      }
    }
  });

  return Array.from(deduplicatedMap.values());
}

/**
 * Complete an action
 * Mutation: INSERT INTO completions (user_action_id) VALUES ($1)
 */
export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.completeAction,
    mutationFn: (userActionId: string) => completeAction(userActionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.allActiveActions(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.allUserActions(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedActions(),
      });
      // Invalidate all user profile queries to refresh XP on progress screen.
      // Uses prefix matching: ["userProfile"] matches ["userProfile", userId]
      queryClient.invalidateQueries({
        queryKey: ["userProfile"],
      });
    },
  });
}

async function completeAction(userActionId: string) {
  // Insert the completion record
  const { data, error } = await supabase
    .from("completions")
    .insert({
      user_action_id: userActionId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Deactivate the user action after completion
  const { error: deactivateError } = await supabase
    .from("user_actions")
    .update({ is_active: false })
    .eq("id", userActionId);

  if (deactivateError) {
    console.error(
      "Error deactivating action after completion:",
      deactivateError,
    );
  }

  // Get the user_id from the user_action to increment XP
  let previousXp = 0;
  let newXp = 0;

  const { data: userAction, error: userActionError } = await supabase
    .from("user_actions")
    .select("user_id")
    .eq("id", userActionId)
    .single();

  if (userActionError) {
    console.error("Error fetching user action for XP increment:", userActionError);
  } else {
    const { data: xpResult, error: xpError } = await supabase.rpc("increment_xp", {
      p_user_id: userAction.user_id,
      p_amount: XP_PER_COMPLETION,
    });

    if (xpError) {
      console.error("Error incrementing XP:", xpError);
    } else {
      previousXp = xpResult.previous_xp;
      newXp = xpResult.new_xp;
    }
  }

  return { ...data, previousXp, newXp };
}

/**
 * Activate an action for a user
 * Creates a user_action record with is_active = true
 */
export function useActivateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.activateAction,
    mutationFn: ({ userId, actionId }: { userId: string; actionId: string }) =>
      activateAction(userId, actionId),
    onSuccess: (data, { userId }) => {
      // Invalidate active actions for this user
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeActions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedActions(),
      });
    },
  });
}

async function activateAction(userId: string, actionId: string) {
  // First, check if there's already a user_action for this user and action
  const { data: existingAction, error: fetchError } = await supabase
    .from("user_actions")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("action_id", actionId)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  // If an existing user_action exists, reactivate it
  if (existingAction) {
    const { data, error } = await supabase
      .from("user_actions")
      .update({
        is_active: true,
        activated_at: new Date().toISOString(), // Update activation time
      })
      .eq("id", existingAction.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // If no existing user_action, create a new one
  const { data, error } = await supabase
    .from("user_actions")
    .insert({
      user_id: userId,
      action_id: actionId,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Deactivate a user action
 * Sets is_active = false
 */
export function useDeactivateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deactivateAction,
    mutationFn: (userActionId: string) => deactivateAction(userActionId),
    onSuccess: () => {
      // Invalidate all active actions queries and suggested actions queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.allActiveActions(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedActions(),
      });
    },
  });
}

async function deactivateAction(userActionId: string) {
  const { data, error } = await supabase
    .from("user_actions")
    .update({ is_active: false })
    .eq("id", userActionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Skip an action for today
 * Creates a user_skips record with today's date
 */
export function useSkipAction() {
  return useMutation({
    mutationKey: mutationKeys.skipAction,
    mutationFn: ({ userId, actionId }: { userId: string; actionId: string }) =>
      skipAction(userId, actionId),
  });
}

async function skipAction(userId: string, actionId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("user_skips")
    .upsert(
      { user_id: userId, action_id: actionId, skipped_at: today },
      { onConflict: "user_id,action_id,skipped_at", ignoreDuplicates: true },
    );

  if (error) throw error;
}

/**
 * Get a user action with its completion count
 * This is useful for the action detail screen
 */
export function useGetUserAction(userActionId?: string) {
  return useQuery({
    queryKey: queryKeys.userActionDetail(userActionId!),
    queryFn: () => getUserAction(userActionId!),
    enabled: !!userActionId,
  });
}

async function getUserAction(userActionId: string) {
  // Get the user action with action details
  const { data: userAction, error } = await supabase
    .from("user_actions")
    .select(
      `
      id,
      action_id,
      user_id,
      activated_at,
      is_active,
      actions (
        id,
        title,
        description,
        reasoning,
        action_categories (
          name
        )
      )
    `,
    )
    .eq("id", userActionId)
    .single();

  if (error) {
    throw error;
  }

  // Get completion count
  const { data: completions, error: countError } = await supabase
    .from("completions")
    .select("id")
    .eq("user_action_id", userActionId);

  if (countError) {
    throw countError;
  }

  const ua = userAction as any;

  return {
    id: ua.id,
    actionId: ua.action_id,
    userId: ua.user_id,
    activatedAt: new Date(ua.activated_at),
    isActive: ua.is_active,
    completionCount: completions?.length || 0,
    action: ua.actions
      ? {
          id: ua.actions.id,
          category: ua.actions.action_categories?.name || "",
          title: ua.actions.title,
          description: ua.actions.description,
          reasoning: ua.actions.reasoning,
        }
      : null,
  };
}

// ============================================================
// Profile and Categories API
// ============================================================

export type Category = {
  id: string;
  name: string;
  description: string;
};

export type UserProfile = {
  id: string;
  userId: string;
  userTier: "free";
  categories: Category[];
  createdAt: Date;
  hasCompletedOnboarding: boolean;
  totalXp: number;
  currentStreakDays: number;
  totalDaysActive: number;
  morningReminderEnabled: boolean;
  eveningReminderEnabled: boolean;
  morningReminderTime: string; // 'HH:MM' UTC
  eveningReminderTime: string; // 'HH:MM' UTC
};

/**
 * Get all action categories
 */
export function useGetCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: getCategories,
    staleTime: Infinity, // Categories rarely change
  });
}

async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("action_categories")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get user's profile
 */
export function useGetUserProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId!),
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  });
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // First get the user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, user_id, user_tier, created_at, has_completed_onboarding, total_xp, current_streak_days, total_days_active, morning_reminder_enabled, evening_reminder_enabled, morning_reminder_time, evening_reminder_time")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    if (profileError.code === "PGRST116") {
      // No profile found
      return null;
    }
    throw profileError;
  }

  // Then get the associated categories
  const { data: userCategories, error: categoriesError } = await supabase
    .from("user_categories")
    .select(
      `
      action_categories (
        id,
        name,
        description
      )
    `,
    )
    .eq("profile_id", profile.id);

  if (categoriesError) {
    throw categoriesError;
  }

  const categories: Category[] =
    userCategories?.map((uc: any) => uc.action_categories).filter(Boolean) ||
    [];

  return {
    id: profile.id,
    userId: profile.user_id,
    categories: categories,
    userTier: profile.user_tier,
    createdAt: new Date(profile.created_at),
    hasCompletedOnboarding: profile.has_completed_onboarding,
    totalXp: profile.total_xp ?? 0,
    currentStreakDays: profile.current_streak_days ?? 0,
    totalDaysActive: profile.total_days_active ?? 0,
    morningReminderEnabled: profile.morning_reminder_enabled ?? true,
    eveningReminderEnabled: profile.evening_reminder_enabled ?? true,
    morningReminderTime: profile.morning_reminder_time ?? '10:00',
    eveningReminderTime: profile.evening_reminder_time ?? '19:00',
  };
}

/**
 * Create a user profile with chosen categories
 */
export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createProfile,
    mutationFn: ({
      userId,
      categoryIds,
      hasCompletedOnboarding,
    }: {
      userId: string;
      categoryIds: string[];
      hasCompletedOnboarding: boolean;
    }) => createUserProfile(userId, categoryIds, hasCompletedOnboarding),
    onSuccess: (data, { userId }) => {
      // Invalidate the user profile query so it refetches
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
    },
  });
}

async function createUserProfile(
  userId: string,
  categoryIds: string[],
  hasCompletedOnboarding: boolean,
): Promise<UserProfile> {
  // Create the user profile first
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      user_id: userId,
      has_completed_onboarding: hasCompletedOnboarding,
    })
    .select("id, user_id, created_at")
    .single();

  if (profileError) {
    throw profileError;
  }

  // Create user_categories records for each selected category
  if (categoryIds.length > 0) {
    const userCategoryRecords = categoryIds.map((categoryId) => ({
      profile_id: profile.id,
      category_id: categoryId,
    }));

    const { error: categoriesError } = await supabase
      .from("user_categories")
      .insert(userCategoryRecords);

    if (categoriesError) {
      throw categoriesError;
    }
  }

  // Return the profile with categories populated
  return (await getUserProfile(userId)) as UserProfile;
}

/**
 * Update user's profile categories
 */
export function useUpdateUserCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateCategories,
    mutationFn: ({
      userId,
      categoryIds,
    }: {
      userId: string;
      categoryIds: string[];
    }) => updateUserCategories(userId, categoryIds),
    onSuccess: (data, { userId }) => {
      // Invalidate the user profile query so it refetches
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
      // Invalidate suggested actions since they depend on categories
      queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedActions(),
      });
    },
  });
}

async function updateUserCategories(
  userId: string,
  categoryIds: string[],
): Promise<UserProfile> {
  // First get the user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  // Delete all existing user_categories for this profile
  const { error: deleteError } = await supabase
    .from("user_categories")
    .delete()
    .eq("profile_id", profile.id);

  if (deleteError) {
    throw deleteError;
  }

  // Create new user_categories records for each selected category
  if (categoryIds.length > 0) {
    const userCategoryRecords = categoryIds.map((categoryId) => ({
      profile_id: profile.id,
      category_id: categoryId,
    }));

    const { error: categoriesError } = await supabase
      .from("user_categories")
      .insert(userCategoryRecords);

    if (categoriesError) {
      throw categoriesError;
    }
  }

  // Return the updated profile with categories populated
  return (await getUserProfile(userId)) as UserProfile;
}

// ============================================================
// Feedback API
// ============================================================

export type NoticedValue = "not_yet" | "a_little" | "yes_definitely";
export type FeltValue = "neutral" | "good" | "great";

export interface FeedbackInput {
  completionId: string;
  wasNoticed: NoticedValue;
  felt: FeltValue;
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.submitFeedback,
    mutationFn: (input: FeedbackInput) => submitFeedback(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.allActiveActions(),
      });
    },
  });
}

async function submitFeedback(input: FeedbackInput) {
  const { completionId, wasNoticed, felt } = input;

  const { error } = await supabase
    .from("completions")
    .update({ was_noticed: wasNoticed, felt })
    .eq("id", completionId);

  if (error) {
    throw error;
  }
}

// ============================================================
// Daily Content API
// ============================================================

export type DailyContent = {
  id: string;
  dayNumber: number;
  headlineMessage: string;
  subtext: string | null;
};

export function useGetDailyContent(dayNumber: number | undefined) {
  return useQuery({
    queryKey: queryKeys.dailyContent(dayNumber ?? 0),
    queryFn: () => getDailyContent(dayNumber!),
    staleTime: Infinity,
    enabled: dayNumber !== undefined,
  });
}

async function getDailyContent(dayNumber: number): Promise<DailyContent | null> {
  // Fetch the closest content entry with day_number <= dayNumber, returning null if none exists
  const { data, error } = await supabase
    .from("daily_content")
    .select("id, day_number, headline_message, subtext")
    .lte("day_number", dayNumber)
    .order("day_number", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    id: data.id,
    dayNumber: data.day_number,
    headlineMessage: data.headline_message,
    subtext: data.subtext,
  };
}
