export function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定してください。",
    );
  }

  return { url, publishableKey };
}

export function getOwnerUserId() {
  const ownerUserId = process.env.OWNER_USER_ID;

  if (!ownerUserId) {
    throw new Error("OWNER_USER_ID を設定してください。");
  }

  return ownerUserId;
}
