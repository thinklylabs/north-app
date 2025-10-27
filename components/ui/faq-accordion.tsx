'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { Old_Standard_TT } from "next/font/google"
import Link from 'next/link'

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function FAQsTwo() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How long does shipping take?',
            answer: 'Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.',
        },
        {
            id: 'item-2',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. For enterprise customers, we also offer invoicing options.',
        },
        {
            id: 'item-3',
            question: 'Can I change or cancel my order?',
            answer: 'You can modify or cancel your order within 1 hour of placing it. After this window, please contact our customer support team who will assist you with any changes.',
        },
        {
            id: 'item-4',
            question: 'Do you ship internationally?',
            answer: "Yes, we ship to over 50 countries worldwide. International shipping typically takes 7-14 business days. Additional customs fees may apply depending on your country's import regulations.",
        },
        {
            id: 'item-5',
            question: 'What is your return policy?',
            answer: 'We offer a 30-day return policy for most items. Products must be in original condition with tags attached. Some specialty items may have different return terms, which will be noted on the product page.',
        },
    ]

    return (
        <section className="py-16 md:py-24 relative bg-[#FCF9F5]">
            {/* Flickering Grid Background */}
            <FlickeringGrid
                className="absolute inset-0 z-0"
                squareSize={3}
                gridGap={4}
                color="#6B7280"
                maxOpacity={0.3}
                flickerChance={0.08}
            />
            <div className="mx-auto max-w-5xl px-6 md:px-10 relative z-10">
                <div className="text-center">
                    <h2 className={`${oldStandard.className} text-balance text-4xl font-semibold lg:text-5xl text-[#0D1717]`}>Frequently Asked Questions</h2>
                    <p className="mt-4 text-[#0D1717]/80">Discover quick and comprehensive answers to common questions about our platform, services, and features.</p>
                </div>

                <div className="mx-auto mt-12 max-w-2xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-white w-full rounded-[10px] border border-[#171717]/20 px-6 py-4 shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="border-b border-[#171717]/10 last:border-b-0">
                                <AccordionTrigger className="cursor-pointer text-[#0D1717] font-medium hover:no-underline py-4 text-left">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-[#0D1717]/80 pb-4">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-[#0D1717]/60 mt-6 text-center">
                        Can't find what you're looking for? Contact our{' '}
                        <Link
                            href="#"
                            className="text-[#1DC6A1] font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
