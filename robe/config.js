// Supabase connection for the live storefront. Both values are public by design:
// the anon key can only read what Row Level Security and the public_listings view
// allow (see SETUP-STRIPE-SUPABASE.md §3.6). Never put the service role key here.
// Leave them empty to show the built-in sample cards.
window.ROBE_CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",
};
