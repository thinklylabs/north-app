"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { CheckCircle } from "lucide-react";

export default function OnboardingCard() {
  const steps = [
    "Explore the knowledge base",
    "Connect your accounts", 
    "Generate first posts",
    "Load your engagement feed",
    "Load your leads",
  ];

  // For demo purposes, let's show 2 completed steps
  const completedSteps = 2;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <CardSpotlight 
      radius={350} 
      color="#1DC6A1" 
      className="border border-[#0D1717]/30"
    >
      <Card className="p-4 bg-transparent rounded-[5px] border-0">
        <CardContent className="p-0">
          <h2 className="text-[12px] font-medium text-[#0D1717] mb-1">
            Complete your onboarding
          </h2>
          <p className="text-[10px] text-[#6F7777] mb-3 leading-[1.3em]">
            Connect your applications to help us keep the knowledge base updated
          </p>

          <ul className="space-y-1.5 mb-3">
            {steps.map((step, i) => {
              const isCompleted = i < completedSteps;
              return (
                <li key={i} className="flex items-center text-[#6F7777] text-[10px]">
                  <div className="w-3 h-3 mr-2 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle className="w-3 h-3 text-[#1DC6A1]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border border-[#6F7777]" />
                    )}
                  </div>
                  <span className={isCompleted ? "text-[#0D1717]" : "text-[#6F7777]"}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="w-full h-1.5 bg-[#E8E6E2] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1DC6A1] transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-[9px] text-[#6F7777] mt-1 text-right">
            {Math.round(progressPercentage)}%
          </p>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}
