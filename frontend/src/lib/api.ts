import { Analogy } from '@/types/analogy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export const api = {
  async getAnalogies(): Promise<Analogy[]> {
    const response = await fetch(`${API_BASE_URL}/analogies`, {
      credentials: 'include', // Important for handling auth cookies
    });
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    return response.json();
  },

  async createAnalogy(topic: string, explanation: string): Promise<Analogy> {
    const response = await fetch(`${API_BASE_URL}/analogies`, {
      method: 'POST',
      credentials: 'include', // Important for handling auth cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, explanation }),
    });
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    return response.json();
  }
}; 