'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Analogy } from '@/lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const { user, analogies, setAnalogies } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchAnalogies = async () => {
      try {
        const { data, error } = await supabase
          .from('analogies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setAnalogies(data as Analogy[]);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch analogies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalogies();
  }, [user, router, setAnalogies]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Analogies</h1>
        <p className="mt-2 text-gray-400">
          View and manage your past analogies
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : analogies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-400">
            You haven't created any analogies yet
          </h3>
          <p className="mt-2 text-gray-500">
            Head to the home page to create your first analogy
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {analogies.map((analogy: Analogy) => (
            <motion.div
              key={analogy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/20 rounded-lg p-6 border border-purple-400"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">
                    Explain {analogy.topic} like I'm a {analogy.audience}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    {new Date(analogy.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-gray-300">{analogy.analogy_text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 