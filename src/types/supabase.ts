/**
 * ============================================================================
 * ŞEMA TİPLERİ — `supabase gen types typescript` biçiminde
 * ============================================================================
 * `supabase/migrations/0001_init.sql` + `0002_agents_auth_link.sql` şemasının
 * makine okunur karşılığı. Supabase istemcilerine generic olarak veriliyor;
 * tablo adları, kolon adları, filtre değerleri ve insert/update gövdeleri
 * derleme zamanında denetleniyor. İç içe gömme (`agent:agents(*)`) ve ilişki
 * sayımı (`interests:…(count)`) çıkarımı `Relationships` bloklarına dayanır —
 * o yüzden yabancı anahtarlar burada eksiksiz sayılmış durumda.
 *
 * ---------------------------------------------------------------------------
 * NASIL ÜRETİLİR / GÜNCELLENİR
 * ---------------------------------------------------------------------------
 *   npm run gen:types
 *
 * Komut Supabase Management API'sini kullanır ve bir kişisel erişim jetonu
 * ister (`SUPABASE_ACCESS_TOKEN`, supabase.com/dashboard/account/tokens).
 * Jeton kurulmadan da proje çalışır: bu dosya elle, üreticinin çıktı biçimine
 * birebir sadık kalınarak yazıldı.
 *
 * Çıktı bu dosyanın ÜZERİNE YAZILMAZ, `supabase.generated.ts` dosyasına
 * düşer — aşağıdaki daraltmalar sessizce kaybolmasın diye. İki dosyayı
 * karşılaştırıp farkı buraya taşıyın, sonra üretilen dosyayı silin.
 *
 * ---------------------------------------------------------------------------
 * ÜRETİCİDEN TEK BİLİNÇLİ SAPMA
 * ---------------------------------------------------------------------------
 * Şemada enum yok; sınırlı değer kümeleri CHECK kısıtıyla tutuluyor (gerekçe
 * `0001_init.sql` başlığında). CHECK kısıtı üreticinin göremediği bir bilgi,
 * bu yüzden `supabase gen types` o kolonları düz `string` olarak yazar.
 * Aşağıda birlik tipleri elle daraltıldı:
 *
 *   listings.category   listings.status   listings.currency
 *   customers.status    customer_listing_interests.intent
 *   customer_timeline_events.event_type   activity_log.event_type
 *   offers.status       agents.role       agent_audit_log.action
 *   appointments.appointment_type         appointments.status
 *
 * Üreticiyi çalıştırdıktan sonra bu on iki daraltma yeniden uygulanmalı; aksi
 * halde `types/database.ts` üzerinden tüm arayüz `string` görmeye başlar ve
 * rozet/etiket sözlükleri sessizce derlenir.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* -------------------------------------------------------------------------- */
/* CHECK kısıtlarından daraltılan birlik tipleri                               */
/* -------------------------------------------------------------------------- */

export type ListingCategory =
  | "satilik"
  | "kiralik"
  | "arsa"
  | "villa"
  | "ofis";
export type ListingStatus = "aktif" | "pasif" | "taslak" | "satildi";
export type Currency = "TRY" | "USD" | "EUR";
export type CustomerStatus = "sicak" | "normal" | "soguk";
export type InterestIntent = "purchase" | "rent";
export type CustomerEventType =
  | "created"
  | "called"
  | "viewed"
  | "offer_sent"
  | "negotiation"
  | "purchased"
  | "lost";
export type ActivityEventType =
  | "listing_created"
  | "sale_closed"
  | "offer_received"
  | "customer_added"
  | "appointment_scheduled";
export type OfferStatus = "pending" | "accepted" | "rejected" | "expired";

/**
 * Yetkilendirme rolü. `agents.title` (görünen unvan) ile karıştırılmamalı:
 * unvan serbest metin ve yalnızca gösterim, rol RLS politikalarının okuduğu
 * alan. Ayrım `0002_agents_auth_link.sql` içinde gerekçelendirildi.
 */
export type AgentRole = "patron" | "ofis_muduru" | "danisman";

/**
 * Randevu kategorisi. Renk kodlaması buradan türüyor — eşleme
 * `src/lib/appointments.ts` içinde, tasarım token'larına bağlı.
 */
export type AppointmentType =
  | "ev_gezme"
  | "telefon_gorusmesi"
  | "ofis_gorusmesi"
  | "sozlesme_imzalama"
  | "diger";

export type AppointmentStatus = "planlandi" | "tamamlandi" | "iptal";

/** `agent_audit_log.action` — rol ve prim değişikliğinin izi. */
export type AgentAuditAction =
  | "invited"
  | "profile_updated"
  | "role_changed"
  | "commission_changed"
  | "deactivated"
  | "reactivated";

/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          full_name: string;
          initials: string;
          title: string;
          role: AgentRole;
          email: string;
          phone: string;
          user_id: string | null;
          avatar_url: string | null;
          commission_rate: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          initials: string;
          title: string;
          role?: AgentRole;
          email: string;
          phone?: string;
          user_id?: string | null;
          avatar_url?: string | null;
          commission_rate?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          initials?: string;
          title?: string;
          role?: AgentRole;
          email?: string;
          phone?: string;
          user_id?: string | null;
          avatar_url?: string | null;
          commission_rate?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_audit_log: {
        Row: {
          id: string;
          agent_id: string;
          actor_agent_id: string | null;
          action: AgentAuditAction;
          field: string | null;
          old_value: string | null;
          new_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          actor_agent_id?: string | null;
          action: AgentAuditAction;
          field?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          actor_agent_id?: string | null;
          action?: AgentAuditAction;
          field?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_audit_log_actor_agent_id_fkey";
            columns: ["actor_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_audit_log_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          currency: Currency;
          area_sqm: number;
          room_count: number;
          category: ListingCategory;
          status: ListingStatus;
          city: string;
          district: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          images: string[];
          views_count: number;
          favorites_count: number;
          published_at: string | null;
          agent_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          price: number;
          currency?: Currency;
          area_sqm: number;
          room_count?: number;
          category: ListingCategory;
          status?: ListingStatus;
          city: string;
          district: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          images?: string[];
          views_count?: number;
          favorites_count?: number;
          published_at?: string | null;
          agent_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          currency?: Currency;
          area_sqm?: number;
          room_count?: number;
          category?: ListingCategory;
          status?: ListingStatus;
          city?: string;
          district?: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          images?: string[];
          views_count?: number;
          favorites_count?: number;
          published_at?: string | null;
          agent_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string;
          avatar_url: string | null;
          budget_min: number;
          budget_max: number;
          status: CustomerStatus;
          assigned_agent_id: string;
          notes: string;
          last_contact_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string;
          email?: string;
          avatar_url?: string | null;
          budget_min?: number;
          budget_max?: number;
          status?: CustomerStatus;
          assigned_agent_id: string;
          notes?: string;
          last_contact_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          email?: string;
          avatar_url?: string | null;
          budget_min?: number;
          budget_max?: number;
          status?: CustomerStatus;
          assigned_agent_id?: string;
          notes?: string;
          last_contact_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_assigned_agent_id_fkey";
            columns: ["assigned_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_listing_interests: {
        Row: {
          customer_id: string;
          listing_id: string;
          intent: InterestIntent;
          created_at: string;
        };
        Insert: {
          customer_id: string;
          listing_id: string;
          intent?: InterestIntent;
          created_at?: string;
        };
        Update: {
          customer_id?: string;
          listing_id?: string;
          intent?: InterestIntent;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_listing_interests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_listing_interests_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_timeline_events: {
        Row: {
          id: string;
          customer_id: string;
          event_type: CustomerEventType;
          description: string;
          listing_id: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          event_type: CustomerEventType;
          description?: string;
          listing_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          event_type?: CustomerEventType;
          description?: string;
          listing_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_timeline_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_timeline_events_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          event_type: ActivityEventType;
          description: string;
          amount: number | null;
          actor_agent_id: string | null;
          related_listing_id: string | null;
          related_customer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: ActivityEventType;
          description: string;
          amount?: number | null;
          actor_agent_id?: string | null;
          related_listing_id?: string | null;
          related_customer_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: ActivityEventType;
          description?: string;
          amount?: number | null;
          actor_agent_id?: string | null;
          related_listing_id?: string | null;
          related_customer_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_agent_id_fkey";
            columns: ["actor_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_related_customer_id_fkey";
            columns: ["related_customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_related_listing_id_fkey";
            columns: ["related_listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          listing_id: string | null;
          customer_id: string | null;
          agent_id: string | null;
          amount: number;
          closed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string | null;
          customer_id?: string | null;
          agent_id?: string | null;
          amount: number;
          closed_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string | null;
          customer_id?: string | null;
          agent_id?: string | null;
          amount?: number;
          closed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          customer_id: string | null;
          agent_id: string | null;
          amount: number;
          status: OfferStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          customer_id?: string | null;
          agent_id?: string | null;
          amount: number;
          status?: OfferStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          customer_id?: string | null;
          agent_id?: string | null;
          amount?: number;
          status?: OfferStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          title: string;
          appointment_type: AppointmentType;
          customer_id: string | null;
          listing_id: string | null;
          agent_id: string;
          start_time: string;
          end_time: string;
          location: string;
          notes: string;
          status: AppointmentStatus;
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          appointment_type?: AppointmentType;
          customer_id?: string | null;
          listing_id?: string | null;
          agent_id: string;
          start_time: string;
          end_time: string;
          location?: string;
          notes?: string;
          status?: AppointmentStatus;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          appointment_type?: AppointmentType;
          customer_id?: string | null;
          listing_id?: string | null;
          agent_id?: string;
          start_time?: string;
          end_time?: string;
          location?: string;
          notes?: string;
          status?: AppointmentStatus;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_agent_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_agent_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_manager: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      owns_customer: {
        Args: { target: string };
        Returns: boolean;
      };
      owns_listing: {
        Args: { target: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/* -------------------------------------------------------------------------- */
/* Üreticinin eklediği kısayollar                                             */
/* -------------------------------------------------------------------------- */

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
