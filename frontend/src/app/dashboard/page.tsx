'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { HoloCard } from '@/components/HoloCard';
import { LampContainer } from '@/components/LampContainer';
import Modal from '@/components/Modal';
import OnboardingFlow from '@/components/OnboardingFlow';
import { MovingBorderButton } from '@/components/MovingBorder';
import { HiOutlineUserCircle, HiOutlineLightBulb } from 'react-icons/hi';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchFirstName = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_information')
          .select('first_name')
          .eq('id', user.id)
          .single();

        if (!error && data?.first_name) {
          setFirstName(data.first_name);
        } else {
          console.warn('Failed to fetch first name:', error?.message);
        }
      }
    };

    fetchFirstName();
  }, [user]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('personality_answers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const dismissed = sessionStorage.getItem('onboarding-dismissed') === 'true';

        if ((!data || error) && !dismissed) {
          setShowOnboarding(true);
        } else if ((!data || error) && dismissed) {
          setShowReminder(true);
        }
      }
    };

    checkOnboarding();
  }, [user]);

  if (loading || !user) {
    return null;
  }

  return (
    <>
      {showOnboarding && (
        <Modal
          onClose={() => {
            sessionStorage.setItem('onboarding-dismissed', 'true');
            setShowOnboarding(false);
            setShowReminder(true);
          }}
        >
          <OnboardingFlow
            onComplete={() => {
              sessionStorage.setItem('onboarding-dismissed', 'true');
              setShowOnboarding(false);
              setShowReminder(false);
            }}
          />
        </Modal>
      )}

      {showReminder && (
        <div className="fixed bottom-6 right-6 z-40">
          <MovingBorderButton
            onClick={() => {
              setShowOnboarding(true);
              setShowReminder(false);
            }}
            borderRadius="3rem"
            duration={3000}
            containerClassName="w-auto h-auto"
            borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
            className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md px-4 py-3 font-medium transition"
          >
            <HiOutlineUserCircle className="mr-1 text-2xl" /> Getting to Know You
          </MovingBorderButton>
        </div>
      )}

      <LampContainer>
        <div className="min-h-screen w-full pt-32 px-6 pb-12 sm:px-10 lg:px-24">
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="space-y-15">
              <h1 className="font-bold text-white mb-1 font-[PlantinMTProSemiBold] text-[5.5rem]">
                Welcome{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-xl text-gray-400">
                What would you like to learn today?
              </p>
            </div>

            {/* Generate New Analogy Button */}
            <BackgroundGradient className="w-full rounded-lg cursor-pointer">
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-5 text-lg font-semibold text-white text-left flex items-center gap-3"
              >
                <HiOutlineLightBulb className="text-3xl" /> Generate New Analogy
              </button>
            </BackgroundGradient>

            {/* Previous Analogies Section */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Your Previous Analogies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((id) => (
                  <HoloCard
                    key={id}
                    text={`Analogy #${id}: A neuron is like a switch in a giant logic machine...`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </LampContainer>
    </>
  );
}
