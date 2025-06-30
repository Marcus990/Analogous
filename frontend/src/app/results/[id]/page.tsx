'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api, GenerateAnalogyResponse } from '@/lib/api';
import { MovingBorderButton } from '@/components/MovingBorder';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import '../page.css';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [analogy, setAnalogy] = useState<GenerateAnalogyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalogy = async () => {
      try {
        const id = params.id as string;
        const data = await api.getAnalogy(id);
        setAnalogy(data);
      } catch (err) {
        setError('Failed to load analogy');
        console.error('Error fetching analogy:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAnalogy();
    }
  }, [params.id]);

  const handleGenerateNew = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your analogy...</p>
        </div>
      </div>
    );
  }

  if (error || !analogy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Oops!</h1>
          <p className="text-gray-400 mb-8">{error || 'Analogy not found'}</p>
          <MovingBorderButton
            onClick={handleGenerateNew}
            borderRadius="0.5rem"
            duration={3000}
            containerClassName="w-auto h-auto"
            borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
            className="bg-purple-700 hover:bg-purple-700 px-6 py-3 font-medium border border-white/50 text-white shadow-md transition"
          >
            Generate New Analogy
          </MovingBorderButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center px-4">
      <div className="w-full max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
            <div className="neonText">
                    {['Y', 'o', 'u', 'r', ' ', 'A', 'n', 'a', 'l', 'o', 'g', 'y'].map((char, i) => (
                    <span
                        key={i}
                        className={`${
                        i === 0 ? 'flicker-fast' :
                        i === 1 ? 'flicker-slow' :
                        i === 3 ? 'flicker-medium' :
                        i === 4 ? 'flicker-slow' : 
                        i === 6 ? 'flicker-fast' :
                        i === 9 ? 'flicker-slow' : 
                        i === 11 ? 'flicker-slow' : ''
                        } font-[PlantinMTProSemiBold] text-[3rem] md:text-[5rem] transition-transform duration-300 hover:scale-105`}
                    >
                        {char}
                    </span>
                    ))}
            </div>
          <p className="text-gray-400 text-lg">
            Here&apos;s your personalized analogy to help you understand complex concepts
          </p>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            >
            <BackgroundGradient containerClassName="rounded-lg p-[4px] backdrop-blur-sm shadow-2xl">
                <div className="max-w-3xl mx-5 my-10">
                <p className="text-xl leading-relaxed text-gray-200 whitespace-pre-wrap">
                    {analogy.analogy}
                </p>
                </div>
            </BackgroundGradient>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 flex flex-col md:flex-row gap-4 justify-center items-center"
            >
            <div className="min-w-[220px]">
                <MovingBorderButton
                onClick={handleGenerateNew}
                borderRadius="0.5rem"
                duration={3000}
                containerClassName="w-full h-auto"
                borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                className="min-w-[220px] px-8 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                >
                Generate New Analogy
                </MovingBorderButton>
            </div>

            <button
                onClick={() => {
                navigator.clipboard.writeText(analogy.analogy);
                }}
                className="min-w-[220px] px-8 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
            >
                Copy to Clipboard
            </button>
            </motion.div>


        {analogy.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500">
              Analogy ID: {analogy.id}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
} 