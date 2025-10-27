
export default function StatsSection() {
  return (
    <section className="bg-[#FCF9F5] py-12 md:py-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-10">
        <div
          role="list"
          aria-label="Key product stats"
          className="grid grid-cols-2 gap-4 md:grid-cols-4 p-3 sm:p-4 md:p-6"
        >
          {/* First stat */}
          <div className="space-y-0.5 md:text-center">
            <div className="text-[#1DC6A1] text-4xl font-bold">90+</div>
            <p className="text-[#0D1717]/60">Integrations</p>
          </div>
          
          {/* Second stat */}
          <div className="space-y-0.5 md:text-center">
            <div className="text-[#1DC6A1] text-4xl font-bold">56%</div>
            <p className="text-[#0D1717]/60">Productivity Boost</p>
          </div>
          
          {/* Descriptive text spanning 2 columns */}
          <div className="col-span-2 border-t border-[#171717]/20 pt-4 md:border-l md:border-t-0 md:pl-12 md:pt-0">
            <p className="text-[#0D1717]/60 text-balance text-lg">Our platform continues to grow with developers and businesses using productivity.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
