export type User = {
  username: string;
  name: string;
  role: "admin" | "consultant" | "accountant";
  role_label: string;
};

export type Row = Record<string, string | number | null>;

export type DashboardData = {
  metrics: { active_bookings: number; revenue: number; tour_count: number; customer_count: number };
  upcoming_departures: Row[];
  recent_bookings: Row[];
};

export type ResourceName =
  | "tours" | "destinations" | "itineraries" | "departures" | "customers"
  | "bookings" | "payments" | "guides" | "assignments" | "feedback";

export type Field = {
  key: string;
  label: string;
  kind?: "text" | "number" | "date" | "textarea" | "select" | "email";
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
};
