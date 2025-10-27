import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import { Old_Standard_TT } from "next/font/google"

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export function Features() {
    return (
        <section className="overflow-hidden py-16 md:py-32 bg-[#FCF9F5]">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:px-10 md:space-y-12">
                <div className="relative z-10 max-w-2xl">
                    <h2 className={`${oldStandard.className} text-4xl font-semibold lg:text-5xl text-[#0D1717]`}>Built for Scaling teams</h2>
                    <p className="mt-6 text-lg text-[#0D1717]/80">Empower your team with workflows that adapt to your needs, whether you prefer git synchronization or a AI Agents interface.</p>
                </div>
                <div className="relative -mx-4 rounded-[10px] p-3 md:-mx-12 lg:col-span-3">
                    <div className="[perspective:800px]">
                        <div className="[transform:skewY(-2deg)skewX(-2deg)rotateX(6deg)]">
                            <div className="aspect-[21/9] relative max-w-5xl mx-auto">
                                <div className="[background-image:radial-gradient(var(--tw-gradient-stops,at_75%_25%))] to-background z-1 -inset-[1.5rem] absolute from-transparent to-75%"></div>
                                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1400&auto=format&fit=crop" className="absolute inset-0 z-10 rounded-[10px] w-full h-full object-cover" alt="dashboard illustration" width={1400} height={600} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Zap className="size-4 text-[#1DC6A1]" />
                            <h3 className="text-sm font-medium text-[#0D1717]">Faaast</h3>
                        </div>
                        <p className="text-[#0D1717]/60 text-sm">It supports an entire helping developers and innovate.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="size-4 text-[#1DC6A1]" />
                            <h3 className="text-sm font-medium text-[#0D1717]">Powerful</h3>
                        </div>
                        <p className="text-[#0D1717]/60 text-sm">It supports an entire helping developers and businesses.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Lock className="size-4 text-[#1DC6A1]" />
                            <h3 className="text-sm font-medium text-[#0D1717]">Security</h3>
                        </div>
                        <p className="text-[#0D1717]/60 text-sm">It supports an helping developers businesses innovate.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-[#1DC6A1]" />
                            <h3 className="text-sm font-medium text-[#0D1717]">AI Powered</h3>
                        </div>
                        <p className="text-[#0D1717]/60 text-sm">It supports an helping developers businesses innovate.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
