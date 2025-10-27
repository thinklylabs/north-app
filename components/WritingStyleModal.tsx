"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface WritingStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WritingStyleModal({ isOpen, onClose, onSuccess }: WritingStyleModalProps) {
  const [tone, setTone] = useState("");
  const [formality, setFormality] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const [typicalLength, setTypicalLength] = useState("");
  const [styleRules, setStyleRules] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const handleSubmit = async () => {
    if (!tone || !formality || !vocabulary) {
      toast.error("Please fill in the required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const writingStyle = {
        tone,
        formality,
        vocabulary,
        typical_length: typicalLength || "Medium (100-250 words)",
        style_rules: styleRules ? styleRules.split('\n').filter(rule => rule.trim()) : [],
        style_summary: `Professional writing style with ${tone.toLowerCase()} tone and ${formality.toLowerCase()} formality`,
        hashtags_usage: "Moderate use of relevant hashtags",
        calls_to_action: "Encourages engagement and participation",
        recurring_topics: [],
        punctuation_emojis: "Clean punctuation with occasional emoji use",
        sentence_structure: "Varied sentence structure for clarity"
      };

      const res = await fetch("/api/linkedin/writing-style", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ writing_style: writingStyle }),
      });

      if (!res.ok) {
        throw new Error("Failed to save writing style");
      }

      toast.success("Writing style saved successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to save writing style");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1717]/20 backdrop-blur-[6px] p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[10px] bg-[#FCF9F5] shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 border-b border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5] rounded-t-[10px]">
          <h2 className="text-[16px] leading-[1.3em] text-[#0D1717] font-bold">Tell us about your writing style</h2>
          <button
            type="button"
            className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-[12px] leading-[1.3em] text-[#0D1717]/80 mb-4">
            Since you have fewer than 7 posts, help us understand your writing style.
          </p>
        
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1 text-[#0D1717]">Tone *</label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g., Professional, Friendly, Authoritative"
                className="w-full h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-medium mb-1 text-[#0D1717]">Formality *</label>
              <Input
                value={formality}
                onChange={(e) => setFormality(e.target.value)}
                placeholder="e.g., Formal, Semi-formal, Casual"
                className="w-full h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-medium mb-1 text-[#0D1717]">Vocabulary Style *</label>
              <Input
                value={vocabulary}
                onChange={(e) => setVocabulary(e.target.value)}
                placeholder="e.g., Technical, Simple, Academic"
                className="w-full h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-medium mb-1 text-[#0D1717]">Typical Post Length</label>
              <Input
                value={typicalLength}
                onChange={(e) => setTypicalLength(e.target.value)}
                placeholder="e.g., Short (50-100 words), Medium (100-250 words)"
                className="w-full h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-medium mb-1 text-[#0D1717]">Style Rules (one per line)</label>
              <textarea
                value={styleRules}
                onChange={(e) => setStyleRules(e.target.value)}
                placeholder="e.g., Always start with a question&#10;Use bullet points for lists&#10;Include a call to action"
                className="w-full h-20 bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] p-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595] resize-none"
              />
            </div>
          </div>
        
          <div className="flex gap-2 mt-6">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-[5px] px-[106px] py-[6px] h-auto disabled:opacity-60 cursor-pointer"
              disabled={submitting}
            >
              <span className="font-sans text-[12px] leading-[1.3em]">Skip</span>
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] px-[106px] py-[6px] h-auto disabled:opacity-60 cursor-pointer"
              disabled={submitting}
            >
              <span className="font-sans text-[12px] leading-[1.3em] text-white">
                {submitting ? "Saving..." : "Save Style"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
