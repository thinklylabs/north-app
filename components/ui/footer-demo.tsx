import Footer from "@/components/ui/animated-footer";

const DemoOne = () => {
  return  <Footer
          leftLinks={[
            { href: "/terms", label: "Terms & policies" },
            { href: "/privacy-policy", label: "Privacy policy" },
          ]}
          rightLinks={[
            { href: "/careers", label: "Careers" },
            { href: "/about", label: "About" },
            { href: "/help-center", label: "Help Center" },
            { href: "https://x.com/taher_max_", label: "Twitter" },
            { href: "https://www.instagram.com/taher_max_", label: "Instagram" },
            { href: "https://github.com/tahermaxse", label: "GitHub" },
          ]}
          copyrightText="Cluely 2025. All Rights Reserved"
          barCount={23}
        />;
};

export { DemoOne };
