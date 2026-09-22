import { apiClient } from "./client";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  category: "APPLICATION" | "SCREENING" | "RESUME" | "SYSTEM" | "JOB";
  timestamp: string;
  read: boolean;
  link: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  async list(): Promise<NotificationsResponse> {
    try {
      const data = await apiClient<NotificationsResponse>("/notifications");
      return {
        notifications: Array.isArray(data?.notifications) ? data.notifications : [],
        unreadCount: typeof data?.unreadCount === "number" ? data.unreadCount : 0,
      };
    } catch {
      return {
        notifications: [],
        unreadCount: 0,
      };
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await apiClient("/notifications/mark-read", { method: "POST" });
    } catch (err) {
      console.warn("Failed to mark notifications read:", err);
    }
  },

  async markRead(id: string): Promise<void> {
    try {
      await apiClient(`/notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
      console.warn(`Failed to mark notification ${id} read:`, err);
    }
  },
};
