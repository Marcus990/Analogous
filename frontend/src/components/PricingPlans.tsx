"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  IconCheck, 
  IconX, 
  IconCrown, 
  IconBrain,
  IconSparkles,
  IconInfinity,
  IconClock,
  IconShare,
  IconPhoto
} from "@tabler/icons-react";

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
  features: {
    text: string;
    included: boolean;
    highlight?: boolean;
  }[];
  cta: string;
  popular?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "curious",
    name: "Curious",
    price: "Free",
    description: "For learners getting started with analogies",
    color: "green",
    gradient: "from-green-500/5 to-green-600/5",
    icon: <IconBrain className="w-6 h-6" />,
    features: [
      { text: "Generate **20** analogies per day", included: true, highlight: true },
      { text: "Store a maximum of **100** analogies in history", included: true, highlight: true },
      { text: "Rate limit of **1** analogy generation per minute", included: true },
      { text: "Access to text and comic book analogy formats with SDXL image generation", included: true },
      { text: "1-click shareable links with friends and followers", included: true },
      { text: "Unlimited analogy generation", included: false },
      { text: "Advanced analytics and insights", included: false },
      { text: "Priority customer support", included: false },
    ],
    cta: "Current Plan",
  },
  {
    id: "scholar",
    name: "Scholar",
    price: "$6.99",
    period: "/month",
    description: "For thinkers who want unlimited exploration",
    color: "blue",
    gradient: "from-blue-500/5 to-blue-600/5",
    icon: <IconCrown className="w-6 h-6" />,
    popular: true,
    features: [
      { text: "Generate **100** analogies per day", included: true, highlight: true },
      { text: "Store a maximum of **500** analogies in history", included: true, highlight: true },
      { text: "Rate limit of **5** analogy generations per minute", included: true, highlight: true },
      { text: "Access to text and comic book analogy formats with SDXL image generation", included: true },
      { text: "1-click shareable links with friends and followers", included: true },
      { text: "Priority customer support", included: true },
      { text: "Advanced analytics and insights", included: true },
      { text: "Early access to new features", included: true },
    ],
    cta: "Upgrade to Scholar",
  },
];

export default function PricingPlans() {
  const [selectedPlan, setSelectedPlan] = useState<string>("curious");

  const renderFeatureText = (text: string) => {
    // Replace **text** with bold styling
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <IconSparkles className="w-8 h-8 text-purple-400" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">Choose Your Plan</h2>
        </div>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Select the perfect plan for your analogy learning journey. Start free and upgrade when you're ready for more.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {pricingPlans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`relative ${plan.popular ? 'md:scale-105' : ''}`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  <div className="flex items-center space-x-2">
                    <IconCrown className="w-4 h-4" />
                    <span>Best Value</span>
                  </div>
                </div>
              </div>
            )}

            {/* Card */}
            <div className={`relative bg-gradient-to-br ${plan.gradient} backdrop-blur-sm rounded-xl border ${
              plan.popular 
                ? 'border-purple-500/30 shadow-2xl shadow-purple-500/20' 
                : 'border-white/10'
            } overflow-hidden h-full`}>
              
              {/* Card Header */}
              <div className={`p-8 border-b ${
                plan.popular ? 'border-purple-500/20' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${plan.color}-500/20 flex items-center justify-center text-${plan.color}-300`}>
                    {plan.icon}
                  </div>
                  {plan.popular && (
                    <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-400 text-lg">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features List */}
              <div className="p-8 flex-1">
                <div className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        feature.included 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-500'
                      }`}>
                        {feature.included ? (
                          <IconCheck className="w-3 h-3" />
                        ) : (
                          <IconX className="w-3 h-3" />
                        )}
                      </div>
                      <span 
                        className={`text-sm ${
                          feature.included 
                            ? feature.highlight 
                              ? 'text-white font-medium' 
                              : 'text-gray-300'
                            : 'text-gray-500 line-through'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderFeatureText(feature.text) }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="p-8 pt-0">
                <button
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : plan.id === selectedPlan
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {plan.id === selectedPlan ? (
                    <div className="flex items-center justify-center space-x-2">
                      <IconCheck className="w-5 h-5" />
                      <span>Current Plan</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      {plan.popular && <IconCrown className="w-5 h-5" />}
                      <span>{plan.cta}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12 text-center"
      >
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <IconInfinity className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">All Plans Include</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <IconPhoto className="w-4 h-4 text-green-400" />
              <span>SDXL Image Generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <IconShare className="w-4 h-4 text-blue-400" />
              <span>1-click Sharing</span>
            </div>
            <div className="flex items-center space-x-2">
              <IconClock className="w-4 h-4 text-purple-400" />
              <span>History Storage</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 