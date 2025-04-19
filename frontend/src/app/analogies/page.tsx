'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Analogy } from '@/types/analogy';

export default function AnalogiesPage() {
  const [analogies, setAnalogies] = useState<Analogy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalogies = async () => {
      try {
        setLoading(true);
        const data = await api.getAnalogies();
        setAnalogies(data);
        setError(null);
      } catch (error) {
        setError('Failed to fetch analogies. Please try again later.');
        console.error('Failed to fetch analogies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalogies();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Analogies</h1>
      <div className="space-y-4">
        {analogies.map((analogy) => (
          <div key={analogy.id} className="border p-4 rounded">
            <h2 className="font-bold">{analogy.topic}</h2>
            <p>{analogy.explanation}</p>
            <p className="text-sm text-gray-500 mt-2">
              Created: {new Date(analogy.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 