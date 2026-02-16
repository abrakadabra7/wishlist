export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Wishlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  sort_order: number;
  due_date: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface WishlistWithProgress extends Wishlist {
  items_count: number;
  purchased_count: number;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null; // ISO 4217 e.g. USD, RUB, EUR
  position: number;
  reservation_status: "available" | "reserved" | "purchased";
  reserved_by_id: string | null;
  reserved_at: string | null;
  reservation_message: string | null;
  contributed_by_id: string | null;
  contributed_total: number | null;
  contributed_pledged: number | null;
  contributed_paid: number | null;
  created_at: string;
  updated_at: string;
}

export interface ItemContributionsResponse {
  total: number;
  total_pledged: number;
  total_paid: number;
  contributions: {
    amount: number;
    status: "pledged" | "paid";
    display_name: string | null;
    is_me: boolean;
  }[] | null;
}

export interface Share {
  id: string;
  wishlist_id: string;
  user_id: string;
  role: "viewer" | "editor";
  created_at: string;
}

export interface PublicLink {
  id: string;
  wishlist_id: string;
  token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  created_at: string;
}

export interface Contribution {
  id: string;
  wishlist_id: string;
  user_id: string;
  item_id: string | null;
  kind: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PublicWishlistResponse {
  wishlist: Wishlist;
  items: WishlistItem[];
}

export interface DeleteImpact {
  shared_with_count: number;
  contributors_count: number;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  payload?: { amount?: number; currency?: string; item_title?: string; list_title?: string } | null;
  read_at: string | null;
  created_at: string;
}

export interface WishlistSuggestion {
  id: string;
  wishlist_id: string;
  suggested_by_id: string | null;
  title: string;
  link_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
}
