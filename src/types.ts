export type User = {
  username: string;
  name: string;
  role: "admin" | "tu_van";
  role_label: string;
};

export type Account = User & {
  id: number;
  is_active: boolean;
};

export type Row = Record<string, string | number | null>;

export type DashboardData = {
  metrics: { active_bookings?: number; revenue?: number; tour_count: number; customer_count?: number };
  upcoming_departures: Row[];
  recent_bookings: Row[];
};

export type ResourceName =
  | "tours" | "destinations" | "itineraries" | "departures" | "customers"
  | "bookings" | "payments" | "guides" | "assignments" | "feedback";

export type Field = {
  key: string;
  label: string;
  kind?: "text" | "number" | "date" | "textarea" | "select" | "email" | "image-url";
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
};

export type PortalTour = {
  id: number;
  name: string;
  destination_id: number;
  destination_name: string;
  region: string;
  duration_days: number;
  price: number;
  category: string;
  description: string;
  image_url: string;
  status: string;
};

export type PortalDestination = {
  id: number;
  name: string;
  region: string;
  description: string;
};

export type PortalDeparture = {
  id: number;
  tour_id: number;
  departure_date: string;
  capacity: number;
  reserved_seats: number;
  remaining_seats: number;
  status: string;
};

export type PortalItinerary = {
  id: number;
  tour_id: number;
  day_number: number;
  title: string;
  details: string;
};

export type PortalFeedback = {
  id: number;
  customer_name: string;
  tour_id: number;
  rating: number;
  comment: string;
  created_at: string;
};

export type PortalData = {
  tours: PortalTour[];
  destinations: PortalDestination[];
  departures: PortalDeparture[];
  itineraries: PortalItinerary[];
  feedbacks: PortalFeedback[];
};

export type PublicBookingPayload = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  departure_id: number;
  seats: number;
  notes?: string;
};

export type PublicBookingResponse = {
  success: boolean;
  booking_code: string;
  total_amount: number;
  customer_name: string;
  tour_name: string;
  departure_date: string;
  seats: number;
  message: string;
};

export type CustomerUser = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type CustomerBookingItem = {
  id: number;
  booking_code: string;
  tour_name: string;
  departure_date: string;
  seats: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
};
