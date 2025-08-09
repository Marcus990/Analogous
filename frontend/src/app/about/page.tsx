"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BiBook, BiBrain, BiCode, BiRocket } from "react-icons/bi";
import { IconFlame, IconArrowRight } from "@tabler/icons-react";
import { MovingBorderButton } from "@/components/MovingBorder";

export default function AboutPage() {
  const features = [
    {
      icon: <BiBrain className="w-8 h-8 text-purple-400" />,
      title: "AI-Powered Learning",
      description: "Leveraging cutting-edge AI to create analogies that make complex topics accessible and engaging."
    },
    {
      icon: <BiBook className="w-8 h-8 text-purple-400" />,
      title: "Educational Excellence",
      description: "Designed to enhance learning outcomes through memorable and relatable analogies."
    },
    {
      icon: <BiRocket className="w-8 h-8 text-purple-400" />,
      title: "Innovation First",
      description: "Built with modern technologies and best practices to deliver the best user experience."
    },
    {
      icon: <IconFlame className="w-8 h-8 text-purple-400" />,
      title: "Continuous Improvement",
      description: "Constantly evolving and improving based on user feedback and technological advances."
    }
  ];

  const technologies = [
    "React", "Next.js", "TypeScript", "Python", "FastAPI",
    "LangChain", "Supabase", "PostgreSQL", "Vector DBs",
    "Azure OpenAI", "GCP", "Gemini ADK",
    "AI Agents", "RAG", "Agent Protocols"
  ];  

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 pt-20 sm:pt-24 md:pt-32 px-4 sm:px-6 md:px-10 lg:px-24 pb-8 sm:pb-12">
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
                  About Analogous
                </h1>
              </div>
            </div>
            
            <p className="text-gray-300 text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-light">
              Transforming how people learn and understand complex topics through AI-powered analogies.
            </p>
          </motion.div>

          {/* What We Do Section */}
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
                  What We Do
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Analogous is an AI-powered platform that creates compelling analogies to help people understand complex topics. 
                Whether you're a student struggling with a difficult concept, a teacher looking for better ways to explain ideas, 
                or a professional trying to communicate complex information, our platform makes learning more accessible and engaging.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
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
                    <h3 className="text-xl font-semibold mb-4 text-white">{feature.title}</h3>
                    <p className="text-gray-400 flex-1 text-lg leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* About Marcus Section */}
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
                  Meet the Creator
                </h2>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20">
              <div className="p-auto sm:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center lg:text-left"
                  >
                    <div className="relative w-80 h-80 mx-auto mb-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-full blur-xl"></div>
                      <Image
                        src="/assets/Marcus Ng - New Headshot.png"
                        alt="Marcus Ng"
                        width={320}
                        height={320}
                        className="relative rounded-full object-cover w-full h-full border-4 border-purple-600/50"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Marcus Ng</h3>
                      <p className="text-purple-400 text-lg mb-4">AI Software Engineer & Full-Stack Developer</p>
                    </div>

                    <div className="space-y-4 text-gray-300">
                      <p className="text-lg leading-relaxed">
                        Computer Science student at the University of Waterloo with a passion for AI and software development. 
                        Currently working as a Software Development Engineer Intern at Alectra, developing innovative full-stack 
                        applications powered by AI.
                      </p>

                      <p className="text-lg leading-relaxed">
                        <strong>Current Focus:</strong> Developing AI agents that can understand context, make decisions, and provide 
                        valuable insights. Analogous was born from my desire to make learning more accessible through AI-powered analogies.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-3">Technologies & Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {technologies.map((tech, index) => (
                          <span
                            key={tech}
                            className="px-3 py-1 bg-purple-600/20 border border-purple-600/50 rounded-full text-sm text-purple-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mission Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-center space-y-8"
          >
            <div className="neonText">
              <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-6">
                Our Mission
              </h2>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              To democratize learning by making complex topics accessible to everyone through intelligent, 
              AI-powered analogies. We believe that understanding should be effortless, engaging, and 
              available to all.
            </p>
            <MovingBorderButton
              onClick={() => window.location.href = '/home'}
              borderRadius="0.5rem"
              duration={3000}
              containerClassName="w-auto h-auto mx-auto"
              borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
              className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md px-8 py-4 font-semibold text-lg flex items-center gap-2"
            >
              Explore Analogous
              <IconArrowRight className="w-5 h-5" />
            </MovingBorderButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 