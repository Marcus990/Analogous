import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  console.log("getAuthHeaders - Session:", session ? "exists" : "null");
  console.log("getAuthHeaders - Access token:", session?.access_token ? "exists" : "null");
  
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
    console.log("getAuthHeaders - Added Authorization header");
  } else {
    console.log("getAuthHeaders - No access token found");
  }
  
  return headers;
};

export interface GenerateAnalogyRequest {
  topic: string;
  audience: string;
  timezone_str: string;
}

export interface RegenerateAnalogyRequest {
  timezone_str: string;
}

export interface Link {
  url: string;
  title: string;
  description: string;
  thumbnail?: string;
  published?: string;
  source?: string;
  publisher?: string;
  creator?: string | null;
}

export interface AnalogyData {
  title: string;
  chapter1section1: string;
  chapter1quote: string;
  chapter1section2: string;
  chapter2section1: string;
  chapter2quote: string;
  chapter2section2: string;
  chapter3section1: string;
  chapter3quote: string;
  chapter3section2: string;
  summary: string;

  imagePrompt1: string;
  imagePrompt2: string;
  imagePrompt3: string;

  videoLinks: Link[];
  textLinks: Link[];

  searchQuery: string;

  [key: string]: string | Link[]; // Catch-all for dynamic keys
}

export interface GenerateAnalogyResponse {
  status: string;
  id: string;
  analogy: AnalogyData;
  analogy_images: string[];
  topic: string;
  audience: string;
  created_at: string;
  streak_popup_shown: boolean;
  background_image: string;
  is_public: boolean;
  user_id: string;
}

export interface SharedAnalogyResponse {
  status: string;
  id: string;
  analogy: AnalogyData;
  analogy_images: string[];
  topic: string;
  audience: string;
  created_at: string;
  background_image: string;
  creator_username: string;
  is_public: boolean;
}

export interface UserStreakResponse {
  status: string;
  current_streak_count: number;
  longest_streak_count: number;
  last_streak_date: string | null;
  last_analogy_time: string | null;
  is_streak_active: boolean;
  days_since_last_analogy: number | null;
  streak_was_reset: boolean;
}

export interface StreakLogsResponse {
  status: string;
  streak_logs: string[];
  year: number;
  month: number;
  timezone: string;
}

export const api = {
  generateAnalogy: async (
    data: GenerateAnalogyRequest,
    signal?: AbortSignal
  ): Promise<GenerateAnalogyResponse> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/generate-analogy`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal, // Add the abort signal
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      
      // Try to extract the specific error message from the response
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.log("Error response data:", errorData);
        if (errorData.detail) {
          errorMessage = errorData.detail;
          console.log("Using specific error message:", errorMessage);
        }
      } catch (parseError) {
        // If we can't parse the error response, use the generic message
        console.warn("Could not parse error response:", parseError);
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  },

  getAnalogy: async (id: string): Promise<GenerateAnalogyResponse> => {
    const response = await fetch(`${API_BASE_URL}/analogy/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserAnalogies: async (userId: string): Promise<{
    status: string;
    analogies: any[];
    count: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/analogies`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserAnalogiesPaginated: async (userId: string, page: number = 1, pageSize: number = 9): Promise<{
    status: string;
    analogies: any[];
    count: number;
    total_count: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/analogies-paginated?page=${page}&page_size=${pageSize}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserRecentAnalogies: async (userId: string, limit: number = 3): Promise<{
    status: string;
    analogies: any[];
    count: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/recent-analogies?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserStreak: async (userId: string, timezoneStr: string = "UTC"): Promise<UserStreakResponse> => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/streak?timezone_str=${encodeURIComponent(timezoneStr)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserStreakLogs: async (userId: string, year?: number, month?: number, timezoneStr: string = "UTC"): Promise<StreakLogsResponse> => {
    const params = new URLSearchParams();
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    params.append('timezone_str', timezoneStr);
    
    const url = `${API_BASE_URL}/user/${userId}/streak-logs?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async getUserAnalogiesCount(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/analogies-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async getUserLifetimeAnalogiesCount(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/lifetime-analogies-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteAnalogy: async (analogyId: string): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/analogy/${analogyId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  regenerateAnalogy: async (analogyId: string, timezoneStr: string = "UTC", signal?: AbortSignal): Promise<GenerateAnalogyResponse> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/regenerate-analogy/${analogyId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ timezone_str: timezoneStr }),
      signal, // Add the abort signal
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("Access denied. Please try again.");
      }
      
      // Try to extract the specific error message from the response
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.log("Regenerate error response data:", errorData);
        if (errorData.detail) {
          errorMessage = errorData.detail;
          console.log("Using specific regenerate error message:", errorMessage);
        }
      } catch (parseError) {
        // If we can't parse the error response, use the generic message
        console.warn("Could not parse error response:", parseError);
      }
      
      console.log("Regenerate API throwing error:", errorMessage);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  markStreakPopupShown: async (analogyId: string, userId: string): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/analogy/${analogyId}/streak-popup-shown?user_id=${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  acknowledgeStreakReset: async (userId: string): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/acknowledge-streak-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  cancelRequest: async (requestId: string): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/cancel-request/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getActiveRequests: async (): Promise<{
    status: string;
    active_requests: Record<string, any>;
    count: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/active-requests`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  checkUsernameAvailability: async (username: string, signal?: AbortSignal): Promise<{
    available: boolean;
    error: string | null;
  }> => {
    const response = await fetch(`${API_BASE_URL}/check-username/${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many username checks. Please wait a minute before trying again.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  checkEmailAvailability: async (email: string, signal?: AbortSignal): Promise<{
    available: boolean;
    error: string | null;
  }> => {
    const response = await fetch(`${API_BASE_URL}/check-email/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many email checks. Please wait a minute before trying again.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  updateAnalogyPublicStatus: async (analogyId: string, isPublic: boolean): Promise<{
    status: string;
    message: string;
    is_public: boolean;
  }> => {
    const headers = await getAuthHeaders();
    console.log("updateAnalogyPublicStatus - Headers:", headers);
    console.log("updateAnalogyPublicStatus - Request body:", { is_public: isPublic });
    
    const response = await fetch(`${API_BASE_URL}/analogy/${analogyId}/public`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_public: isPublic }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only update your own analogies.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getSharedAnalogy: async (analogyId: string): Promise<SharedAnalogyResponse> => {
    const response = await fetch(`${API_BASE_URL}/shared/${analogyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("This analogy is not public and cannot be shared.");
      }
      if (response.status === 404) {
        throw new Error("Analogy not found.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserProfile: async (userId: string): Promise<{
    status: string;
    profile: any;
  }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/${userId}/profile`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only access your own profile.");
      }
      if (response.status === 404) {
        throw new Error("User profile not found.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  updateUserProfile: async (userId: string, profileData: {
    username: string;
    first_name: string;
    last_name: string;
    opt_in_email_marketing: boolean;
  }): Promise<{
    status: string;
    message: string;
    profile: any;
  }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/${userId}/profile`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only update your own profile.");
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid profile data.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  updateUserPassword: async (userId: string, newPassword: string): Promise<{
    status: string;
    message: string;
  }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/${userId}/password`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only update your own password.");
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid password data.");
      }
      if (response.status === 501) {
        throw new Error("Password updates should be handled through the frontend authentication system.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteUserAccount: async (userId: string, confirmation: string): Promise<{
    status: string;
    message: string;
  }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/${userId}/account`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ confirmation }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only delete your own account.");
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid confirmation.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getUserPricingStats: async (userId: string): Promise<{
    currentPlan: string;
    analogiesStoredTotal: number;
    dailyLimit: number;
    rateLimitSeconds: number;
  }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/${userId}/pricing-stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in to continue.");
      }
      if (response.status === 403) {
        throw new Error("You can only view your own stats.");
      }
      
      // Try to extract the specific error message from the response
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (parseError) {
        // If we can't parse the error response, use the generic message
        console.warn("Could not parse error response:", parseError);
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  },
};
