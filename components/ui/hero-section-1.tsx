'use client'
import React from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { cn } from '@/lib/utils'
import { Old_Standard_TT } from "next/font/google"
import { Features } from '@/components/ui/features-7'
import { Features as HowItWorks } from '@/components/ui/features-1'
import StatsSection from '@/components/ui/stats'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import FAQsTwo from '@/components/ui/faq-accordion'
import CTAWithVerticalMarquee from '@/components/ui/cta-with-text-marquee'
import Footer from '@/components/ui/animated-footer'

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export function HeroSection() {
    return (
        <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717] relative">
            {/* Flickering Grid Background */}
            <FlickeringGrid
                className="absolute inset-0 z-0"
                squareSize={3}
                gridGap={4}
                color="#6B7280"
                maxOpacity={0.3}
                flickerChance={0.08}
            />
            <HeroHeader />
            <main className="overflow-hidden relative z-10">
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <div className="mx-auto max-w-7xl px-6 md:px-10">
                            <div className="text-center">
                                <AnimatedGroup variants={transitionVariants}>
                                    <Link
                                        href="#link"
                                        className="group mx-auto flex w-fit items-center gap-4 rounded-full border border-[#171717]/20 bg-white p-1 pl-4 shadow-[0_6px_20px_rgba(13,23,23,0.08)] transition-all duration-300 hover:bg-[#FCF9F5]">
                                        <span className="text-[#0D1717] text-sm">Introducing Support for AI Models</span>
                                        <span className="block h-4 w-0.5 border-l border-[#171717]/20 bg-[#FCF9F5]"></span>

                                        <div className="bg-[#FCF9F5] group-hover:bg-white size-6 overflow-hidden rounded-full duration-500">
                                            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3 text-[#0D1717]" />
                                                </span>
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3 text-[#0D1717]" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                        
                                    <h1 className={`${oldStandard.className} mt-8 max-w-4xl mx-auto text-balance text-4xl md:text-6xl lg:mt-16 xl:text-7xl`}>
                                        Modern Solutions for Customer Engagement
                                    </h1>
                                    <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-[#0D1717]/80">
                                        Highly customizable components for building modern websites and applications that look and feel the way you mean it.
                                    </p>
                                </AnimatedGroup>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        ...transitionVariants,
                                    }}
                                    className="mt-12 flex flex-col items-center justify-center gap-3 md:flex-row">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="rounded-[10px] px-6 py-3 bg-[#1DC6A1] hover:bg-[#1DC6A1]/90 text-[#0D1717] font-medium">
                                        <Link href="#link">
                                            <span className="text-nowrap">Start Building</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline"
                                        className="rounded-[10px] px-6 py-3 border-[#171717]/20 text-[#0D1717] hover:bg-[#F0ECE6]">
                                        <Link href="#link">
                                            <span className="text-nowrap">Request a demo</span>
                                        </Link>
                                    </Button>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}>
                            <div className="relative mt-8 overflow-hidden px-2 sm:mt-12 md:mt-20">
                                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[10px] border border-[#171717]/20 bg-white p-4 shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
                                    <img
                                        className="aspect-15/8 relative rounded-[10px] w-full"
                                        src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=2700&auto=format&fit=crop"
                                        alt="app screen"
                                        width={2700}
                                        height={1440}
                                    />
                                </div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>
                <section className="bg-[#FCF9F5] pb-16 pt-16 md:pb-32 relative">
                    {/* Flickering Grid Background */}
                    <FlickeringGrid
                        className="absolute inset-0 z-0"
                        squareSize={3}
                        gridGap={4}
                        color="#6B7280"
                        maxOpacity={0.3}
                        flickerChance={0.08}
                    />
                    <div className="group relative m-auto max-w-5xl px-6 md:px-10 z-10">
                        <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
                            <Link
                                href="/"
                                className="block text-sm text-[#0D1717]/60 duration-150 hover:opacity-75">
                                <span>Meet Our Customers</span>
                                <ChevronRight className="ml-1 inline-block size-3" />
                            </Link>
                        </div>
                        <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
                            <div className="flex">
                                <img
                                    className="mx-auto h-5 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/nvidia.svg"
                                    alt="Nvidia Logo"
                                    height={20}
                                    width={80}
                                />
                            </div>

                            <div className="flex">
                                <img
                                    className="mx-auto h-4 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/column.svg"
                                    alt="Column Logo"
                                    height={16}
                                    width={80}
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="mx-auto h-4 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/github.svg"
                                    alt="GitHub Logo"
                                    height={16}
                                    width={80}
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="mx-auto h-5 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/nike.svg"
                                    alt="Nike Logo"
                                    height={20}
                                    width={80}
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="mx-auto h-5 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"
                                    alt="Lemon Squeezy Logo"
                                    height={20}
                                    width={80}
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="mx-auto h-4 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/laravel.svg"
                                    alt="Laravel Logo"
                                    height={16}
                                    width={80}
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="mx-auto h-7 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/lilly.svg"
                                    alt="Lilly Logo"
                                    height={28}
                                    width={80}
                                />
                            </div>

                            <div className="flex">
                                <img
                                    className="mx-auto h-6 w-fit opacity-60"
                                    src="https://html.tailus.io/blocks/customers/openai.svg"
                                    alt="OpenAI Logo"
                                    height={24}
                                    width={80}
                                />
                            </div>
                        </div>
                    </div>
                </section>
                <Features />
                <HowItWorks />
                <StatsSection />
                <FAQsTwo />
                <CTAWithVerticalMarquee />
            </main>
            <Footer
                leftLinks={[
                    { href: "/terms", label: "Terms & policies" },
                    { href: "/privacy-policy", label: "Privacy policy" },
                ]}
                rightLinks={[
                    { href: "/careers", label: "Careers" },
                    { href: "/about", label: "About" },
                    { href: "/help-center", label: "Help Center" },
                    { href: "https://x.com/north_app", label: "Twitter" },
                    { href: "https://www.instagram.com/north_app", label: "Instagram" },
                    { href: "https://github.com/north-app", label: "GitHub" },
                ]}
                copyrightText="North 2025. All Rights Reserved"
                barCount={23}
            />
        </div>
    )
}

const menuItems = [
    { name: 'Features', href: '#link' },
    { name: 'Solution', href: '#link' },
    { name: 'Pricing', href: '#link' },
    { name: 'About', href: '#link' },
]

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])
    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2 group">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-[#FCF9F5]/90 max-w-4xl rounded-[10px] border border-[#171717]/20 backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <Logo />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200 text-[#0D1717]" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 text-[#0D1717]" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="text-[#0D1717]/60 hover:text-[#0D1717] block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-[#FCF9F5] group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-[10px] border border-[#171717]/20 p-6 shadow-[0_6px_20px_rgba(13,23,23,0.08)] md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-[#0D1717]/60 hover:text-[#0D1717] block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className={cn('rounded-[10px] border-[#171717]/20 text-[#0D1717] hover:bg-[#F0ECE6]', isScrolled && 'lg:hidden')}>
                                    <Link href="#">
                                        <span>Login</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn('rounded-[10px] bg-[#1DC6A1] hover:bg-[#1DC6A1]/90 text-[#0D1717]', isScrolled && 'lg:hidden')}>
                                    <Link href="#">
                                        <span>Sign Up</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn('rounded-[10px] bg-[#1DC6A1] hover:bg-[#1DC6A1]/90 text-[#0D1717]', isScrolled ? 'lg:inline-flex' : 'hidden')}>
                                    <Link href="#">
                                        <span>Get Started</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}

const Logo = ({ className }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 78 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-5 w-auto', className)}>
            <path
                d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z"
                fill="url(#logo-gradient)"
            />
            <path
                d="M27.06 7.054V12.239C27.06 12.5903 27.1393 12.8453 27.298 13.004C27.468 13.1513 27.7513 13.225 28.148 13.225H29.338V14.84H27.808C26.9353 14.84 26.2667 14.636 25.802 14.228C25.3373 13.82 25.105 13.157 25.105 12.239V7.054H24V5.473H25.105V3.144H27.06V5.473H29.338V7.054H27.06ZM30.4782 10.114C30.4782 9.17333 30.6709 8.34033 31.0562 7.615C31.4529 6.88967 31.9855 6.32867 32.6542 5.932C33.3342 5.524 34.0822 5.32 34.8982 5.32C35.6349 5.32 36.2752 5.46733 36.8192 5.762C37.3745 6.04533 37.8165 6.40233 38.1452 6.833V5.473H40.1002V14.84H38.1452V13.446C37.8165 13.888 37.3689 14.2563 36.8022 14.551C36.2355 14.8457 35.5895 14.993 34.8642 14.993C34.0595 14.993 33.3229 14.789 32.6542 14.381C31.9855 13.9617 31.4529 13.3837 31.0562 12.647C30.6709 11.899 30.4782 11.0547 30.4782 10.114ZM38.1452 10.148C38.1452 9.502 38.0092 8.941 37.7372 8.465C37.4765 7.989 37.1309 7.62633 36.7002 7.377C36.2695 7.12767 35.8049 7.003 35.3062 7.003C34.8075 7.003 34.3429 7.12767 33.9122 7.377C33.4815 7.615 33.1302 7.972 32.8582 8.448C32.5975 8.91267 32.4672 9.468 32.4672 10.114C32.4672 10.76 32.5975 11.3267 32.8582 11.814C33.1302 12.3013 33.4815 12.6753 33.9122 12.936C34.3542 13.1853 34.8189 13.31 35.3062 13.31C35.8049 13.31 36.2695 13.1853 36.7002 12.936C37.1309 12.6867 37.4765 12.324 37.7372 11.848C38.0092 11.3607 38.1452 10.794 38.1452 10.148ZM43.6317 4.232C43.2803 4.232 42.9857 4.113 42.7477 3.875C42.5097 3.637 42.3907 3.34233 42.3907 2.991C42.3907 2.63967 42.5097 2.345 42.7477 2.107C42.9857 1.869 43.2803 1.75 43.6317 1.75C43.9717 1.75 44.2607 1.869 44.4987 2.107C44.7367 2.345 44.8557 2.63967 44.8557 2.991C44.8557 3.34233 44.7367 3.637 44.4987 3.875C44.2607 4.113 43.9717 4.232 43.6317 4.232ZM44.5837 5.473V14.84H42.6457V5.473H44.5837ZM49.0661 2.26V14.84H47.1281V2.26H49.0661ZM50.9645 10.114C50.9645 9.17333 51.1572 8.34033 51.5425 7.615C51.9392 6.88967 52.4719 6.32867 53.1405 5.932C53.8205 5.524 54.5685 5.32 55.3845 5.32C56.1212 5.32 56.7615 5.46733 57.3055 5.762C57.8609 6.04533 58.3029 6.40233 58.6315 6.833V5.473H60.5865V14.84H58.6315V13.446C58.3029 13.888 57.8552 14.2563 57.2885 14.551C56.7219 14.8457 56.0759 14.993 55.3505 14.993C54.5459 14.993 53.8092 14.789 53.1405 14.381C52.4719 13.9617 51.9392 13.3837 51.5425 12.647C51.1572 11.899 50.9645 11.0547 50.9645 10.114ZM58.6315 10.148C58.6315 9.502 58.4955 8.941 58.2235 8.465C57.9629 7.989 57.6172 7.62633 57.1865 7.377C56.7559 7.12767 56.2912 7.003 55.7925 7.003C55.2939 7.003 54.8292 7.12767 54.3985 7.377C53.9679 7.615 53.6165 7.972 53.3445 8.448C53.0839 8.91267 52.9535 9.468 52.9535 10.114C52.9535 10.76 53.0839 11.3267 53.3445 11.814C53.6165 12.3013 53.9679 12.6753 54.3985 12.936C54.8405 13.1853 55.3052 13.31 55.7925 13.31C56.2912 13.31 56.7559 13.1853 57.1865 12.936C57.6172 12.6867 57.9629 12.324 58.2235 11.848C58.4955 11.3607 58.6315 10.794 58.6315 10.148ZM65.07 6.833C65.3533 6.357 65.7273 5.98867 66.192 5.728C66.668 5.456 67.229 5.32 67.875 5.32V7.326H67.382C66.6227 7.326 66.0447 7.51867 65.648 7.904C65.2627 8.28933 65.07 8.958 65.07 9.91V14.84H63.132V5.473H65.07V6.833ZM73.3624 10.165L77.6804 14.84H75.0624L71.5944 10.811V14.84H69.6564V2.26H71.5944V9.57L74.9944 5.473H77.6804L73.3624 10.165Z"
                fill="currentColor"
            />
            <defs>
                <linearGradient
                    id="logo-gradient"
                    x1="10"
                    y1="0"
                    x2="10"
                    y2="20"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9B99FE" />
                    <stop
                        offset="1"
                        stopColor="#2BC8B7"
                    />
                </linearGradient>
            </defs>
        </svg>
    )
}
