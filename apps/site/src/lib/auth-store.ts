"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (
    userData: Partial<User>
  ) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    token: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// Mock user database
const mockUsers: (User & { password: string })[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    phone: "(555) 123-4567",
    address: {
      street: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
    },
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const user = mockUsers.find(
          (u) => u.email === email && u.password === password
        );
        if (user) {
          const { password: _, ...userWithoutPassword } = user;
          set({ user: userWithoutPassword, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: "Invalid email or password" };
      },

      signup: async (userData) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const existingUser = mockUsers.find((u) => u.email === userData.email);
        if (existingUser) {
          return { success: false, error: "Email already exists" };
        }

        const newUser = {
          id: Date.now().toString(),
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          createdAt: new Date().toISOString(),
        };

        mockUsers.push(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        set({ user: userWithoutPassword, isAuthenticated: true });
        return { success: true };
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: async (userData) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { user } = get();
        if (!user) return { success: false, error: "Not authenticated" };

        const updatedUser = { ...user, ...userData };
        set({ user: updatedUser });
        return { success: true };
      },

      forgotPassword: async (email: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const user = mockUsers.find((u) => u.email === email);
        if (user) {
          // In a real app, this would send an email
          console.log(`Password reset email sent to ${email}`);
          return { success: true };
        }
        return { success: false, error: "Email not found" };
      },

      resetPassword: async (token: string, password: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // In a real app, you would validate the token
        return { success: true };
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
