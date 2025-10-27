import { CardStack } from '@/components/ui/card-stack'
import { Settings2, Sparkles, Zap } from 'lucide-react'
import { Old_Standard_TT } from "next/font/google"
import { FlickeringGrid } from '@/components/ui/flickering-grid'

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export function Features() {
    return (
        <section className="bg-[#FCF9F5] py-16 md:py-32 relative">
            {/* Flickering Grid Background */}
            <FlickeringGrid
                className="absolute inset-0 z-0"
                squareSize={3}
                gridGap={4}
                color="#6B7280"
                maxOpacity={0.3}
                flickerChance={0.08}
            />
            <div className="@container mx-auto max-w-5xl px-6 md:px-10 relative z-10">
                <div className="text-center">
                    <h2 className={`${oldStandard.className} text-balance text-4xl font-semibold lg:text-5xl text-[#0D1717]`}>How it works</h2>
                    <p className="mt-4 text-[#0D1717]/80">Libero sapiente aliquam quibusdam aspernatur, praesentium iusto repellendus.</p>
                </div>
                <div className="flex items-center justify-center mt-8 md:mt-16">
                    <CardStack items={CARDS} />
                </div>
            </div>
        </section>
    )
}

const CARDS = [
    {
        id: 0,
        name: "Customizable",
        designation: "Tailor every aspect",
        content: (
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1DC6A1] rounded-full flex items-center justify-center">
                            <Zap className="size-3 text-white" />
                        </div>
                        <span className="text-xs text-[#0D1717]/60">Customizable</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[#0D1717]">Extensive customization options</p>
                        <p className="text-xs text-[#0D1717]/60 leading-relaxed">
                            Allowing you to tailor every aspect to meet your specific needs and create a unique experience.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Flexible</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Adaptable</span>
                    </div>
                </div>
                <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop" 
                        alt="Customization dashboard" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        ),
    },
    {
        id: 1,
        name: "Full Control",
        designation: "Complete control",
        content: (
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1DC6A1] rounded-full flex items-center justify-center">
                            <Settings2 className="size-3 text-white" />
                        </div>
                        <span className="text-xs text-[#0D1717]/60">Full Control</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[#0D1717]">You have complete control</p>
                        <p className="text-xs text-[#0D1717]/60 leading-relaxed">
                            From design elements to functionality, create a unique and personalized experience.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Control</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Personalized</span>
                    </div>
                </div>
                <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    <img 
                        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop" 
                        alt="Control panel" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        ),
    },
    {
        id: 2,
        name: "AI Powered",
        designation: "Intelligent automation",
        content: (
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1DC6A1] rounded-full flex items-center justify-center">
                            <Sparkles className="size-3 text-white" />
                        </div>
                        <span className="text-xs text-[#0D1717]/60">AI Powered</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[#0D1717]">Intelligent automation</p>
                        <p className="text-xs text-[#0D1717]/60 leading-relaxed">
                            Advanced AI capabilities to automate and enhance your workflow with smart features.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Smart</span>
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">Automated</span>
                    </div>
                </div>
                <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    <img 
                        src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=600&auto=format&fit=crop" 
                        alt="AI automation" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        ),
    },
];
