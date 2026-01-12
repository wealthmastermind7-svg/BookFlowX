import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ServiceLink {
  id: string;
  title: string;
  url: string;
  category: "gallery" | "video" | "external" | "social";
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
  links?: ServiceLink[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: BookingStatus;
  totalPrice: number;
  createdAt: string;
}

const STORAGE_KEYS = {
  SERVICES: "@bookflow_services",
  BOOKINGS: "@bookflow_bookings",
  CUSTOMERS: "@bookflow_customers",
  AVAILABILITY: "@bookflow_availability",
};

export const StorageService = {
  async getServices(): Promise<Service[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SERVICES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting services:", error);
      return [];
    }
  },

  async addService(service: Service): Promise<void> {
    try {
      const services = await this.getServices();
      services.push(service);
      await AsyncStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    } catch (error) {
      console.error("Error adding service:", error);
    }
  },

  async updateService(serviceId: string, updates: Partial<Service>): Promise<void> {
    try {
      const services = await this.getServices();
      const index = services.findIndex((s) => s.id === serviceId);
      if (index >= 0) {
        services[index] = { ...services[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
      }
    } catch (error) {
      console.error("Error updating service:", error);
    }
  },

  async deleteService(serviceId: string): Promise<void> {
    try {
      const services = await this.getServices();
      const filtered = services.filter((s) => s.id !== serviceId);
      await AsyncStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  },

  async getBookings(): Promise<Booking[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting bookings:", error);
      return [];
    }
  },

  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const bookings = await this.getBookings();
      return bookings.find((b) => b.id === bookingId) || null;
    } catch (error) {
      console.error("Error getting booking:", error);
      return null;
    }
  },

  async addBooking(booking: Booking): Promise<void> {
    try {
      const bookings = await this.getBookings();
      bookings.push(booking);
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      
      // Update customer
      const customers = await this.getCustomers();
      const customerIndex = customers.findIndex((c) => c.id === booking.customerId);
      if (customerIndex >= 0) {
        customers[customerIndex].totalBookings += 1;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (error) {
      console.error("Error adding booking:", error);
    }
  },

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    try {
      const bookings = await this.getBookings();
      const index = bookings.findIndex((b) => b.id === bookingId);
      if (index >= 0) {
        bookings[index] = { ...bookings[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  },

  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting customers:", error);
      return [];
    }
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers();
      return customers.find((c) => c.id === customerId) || null;
    } catch (error) {
      console.error("Error getting customer:", error);
      return null;
    }
  },

  async addCustomer(customer: Customer): Promise<void> {
    try {
      const customers = await this.getCustomers();
      customers.push(customer);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  },

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const index = customers.findIndex((c) => c.id === customerId);
      if (index >= 0) {
        customers[index] = { ...customers[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
    } catch (error) {
      console.error("Error updating customer:", error);
    }
  },

  async initializeDemoData(): Promise<void> {
    try {
      const existingServices = await this.getServices();
      if (existingServices.length === 0) {
        const demoServices: Service[] = [
          { id: "1", name: "Haircut", duration: 30, price: 45, description: "Professional haircut" },
          { id: "2", name: "Hair Coloring", duration: 120, price: 85, description: "Full head color treatment" },
          { id: "3", name: "Beard Trim", duration: 15, price: 20, description: "Beard grooming and shaping" },
          { id: "4", name: "Styling", duration: 45, price: 55, description: "Hair styling for special occasions" },
        ];
        for (const service of demoServices) {
          await this.addService(service);
        }
      }

      const existingCustomers = await this.getCustomers();
      if (existingCustomers.length === 0) {
        const demoCustomers: Customer[] = [
          { id: "1", name: "John Smith", email: "john@example.com", phone: "555-0101", totalBookings: 5 },
          { id: "2", name: "Sarah Johnson", email: "sarah@example.com", phone: "555-0102", totalBookings: 3 },
          { id: "3", name: "Michael Brown", email: "michael@example.com", phone: "555-0103", totalBookings: 8 },
          { id: "4", name: "Emma Davis", email: "emma@example.com", phone: "555-0104", totalBookings: 2 },
        ];
        for (const customer of demoCustomers) {
          await this.addCustomer(customer);
        }
      }

      const existingBookings = await this.getBookings();
      if (existingBookings.length === 0) {
        const demoBookings: Booking[] = [
          {
            id: "1",
            customerId: "1",
            customerName: "John Smith",
            serviceId: "1",
            serviceName: "Haircut",
            date: "2025-01-15",
            time: "10:00 AM",
            status: "confirmed",
            totalPrice: 45,
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            customerId: "2",
            customerName: "Sarah Johnson",
            serviceId: "2",
            serviceName: "Hair Coloring",
            date: "2025-01-16",
            time: "2:00 PM",
            status: "pending",
            totalPrice: 85,
            createdAt: new Date().toISOString(),
          },
          {
            id: "3",
            customerId: "3",
            customerName: "Michael Brown",
            serviceId: "1",
            serviceName: "Haircut",
            date: "2025-01-17",
            time: "11:00 AM",
            status: "confirmed",
            totalPrice: 45,
            createdAt: new Date().toISOString(),
          },
        ];
        for (const booking of demoBookings) {
          await this.addBooking(booking);
        }
      }
    } catch (error) {
      console.error("Error initializing demo data:", error);
    }
  },

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SERVICES,
        STORAGE_KEYS.BOOKINGS,
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.AVAILABILITY,
      ]);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  },
};
