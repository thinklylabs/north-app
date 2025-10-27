"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Old_Standard_TT } from "next/font/google";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: ["400", "700"] });

interface FeedbackForm {
  overallRating: number;
  easeOfUse: number;
  valueProvided: number;
  likelihoodToRecommend: number;
  favoriteFeature: string;
  biggestPainPoint: string;
  suggestions: string;
  additionalComments: string;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FeedbackForm>({
    overallRating: 0,
    easeOfUse: 0,
    valueProvided: 0,
    likelihoodToRecommend: 0,
    favoriteFeature: "",
    biggestPainPoint: "",
    suggestions: "",
    additionalComments: "",
  });

  const handleRatingChange = (field: keyof FeedbackForm, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.overallRating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/feedback/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      toast.success("Thank you for your feedback! We'll review it and get back to you.");
      router.push('/users/dashboard');
    } catch (error: any) {
      toast.error(error.message || "Failed to submit feedback. Please try again.");
      console.error('Feedback submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const RatingStars = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#0D1717]">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value 
                  ? "text-yellow-400 fill-yellow-400" 
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCF9F5]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#6F7777] hover:text-[#0D1717] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <h1 className={`${oldStandard.className} text-3xl font-bold text-[#0D1717] mb-2`}>
            Share Your Feedback
          </h1>
          <p className="text-[#6F7777]">
            Help us improve Thinkly by sharing your experience. Your feedback is invaluable for making our product better.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating Questions */}
          <div className="bg-white rounded-lg p-6 border border-[#171717]/10 shadow-sm">
            <h2 className={`${oldStandard.className} text-xl font-semibold text-[#0D1717] mb-6`}>
              Rate Your Experience
            </h2>
            
            <div className="space-y-6">
              <RatingStars
                value={formData.overallRating}
                onChange={(value) => handleRatingChange('overallRating', value)}
                label="Overall satisfaction with Thinkly"
              />
              
              <RatingStars
                value={formData.easeOfUse}
                onChange={(value) => handleRatingChange('easeOfUse', value)}
                label="How easy is Thinkly to use?"
              />
              
              <RatingStars
                value={formData.valueProvided}
                onChange={(value) => handleRatingChange('valueProvided', value)}
                label="How valuable is Thinkly for your work?"
              />
              
              <RatingStars
                value={formData.likelihoodToRecommend}
                onChange={(value) => handleRatingChange('likelihoodToRecommend', value)}
                label="How likely are you to recommend Thinkly to others?"
              />
            </div>
          </div>

          {/* Open-ended Questions */}
          <div className="bg-white rounded-lg p-6 border border-[#171717]/10 shadow-sm">
            <h2 className={`${oldStandard.className} text-xl font-semibold text-[#0D1717] mb-6`}>
              Tell Us More
            </h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="favoriteFeature" className="text-sm font-medium text-[#0D1717]">
                  What's your favorite feature in Thinkly?
                </Label>
                <Input
                  id="favoriteFeature"
                  value={formData.favoriteFeature}
                  onChange={(e) => handleInputChange('favoriteFeature', e.target.value)}
                  placeholder="e.g., AI-powered content generation, LinkedIn integration..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="biggestPainPoint" className="text-sm font-medium text-[#0D1717]">
                  What's the biggest pain point or challenge you face?
                </Label>
                <Input
                  id="biggestPainPoint"
                  value={formData.biggestPainPoint}
                  onChange={(e) => handleInputChange('biggestPainPoint', e.target.value)}
                  placeholder="e.g., Difficult to navigate, slow loading times..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="suggestions" className="text-sm font-medium text-[#0D1717]">
                  What features would you like to see added or improved?
                </Label>
                <textarea
                  id="suggestions"
                  value={formData.suggestions}
                  onChange={(e) => handleInputChange('suggestions', e.target.value)}
                  placeholder="Share your ideas for new features or improvements..."
                  className="mt-2 w-full h-24 px-3 py-2 border border-[#171717]/20 rounded-md bg-[#FCF9F5] resize-none focus:outline-none focus:ring-2 focus:ring-[#1DC6A1] focus:border-transparent"
                />
              </div>

              <div>
                <Label htmlFor="additionalComments" className="text-sm font-medium text-[#0D1717]">
                  Any additional comments or suggestions?
                </Label>
                <textarea
                  id="additionalComments"
                  value={formData.additionalComments}
                  onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                  placeholder="Anything else you'd like us to know?"
                  className="mt-2 w-full h-24 px-3 py-2 border border-[#171717]/20 rounded-md bg-[#FCF9F5] resize-none focus:outline-none focus:ring-2 focus:ring-[#1DC6A1] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || formData.overallRating === 0}
              className="px-8 py-3 bg-[#1DC6A1] hover:bg-[#19b391] text-white font-medium"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
