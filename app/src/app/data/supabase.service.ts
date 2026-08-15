import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Thin wrapper around the Supabase client. The rest of the app (auth, sync,
 * sharing) goes through this so the client is created once and configured in
 * a single place.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        // On web the OAuth code comes back in the page URL and supabase-js
        // exchanges it automatically. On native the code arrives via the
        // `bloque://` deep link and we exchange it by hand.
        detectSessionInUrl: !Capacitor.isNativePlatform(),
      },
    }
  );

  get configured(): boolean {
    return !!environment.supabaseUrl && !!environment.supabaseAnonKey;
  }
}
