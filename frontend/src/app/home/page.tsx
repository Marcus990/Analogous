"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BiBrain, BiBot, BiTargetLock, BiBookOpen, BiHighlight, BiUserCheck, BiBook } from "react-icons/bi";
import { IconFlame, IconArrowRight, IconCheck, IconRocket } from "@tabler/icons-react";
import { MovingBorderButton } from "@/components/MovingBorder";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 pt-[3rem] sm:pt-[5rem] md:pt-[7rem] px-4 sm:px-6 md:px-10 lg:px-24 pb-8 sm:pb-12">
        <motion.div
          className="space-y-20 sm:space-y-24"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {/* Hero Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-center space-y-8 sm:space-y-12 max-w-5xl mx-auto"
          >
            <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6 sm:mb-8">
                <BiBook className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="neonText">
                <h1 className="font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105">
                  AI-powered Analogies for Every Learner
                </h1>
              </div>
            </div>
            
            <p className="text-gray-300 text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-light">
              Simplify complex topics, reduce learning barriers, and understand with confidence.
            </p>

            <div className="relative">
              <div className="inline-block bg-gradient-to-r from-purple-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 px-8 py-4">
                <p className="text-white text-xl sm:text-2xl md:text-3xl font-[PlantinMTProSemiBold]">
                  "No learner left behind"
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <MovingBorderButton
                onClick={handleGetStarted}
                borderRadius="0.5rem"
                duration={3000}
                containerClassName="w-auto h-auto"
                borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md px-8 py-4 font-semibold text-lg flex items-center gap-2"
              >
                Start Now
                <IconArrowRight className="w-5 h-5" />
              </MovingBorderButton>
              
              <button
                onClick={() => router.push("/about")}
                className="px-8 py-4 rounded-lg font-semibold text-lg border border-purple-600/50 text-purple-400 hover:bg-purple-600/20 transition-all duration-200"
              >
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Quality Control Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
            <div className="text-center max-w-4xl mx-auto">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-6">
                  Complete Learning and Understanding System
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Slash learning time and boost comprehension. Our platform delivers unparalleled clarity into complex topics, 
                making difficult concepts accessible before they become obstacles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  icon: <BiBookOpen className="w-8 h-8 text-purple-400" />,
                  title: "Ditch Manual Learning",
                  description: "Build understanding quickly and reliably with AI-powered analogies."
                },
                {
                  icon: <BiHighlight className="w-8 h-8 text-purple-400" />,
                  title: "Iterate Learning Reliably",
                  description: "Keep up with user comprehension needs and pain points."
                },
                {
                  icon: <BiUserCheck className="w-8 h-8 text-purple-400" />,
                  title: "Focus on Understanding",
                  description: "Learn complex topics with precision and confidence."
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
                >
                  <div className="p-8 h-full flex flex-col">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-semibold mb-4 text-white">{feature.title}</h3>
                    <p className="text-gray-400 flex-1 text-lg leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
            <div className="text-center">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-4">
                  Designed for Real-World Learning
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Automatically understands your learning context using AI, user preferences, and topic complexity.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <BiBrain className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Multimodal AI Learning Engine</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Analogous generates analogies that matter to your learning. You can sit back as our AI dissects complex topics and creates memorable connections.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <BiTargetLock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Natural Language Learning</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Create learning guidelines like "Explain quantum physics to a 10-year-old" instead of relying on complex, time-consuming explanations.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <IconRocket className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Cross-Platform Learning</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Unlimited learning framework for students, professionals, and curious minds across all devices.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-white font-medium">AI Learning Active</span>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Topic</div>
                        <div className="text-white">Quantum Physics</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Audience</div>
                        <div className="text-white">High School Student</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Analogy Generated</div>
                        <div className="text-white">"Think of quantum particles like..."</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
            <div className="text-center">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-4">
                  Built for Learners. Loved by Modern Education Teams.
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Intelligent automation meets complete learning coverage. Gain confidence in every concept without ever slowing down.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                {
                  icon: <BiHighlight className="w-6 h-6 text-purple-400" />,
                  title: "Save Time",
                  description: "No need to write and rewrite explanations"
                },
                {
                  icon: <BiBrain className="w-6 h-6 text-purple-400" />,
                  title: "Save Effort",
                  description: "Catch confusion before it becomes a problem"
                },
                {
                  icon: <BiTargetLock className="w-6 h-6 text-purple-400" />,
                  title: "Unify Learning",
                  description: "Make learning practices uniform across all topics"
                },
                {
                  icon: <IconFlame className="w-6 h-6 text-purple-400" />,
                  title: "Trigger Learning Anytime",
                  description: "Generate analogies on every study session or review"
                }
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
                >
                  <div className="p-6 sm:p-8 h-full flex flex-col">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors duration-300">
                      {benefit.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{benefit.title}</h3>
                    <p className="text-gray-400 flex-1">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 