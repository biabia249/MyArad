export type Language = "ro" | "en";
export type Place = {
  id: string;
  alias_ids?: string[];
  name: string;
  name_en?: string;
  description_en?: string;
  description_ro?: string;
  wiki_source?: string;
  image_source?: string;
  image_credit?: string;
  image_license?: string;
  cnipt_source?: string;
  cnipt_photos?: string[];
  cnipt_slug?: string;
  cnipt_marker?: string;
  cnipt_type?: string;
  cnipt_category?: string;
  cnipt_category_url?: string;
  cnipt_area?: string;
  cnipt_data_source?: string;
  locality?: string;
  municipality?: string;
  facebook?: string;
  retrieved_at?: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  description: string;
  phone: string;
  website: string;
  hours: string;
  image: string;
  wikipedia: string;
  source: string;
  tags: string[];
  outline?: [number, number][];
};
export type CityEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  lat: number;
  lng: number;
  starts_at: string;
  ends_at: string;
  author: string;
  attending?: number;
  going?: boolean | number;
};
export type Comment = {
  id: string;
  body: string;
  author: string;
  created_at: string;
};
export type EventDetails = {
  event: CityEvent;
  participants: { username: string; fullName: string }[];
  attending: number;
  going: boolean;
  comments: Comment[];
};
export type Bootstrap = {
  places: Place[];
  events: CityEvent[];
  canPost: boolean;
  postingPolicy: string;
};
export type ApiResult = { ok: boolean; data: string; error?: string };
export type CityProps = {
  calendarPlatform?: 'ios' | 'android' | 'web';
  onAddToCalendar: (entry: import('./calendar-export').CalendarEntry) => Promise<string>;
  onShareCalendar: (entry: import('./calendar-export').CalendarEntry) => Promise<void>;
  dom?: import("expo/dom").DOMProps;
  userName: string | null;
  isFocused?: boolean;
  onEnablePush: () => Promise<void>;
  theme: "light" | "dark";
  onToggleTheme: () => Promise<void>;
  initialPage?: string;
  publicUsername?: string;
  initialPlaceId?: string;
  onNavigate: (path: string) => Promise<void>;
  onRequest: (path: string, data: string | null) => Promise<ApiResult>;
  onExternalLink: (url: string) => Promise<void>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onLocate: () => Promise<{ lat: number; lng: number; accuracy?: number; error?: string }>;
  onDirections: (
    lat: number,
    lng: number,
    mode: string,
    origin: string,
  ) => Promise<void>;
};
