"use client";

import { motion } from "framer-motion";
import { BiShield, BiLock, BiUser, BiEnvelope, BiFile } from "react-icons/bi";
import { IconArrowRight } from "@tabler/icons-react";
import { MovingBorderButton } from "@/components/MovingBorder";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: <BiShield className="w-8 h-8 text-purple-400" />,
      title: "Information We Collect",
      content: [
        {
          subtitle: "Personal Information",
          text: "We collect personal information that you provide directly to us, including:",
          items: [
            "Full name",
            "Email address",
            "Account credentials",
            "Payment information (processed securely through Stripe)"
          ]
        },
        {
          subtitle: "Usage Information",
          text: "We automatically collect certain information about your use of our service:",
          items: [
            "Usage patterns and preferences",
            "Device information and IP addresses",
            "Analytics data to improve our service",
            "Error logs and performance metrics"
          ]
        }
      ]
    },
    {
      icon: <BiLock className="w-8 h-8 text-purple-400" />,
      title: "How We Use Your Information",
      content: [
        {
          subtitle: "Service Provision",
          text: "We use your information to:",
          items: [
            "Provide and maintain our analogy generation service",
            "Process payments and manage subscriptions",
            "Send important service updates and notifications",
            "Respond to your inquiries and support requests"
          ]
        },
        {
          subtitle: "Marketing Communications",
          text: "With your consent, we may use your email address to:",
          items: [
            "Send product updates and new feature announcements",
            "Share educational content and learning tips",
            "Provide personalized recommendations",
            "Send promotional offers and newsletters"
          ]
        }
      ]
    },
    {
      icon: <BiUser className="w-8 h-8 text-purple-400" />,
      title: "Information Sharing",
      content: [
        {
          subtitle: "Third-Party Services",
          text: "We may share your information with trusted third-party services:",
          items: [
            "Stripe (for payment processing)",
            "Email service providers (for marketing communications)",
            "Analytics services (for service improvement)",
            "Cloud hosting providers (for data storage)"
          ]
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose your information when required by law or to:",
          items: [
            "Comply with legal obligations",
            "Protect our rights and property",
            "Prevent fraud or security threats",
            "Respond to lawful requests from authorities"
          ]
        }
      ]
    },
    {
      icon: <BiEnvelope className="w-8 h-8 text-purple-400" />,
      title: "Email Marketing and Communications",
      content: [
        {
          subtitle: "Opt-in Consent",
          text: "We respect your communication preferences:",
          items: [
            "Marketing emails are only sent with your explicit consent",
            "You can opt-in during account creation or later in settings",
            "All marketing emails include an unsubscribe link",
            "You can update your preferences at any time"
          ]
        },
        {
          subtitle: "Types of Communications",
          text: "With your consent, you may receive:",
          items: [
            "Product updates and new feature announcements",
            "Educational content and learning resources",
            "Personalized recommendations based on your usage",
            "Promotional offers and special discounts"
          ]
        }
      ]
    }
  ];

  const additionalSections = [
    {
      title: "Data Security",
      content: "We implement industry-standard security measures to protect your personal information:",
      items: [
        "Encryption of data in transit and at rest",
        "Secure authentication and access controls",
        "Regular security audits and updates",
        "Compliance with data protection regulations"
      ]
    },
    {
      title: "Your Rights",
      content: "You have the following rights regarding your personal information:",
      items: [
        "Access: Request a copy of your personal data",
        "Correction: Update or correct inaccurate information",
        "Deletion: Request deletion of your personal data",
        "Portability: Request data in a portable format",
        "Objection: Object to processing of your data",
        "Withdrawal: Withdraw consent for marketing communications"
      ]
    },
    {
      title: "Contact Us",
      content: "If you have any questions about this Privacy Policy or our data practices, please contact us:",
      items: [
        "Email: info.analogous@gmail.com",
        "Response Time: We aim to respond within 48 hours"
      ]
    }
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
                <BiShield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="neonText">
                <h1 className="font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105">
                  Privacy Policy
                </h1>
              </div>
            </div>
            
            <p className="text-gray-300 text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-light">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>

            <div className="inline-block bg-gradient-to-r from-purple-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 px-8 py-4">
              <p className="text-gray-300 text-lg">
                <strong>Last Updated:</strong> January 2025
              </p>
            </div>
          </motion.div>

          {/* Privacy Policy Content */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sections.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
                >
                  <div className="p-8 h-full flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                        {section.icon}
                      </div>
                      <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                    </div>

                    <div className="space-y-8 flex-1">
                      {section.content.map((content, contentIndex) => (
                        <div key={contentIndex} className="space-y-4">
                          <h3 className="text-xl font-semibold text-purple-400">
                            {content.subtitle}
                          </h3>
                          <p className="text-gray-300 text-lg leading-relaxed">{content.text}</p>
                          <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                            {content.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="text-lg leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Additional Sections */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-8"
          >
            {additionalSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                      <BiFile className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                  </div>
                  <div className="space-y-4 text-gray-300">
                    <p className="text-lg leading-relaxed">{section.content}</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-lg leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-center space-y-8"
          >
            <div className="neonText">
              <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-6">
                Questions About Privacy?
              </h2>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              We're committed to transparency and protecting your privacy. If you have any questions, 
              don't hesitate to reach out to our team.
            </p>
            <MovingBorderButton
              onClick={() => window.open('mailto:info.analogous@gmail.com', '_blank')}
              borderRadius="0.5rem"
              duration={3000}
              containerClassName="w-auto h-auto mx-auto"
              borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
              className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md px-8 py-4 font-semibold text-lg flex items-center gap-2"
            >
              Contact Us
              <IconArrowRight className="w-5 h-5" />
            </MovingBorderButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 