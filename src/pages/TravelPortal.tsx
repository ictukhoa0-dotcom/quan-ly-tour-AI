import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type {
  PortalData,
  PortalTour,
  PortalDeparture,
  PortalDestination,
  User,
  CustomerUser,
} from "../types";
import PortalHeader from "../components/portal/PortalHeader";
import PortalHero from "../components/portal/PortalHero";
import PortalFlashSale from "../components/portal/PortalFlashSale";
import PortalTourGrid from "../components/portal/PortalTourGrid";
import PortalDestinations from "../components/portal/PortalDestinations";
import PortalWhyChooseUs from "../components/portal/PortalWhyChooseUs";
import PortalReviews from "../components/portal/PortalReviews";
import PortalTravelGuide from "../components/portal/PortalTravelGuide";
import PortalFooter from "../components/portal/PortalFooter";
import TourDetailModal from "../components/portal/TourDetailModal";
import BookingModal from "../components/portal/BookingModal";
import PortalAIChatWidget from "../components/portal/PortalAIChatWidget";
import CustomerAuthModal from "../components/portal/CustomerAuthModal";
import CustomerBookingsModal from "../components/portal/CustomerBookingsModal";
import BookingPage from "./BookingPage";

type TravelPortalProps = {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenLogin: () => void;
  onGoToAdmin: () => void;
  onNotify: (message: string, kind?: "success" | "error") => void;
};

export default function TravelPortal({
  user,
  darkMode,
  onToggleDarkMode,
  onOpenLogin,
  onGoToAdmin,
  onNotify,
}: TravelPortalProps) {
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  // Portal tab: "home" = landing page, "booking" = dedicated booking page
  const [portalTab, setPortalTab] = useState<"home" | "booking">("home");
  const [bookingSelectedTourId, setBookingSelectedTourId] = useState<number | undefined>();
  const [bookingSelectedDepId, setBookingSelectedDepId] = useState<number | undefined>();

  // Customer Authentication state
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [customerBookingsOpen, setCustomerBookingsOpen] = useState(false);

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();
  const [filteredTours, setFilteredTours] = useState<PortalTour[]>([]);

  // Modals state
  const [detailTour, setDetailTour] = useState<PortalTour | null>(null);
  const [bookingTour, setBookingTour] = useState<PortalTour | null>(null);
  const [bookingDep, setBookingDep] = useState<PortalDeparture | undefined>();
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.publicPortal();
      setPortalData(data);
      setFilteredTours(data.tours);
    } catch {
      onNotify("Không thể tải dữ liệu cổng du lịch. Vui lòng thử lại sau.", "error");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadData();
    // Check if customer is already logged in
    api
      .customerMe()
      .then((res) => setCustomer(res.customer))
      .catch(() => setCustomer(null));
  }, [loadData]);

  // Handle search from Hero bar
  function handleHeroSearch(filters: {
    destinationId?: number;
    maxPrice?: number;
    departureDate?: string;
  }) {
    if (!portalData) return;
    let list = [...portalData.tours];

    if (filters.destinationId) {
      list = list.filter((t) => t.destination_id === filters.destinationId);
    }
    if (filters.maxPrice) {
      list = list.filter((t) => t.price <= (filters.maxPrice as number));
    }
    if (filters.departureDate) {
      const validTourIds = portalData.departures
        .filter((d) => d.departure_date === filters.departureDate && d.remaining_seats > 0)
        .map((d) => d.tour_id);
      list = list.filter((t) => validTourIds.includes(t.id));
    }

    setFilteredTours(list);
    setSelectedRegion(undefined);
  }

  function handleSelectRegion(region: string) {
    setSelectedRegion(region);
    const el = document.getElementById("tours-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  function handleSelectDestination(destId: number) {
    if (!portalData) return;
    const dest = portalData.destinations.find((d) => d.id === destId);
    if (dest) {
      setFilteredTours(portalData.tours.filter((t) => t.destination_id === destId));
      setSelectedRegion(dest.region);
      const el = document.getElementById("tours-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleOpenBooking(tour: PortalTour, dep?: PortalDeparture) {
    setDetailTour(null);
    setBookingTour(tour);
    setBookingDep(dep);
  }

  function handleOpenBookingPage(tourId?: number, depId?: number) {
    setBookingSelectedTourId(tourId);
    setBookingSelectedDepId(depId);
    setPortalTab("booking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCustomerLogout() {
    try {
      await api.customerLogout();
    } catch {
      // ignore
    }
    setCustomer(null);
    onNotify("Đã đăng xuất tài khoản khách hàng.", "success");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header */}
      <PortalHeader
        user={user}
        customer={customer}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenCustomerAuth={() => setCustomerAuthOpen(true)}
        onOpenCustomerBookings={() => setCustomerBookingsOpen(true)}
        onCustomerLogout={handleCustomerLogout}
        onOpenLogin={onOpenLogin}
        onGoToAdmin={onGoToAdmin}
        onOpenBookingPage={() => handleOpenBookingPage()}
        onSelectRegion={handleSelectRegion}
        onOpenAIChat={() => setAiChatOpen(true)}
      />

      {/* === DEDICATED BOOKING PAGE === */}
      {portalTab === "booking" ? (
        <BookingPage
          tours={portalData?.tours || []}
          departures={portalData?.departures || []}
          customer={customer}
          selectedTourId={bookingSelectedTourId}
          selectedDepId={bookingSelectedDepId}
          onGoHome={() => {
            setPortalTab("home");
            setBookingSelectedTourId(undefined);
            setBookingSelectedDepId(undefined);
          }}
          onBookingSuccess={() => {
            loadData();
            onNotify("Đặt tour thành công! Cảm ơn quý khách đã tin tưởng VietTour AI.", "success");
          }}
          onNotify={onNotify}
          onOpenCustomerAuth={() => setCustomerAuthOpen(true)}
        />
      ) : (
        <>
          {/* Hero with Search Bar */}
          <PortalHero
            destinations={portalData?.destinations || []}
            onSearch={handleHeroSearch}
            onOpenAIChat={() => setAiChatOpen(true)}
          />

          {/* Flash Sale Tour Section (Giờ chót) */}
          <PortalFlashSale
            tours={portalData?.tours || []}
            departures={portalData?.departures || []}
            onSelectTour={(t) => setDetailTour(t)}
            onBookTour={(t, dep) => handleOpenBookingPage(t.id, dep?.id)}
          />

          {/* Tours Grid Showcase */}
          <PortalTourGrid
            tours={filteredTours}
            departures={portalData?.departures || []}
            selectedRegion={selectedRegion}
            onClearFilters={() => {
              setSelectedRegion(undefined);
              if (portalData) setFilteredTours(portalData.tours);
            }}
            onSelectTour={(t) => setDetailTour(t)}
            onBookTour={(t, dep) => handleOpenBookingPage(t.id, dep?.id)}
          />

          {/* Destinations Showcase */}
          <PortalDestinations
            destinations={portalData?.destinations || []}
            tours={portalData?.tours || []}
            onSelectDestination={handleSelectDestination}
          />

          {/* Why Choose Us */}
          <PortalWhyChooseUs />

          {/* Customer Reviews */}
          <PortalReviews feedbacks={portalData?.feedbacks || []} />

          {/* Travel Guide & Articles */}
          <PortalTravelGuide />

          {/* Footer */}
          <PortalFooter />

          {/* Tour Detail Modal */}
          <TourDetailModal
            tour={detailTour}
            departures={portalData?.departures || []}
            itineraries={portalData?.itineraries || []}
            onClose={() => setDetailTour(null)}
            onOpenBooking={(t, dep) => handleOpenBookingPage(t.id, dep?.id)}
          />

          {/* Booking Form Modal (quick fallback) */}
          <BookingModal
            tour={bookingTour}
            initialDeparture={bookingDep}
            allDepartures={portalData?.departures || []}
            customer={customer}
            onClose={() => setBookingTour(null)}
            onBookingSuccess={() => {
              loadData();
              onNotify("Đặt tour thành công! Cảm ơn quý khách đã tin tưởng VietTour AI.", "success");
            }}
          />
        </>
      )}

      {/* Floating AI Chatbot Widget (always visible) */}
      <PortalAIChatWidget
        isOpen={aiChatOpen}
        onToggle={() => setAiChatOpen((prev) => !prev)}
      />

      {/* Customer Authentication Modal (Login / Register) */}
      <CustomerAuthModal
        isOpen={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
        onSuccess={(loggedCustomer) => {
          setCustomer(loggedCustomer);
          onNotify(`Chào mừng quý khách ${loggedCustomer.name}!`, "success");
        }}
        onOpenAdminLogin={onOpenLogin}
      />

      {/* Customer My Bookings Modal */}
      <CustomerBookingsModal
        isOpen={customerBookingsOpen}
        customer={customer}
        onClose={() => setCustomerBookingsOpen(false)}
        onExploreTours={() => {
          setPortalTab("home");
          window.setTimeout(() => {
            const el = document.getElementById("tours-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }}
      />
    </div>
  );
}
