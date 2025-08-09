"use client";

import { motion } from "framer-motion";
import { BiFile, BiShield, BiCreditCard, BiUserCheck } from "react-icons/bi";
import { IconArrowRight } from "@tabler/icons-react";
import { MovingBorderButton } from "@/components/MovingBorder";

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: <BiFile className="w-8 h-8 text-purple-400" />,
      title: "Acceptance of Terms",
      content: [
        {
          subtitle: "Agreement to Terms",
          text: "By accessing and using Analogous, you accept and agree to be bound by the terms and provision of this agreement.",
          items: [
            "You must be at least 13 years old to use our service",
            "You agree to provide accurate and complete information",
            "You are responsible for maintaining the security of your account",
            "You agree to use the service only for lawful purposes"
          ]
        },
        {
          subtitle: "Changes to Terms",
          text: "We reserve the right to modify these terms at any time:",
          items: [
            "Changes will be effective immediately upon posting",
            "Continued use constitutes acceptance of new terms",
            "We will notify users of significant changes via email",
            "You can review the current terms at any time"
          ]
        }
      ]
    },
    {
      icon: <BiUserCheck className="w-8 h-8 text-purple-400" />,
      title: "User Accounts and Responsibilities",
      content: [
        {
          subtitle: "Account Creation",
          text: "When creating an account, you agree to:",
          items: [
            "Provide accurate, current, and complete information",
            "Maintain and update your account information",
            "Keep your password secure and confidential",
            "Notify us immediately of any unauthorized use"
          ]
        },
        {
          subtitle: "Prohibited Activities",
          text: "You agree not to:",
          items: [
            "Use the service for any illegal or unauthorized purpose",
            "Attempt to gain unauthorized access to our systems",
            "Interfere with or disrupt the service or servers",
            "Share your account credentials with others",
            "Generate content that is harmful, offensive, or violates rights"
          ]
        }
      ]
    },
    {
      icon: <BiCreditCard className="w-8 h-8 text-purple-400" />,
      title: "Payment Terms and Subscriptions",
      content: [
        {
          subtitle: "Payment Processing",
          text: "All payments are processed securely through Stripe:",
          items: [
            "Payment information is encrypted and secure",
            "We do not store your payment card details",
            "Stripe handles all payment processing and security",
            "You agree to Stripe's terms of service for payments"
          ]
        },
        {
          subtitle: "Subscription Management",
          text: "For subscription services:",
          items: [
            "Subscriptions automatically renew unless cancelled",
            "You can cancel your subscription at any time",
            "Refunds are handled according to our refund policy",
            "Price changes will be communicated in advance",
            "Free tier users have limited access to features"
          ]
        }
      ]
    },
    {
      icon: <BiShield className="w-8 h-8 text-purple-400" />,
      title: "Intellectual Property and Content",
      content: [
        {
          subtitle: "Our Content",
          text: "Analogous and its content are protected by intellectual property laws:",
          items: [
            "We retain all rights to our platform and technology",
            "Analogies generated are for educational use only",
            "You may not copy, modify, or distribute our content",
            "Our trademarks and branding are protected"
          ]
        },
        {
          subtitle: "User-Generated Content",
          text: "When you use our service:",
          items: [
            "You retain ownership of your original content",
            "You grant us license to use content for service provision",
            "You are responsible for the content you create",
            "We may remove content that violates our terms"
          ]
        }
      ]
    }
  ];

  const additionalSections = [
    {
      title: "Service Availability",
      content: "We strive to provide reliable service, but we cannot guarantee uninterrupted access:",
      items: [
        "Service may be temporarily unavailable for maintenance",
        "We are not liable for service interruptions",
        "We will provide advance notice for scheduled maintenance",
        "Emergency maintenance may occur without notice"
      ]
    },
    {
      title: "Limitation of Liability",
      content: "To the maximum extent permitted by law:",
      items: [
        "We are not liable for indirect, incidental, or consequential damages",
        "Our total liability is limited to the amount you paid for our service",
        "We do not guarantee the accuracy of generated analogies",
        "You use our service at your own risk"
      ]
    },
    {
      title: "Privacy and Data Protection",
      content: "Your privacy is important to us. Our data practices are governed by our Privacy Policy:",
      items: [
        "We collect and process data as described in our Privacy Policy",
        "You consent to our data practices by using our service",
        "We implement appropriate security measures",
        "You have rights regarding your personal data"
      ]
    },
    {
      title: "Termination",
      content: "Either party may terminate this agreement:",
      items: [
        "You may cancel your account at any time",
        "We may terminate accounts that violate our terms",
        "Termination does not affect accrued rights or obligations",
        "We may delete account data after termination"
      ]
    },
    {
      title: "Governing Law",
      content: "These terms are governed by the laws of Ontario:",
      items: [
        "Any disputes will be resolved in Ontario courts",
        "If any provision is invalid, the remainder remains in effect",
        "These terms constitute the entire agreement",
        "Waiver of any provision must be in writing"
      ]
    },
    {
      title: "Contact Information",
      content: "If you have questions about these terms, please contact us:",
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
                <BiFile className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="neonText">
                <h1 className="font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105">
                  Terms of Service
                </h1>
              </div>
            </div>
            
            <p className="text-gray-300 text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-light">
              Please read these terms carefully before using our service.
            </p>

            <div className="inline-block bg-gradient-to-r from-purple-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 px-8 py-4">
              <p className="text-gray-300 text-lg">
                <strong>Last Updated:</strong> January 2025
              </p>
            </div>
          </motion.div>

          {/* Terms Content */}
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
                Questions About Our Terms?
              </h2>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              We're committed to transparency and clear communication. If you have any questions about 
              our terms of service, don't hesitate to reach out to our team.
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