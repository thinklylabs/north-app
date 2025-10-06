"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";
import { useState } from "react";
import Nango from "@nangohq/frontend";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function LibraryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubstackModalOpen, setIsSubstackModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"context" | "sources">("sources");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isAddContextOpen, setIsAddContextOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [substackUrls, setSubstackUrls] = useState([""]);
  const [validatedUrls, setValidatedUrls] = useState([false]);
  const [substackImporting, setSubstackImporting] = useState(false);
  const [substackImportMessage, setSubstackImportMessage] = useState("");
  const [slackConnecting, setSlackConnecting] = useState(false);

  function openModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function openSubstackModal() {
    setIsSubstackModalOpen(true);
  }

  function closeSubstackModal() {
    setIsSubstackModalOpen(false);
    setSubstackImportMessage("");
  }

  function openAddContext() {
    setIsAddContextOpen(true);
  }

  function closeAddContext() {
    setIsAddContextOpen(false);
  }

  function handleSubstackUrlChange(index: number, value: string) {
    const newUrls = [...substackUrls];
    newUrls[index] = value.trim();
    setSubstackUrls(newUrls);
    
    // Improved validation: must be a valid Substack URL
    const newValidated = [...validatedUrls];
    const isValid = /^https?:\/\/[a-z0-9-]+\.substack\.com(\/.*)?$/i.test(value);
    newValidated[index] = isValid;
    setValidatedUrls(newValidated);
  }
  
  async function handleSlackConnect() {
    try {
      setSlackConnecting(true);
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = session?.access_token;
      if (!token) throw new Error("You must be logged in");

      const res = await fetch("/api/nango/connect-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create connect session");

      const nango = new Nango({ connectSessionToken: json.token });
      nango.openConnectUI({
        onEvent: async (event: any) => {
          if (event?.type === "connect") {
            const { connectionId, providerConfigKey } = event.payload || {};
            if (connectionId) {
              // Save the connection
              await fetch("/api/nango/save-connection", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ connectionId, providerConfigKey }),
              });

              // Fetch and store Slack messages
              try {
                const messagesResponse = await fetch("/api/slack/fetch-messages", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ 
                    userId: session.user.id, 
                    connectionId, 
                    providerConfigKey 
                  }),
                });

                if (messagesResponse.ok) {
                  const result = await messagesResponse.json();
                  console.log(`Successfully fetched ${result.messageCount} messages from ${result.channelCount} channels`);
                } else {
                  console.error('Failed to fetch Slack messages:', await messagesResponse.text());
                }
              } catch (error) {
                console.error('Error fetching Slack messages:', error);
              }
            }
          }
        },
      });
    } catch (e) {
      // no-op UI error handling for now
    } finally {
      setSlackConnecting(false);
    }
  }

  function addSubstackField() {
    setSubstackUrls([...substackUrls, ""]);
    setValidatedUrls([...validatedUrls, false]);
  }
  
  function removeSubstackField(index?: number) {
    const targetIndex = index === undefined ? substackUrls.length - 1 : index;
    if (substackUrls.length <= 1) {
      setSubstackUrls([""]);
      setValidatedUrls([false]);
      return;
    }
    const urls = [...substackUrls];
    const vals = [...validatedUrls];
    urls.splice(targetIndex, 1);
    vals.splice(targetIndex, 1);
    setSubstackUrls(urls);
    setValidatedUrls(vals);
  }

  async function handleImportSubstack() {
    const validUrls = substackUrls.filter((_, i) => validatedUrls[i]);
    if (validUrls.length === 0) {
      setSubstackImportMessage("Please provide at least one valid Substack URL.");
      return;
    }

    setSubstackImporting(true);
    setSubstackImportMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = session?.access_token;
      if (!token) throw new Error("You must be logged in");

      const res = await fetch("/api/import-substack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urls: validUrls }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Import failed");

      setSubstackImportMessage(json?.message || "Import successful!");
    } catch (e: any) {
      setSubstackImportMessage(e?.message || "Import failed. Please check the URLs and try again.");
    } finally {
      setSubstackImporting(false);
    }
  }
  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="w-full min-h-screen flex">
        <DashboardSidebar />
        <section className="flex-1 relative px-6 md:px-10 pb-24">
          <div className="absolute right-6 top-6 md:right-10 md:top-[23px]">
            <LogoutButton />
          </div>
          {/* Breadcrumb */}
          <div className="pt-6 md:pt-[23px] flex items-center gap-3">
            <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Library</span>
          </div>

          {/* Title */}
          <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
            Library (knowledge base)
          </h1>

          {/* Tabs */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setActiveTab("context")}
                variant="outline"
                className={`h-[27px] rounded-[5px] px-3 py-0 text-[10px] cursor-pointer border [border-width:0.5px] ${
                  activeTab === "context"
                    ? "bg-[#FCF9F5] border-[#171717] text-[#0D1717]"
                    : "bg-transparent border-[#d1d5db] text-[#0D1717]/70"
                }`}
              >
                Context
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("sources")}
                className={`h-[27px] rounded-[5px] px-3 py-0 text-[10px] cursor-pointer ${
                  activeTab === "sources"
                    ? "bg-[#1DC6A1] text-white hover:bg-[#19b391]"
                    : "bg-[#e5e7eb] text-[#0D1717]/80 hover:bg-[#d1d5db]"
                }`}
              >
                Sources
              </Button>
            </div>
            {activeTab === "context" && (
              <Button
                type="button"
                onClick={openAddContext}
                className="h-[27px] rounded-[5px] bg-[#A4D6CB] text-[#0D1717] px-3 py-0 text-[10px] cursor-pointer"
              >
                Add +
              </Button>
            )}
          </div>

          {/* Section intro */}
          <p className="mt-6 text-[12px] leading-[1.3em] max-w-[700px]">
            Connect data sources to provide context to our AI model
          </p>

          {activeTab === "sources" ? (
            // Grid of sources (Context)
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1155px]">
              {Array.from({ length: 9 }).map((_, i) => (
                i === 0 ? (
                  <div
                    key={i}
                    className="h-[72px] rounded-[10px] bg-[#162022] relative grid grid-cols-[auto_1fr_auto] items-center px-4"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src="/fireflies.png"
                        alt="Fireflies"
                        width={40}
                        height={40}
                        className="rounded-[4px]"
                      />
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[16px] leading-[1.3em] text-white/90 text-center">Fireflies</span>
                    </div>
                    <Button
                      type="button"
                      onClick={openModal}
                      className="h-[27px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-3 py-0 text-[10px] cursor-pointer"
                    >
                      Connect
                    </Button>
                  </div>
                ) : i === 1 ? (
                  <div
                    key={i}
                    className="h-[72px] rounded-[10px] bg-[#162022] relative grid grid-cols-[auto_1fr_auto] items-center px-4"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src="/substack.png"
                        alt="Substack"
                        width={40}
                        height={40}
                        className="rounded-[4px]"
                      />
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[16px] leading-[1.3em] text-white/90 text-center">Substack</span>
                    </div>
                    <Button
                      type="button"
                      onClick={openSubstackModal}
                      className="h-[27px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-3 py-0 text-[10px] cursor-pointer"
                    >
                      Connect
                    </Button>
                  </div>
                ) : i === 2 ? (
                  <div
                    key={i}
                    className="h-[72px] rounded-[10px] bg-[#162022] relative grid grid-cols-[auto_1fr_auto] items-center px-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-[40px] h-[40px] rounded-[4px] bg-[#1DC6A1] flex items-center justify-center text-white text-[12px]">
                        S
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[16px] leading-[1.3em] text-white/90 text-center">Slack</span>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSlackConnect}
                      className="h-[27px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-3 py-0 text-[10px] cursor-pointer disabled:opacity-60"
                      disabled={slackConnecting}
                    >
                      {slackConnecting ? 'Connecting…' : 'Connect'}
                    </Button>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="h-[72px] rounded-[10px] bg-[#101617] flex items-center justify-between px-4"
                  >
                    <div className="w-[18px] h-[18px] rounded-[3px] border border-[#7FA9A1]/60 [border-width:0.5px]" />
                    <Button
                      type="button"
                      onClick={openModal}
                      className="h-[27px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-3 py-0 text-[10px] cursor-pointer"
                    >
                      Connect
                    </Button>
                  </div>
                )
              ))}
            </div>
          ) : (
            // Sources view with dark accordion
            <div className="mt-6">
              <div className="rounded-[10px] bg-[#101617] text-white p-6">
                {["Product Information", "Shipping Details", "Return Policy"].map((title, idx) => (
                  <div key={title} className={idx > 0 ? "pt-5" : ""}>
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-[18px]">{title}</span>
                      <span className="text-[18px]">{expandedIndex === idx ? "˄" : "˅"}</span>
                    </button>
                    {expandedIndex === idx && (
                      <div className="mt-5 text-white/80 text-[18px] leading-[1.6]">
                        <p>
                          Our flagship product combines cutting-edge technology with sleek design. Built with premium materials,
                          it offers unparalleled performance and reliability.
                        </p>
                        <p className="mt-6">
                          Key features include advanced processing capabilities, and an intuitive user interface designed for both
                          beginners and experts.
                        </p>
                        <div className="mt-6 h-px w-full bg-white/10" />
                      </div>
                    )}
                    {idx < 2 && expandedIndex !== idx && <div className="mt-5 h-px w-full bg-white/10" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="mt-16 text-[12px] leading-[1.3em] max-w-[980px]">
            We are actively working on integrating more platforms to have better context, thank you for your patience!
          </p>
          {/* Modal overlay */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
                onClick={closeModal}
              />
              <div className="relative z-10 w-[640px] max-w-[92vw] rounded-[8px] bg-white shadow-xl border border-[#0D1717]/10">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className={`${oldStandard.className} text-[18px] leading-[1.2] text-[#0D1717]`}>
                        Add Fireflies API key
                      </h2>
                    </div>
                    <button
                      aria-label="Close"
                      className="ml-4 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-black/5 text-[#0D1717]/70 cursor-pointer"
                      onClick={closeModal}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-5">
                    <input
                      type="password"
                      placeholder="API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-[36px] w-full rounded-[6px] border border-[#0D1717]/15 bg-white px-3 text-[12px] outline-none focus:ring-2 focus:ring-[#1DC6A1]/30"
                    />
                  </div>

                  <div className="mt-5">
                    <button
                      type="button"
                      className="w-full h-[32px] rounded-[6px] bg-[#A4D6CB] text-[#0D1717] text-[12px] cursor-pointer disabled:opacity-60"
                      disabled={importing || !apiKey}
                      onClick={async () => {
                        setImporting(true);
                        setImportMessage("");
                        try {
                          const supabase = createSupabaseBrowserClient();
                          const { data: { session }, error } = await supabase.auth.getSession();
                          if (error) throw error;
                          const token = session?.access_token;
                          if (!token) throw new Error("You must be logged in");

                          const res = await fetch("/api/import-fireflies", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ apiKey }),
                          });
                          const text = await res.text();
                          const json = (() => { try { return JSON.parse(text); } catch { return { message: text }; } })();
                          if (!res.ok) throw new Error(json?.error || "Import failed");
                          setImportMessage(json?.message || "Import successful!");
                        } catch (e: any) {
                          setImportMessage(e?.message || "Import failed. Check API key.");
                        } finally {
                          setImporting(false);
                        }
                      }}
                    >
                      {importing ? "Importing..." : "Save & Import"}
                    </button>
                    {importMessage && (
                      <p className="mt-3 text-[12px] text-center text-[#0D1717]/80">{importMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Context Modal */}
          {isAddContextOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
                onClick={closeAddContext}
              />
              <div className="relative z-10 w-[720px] max-w-[92vw] rounded-[8px] bg-white shadow-xl border border-[#0D1717]/10">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className={`${oldStandard.className} text-[18px] leading-[1.2] text-[#0D1717]`}>
                        Add more context to the knowledge base
                      </h2>
                      <p className="mt-3 text-[12px] leading-[1.3em] text-[#0D1717]/80 max-w-[560px]">
                        We understand that you might want to add more data to improve the content, here's your chance to do that.
                      </p>
                    </div>
                    <button
                      aria-label="Close"
                      className="ml-4 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-black/5 text-[#0D1717]/70 cursor-pointer"
                      onClick={closeAddContext}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-5">
                    <textarea
                      placeholder="Information..."
                      className="w-full h-[200px] rounded-[6px] border border-[#0D1717]/15 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#1DC6A1]/30 resize-none"
                    />
                  </div>

                  <div className="mt-5">
                    <button
                      type="button"
                      className="w-full h-[32px] rounded-[6px] bg-[#1DC6A1] hover:bg-[#19b391] text-white text-[12px] cursor-pointer"
                      onClick={closeAddContext}
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Substack Modal */}
          {isSubstackModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
                onClick={closeSubstackModal}
              />
              <div className="relative z-10 w-[640px] max-w-[92vw] rounded-[8px] bg-white shadow-xl border border-[#0D1717]/10">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className={`${oldStandard.className} text-[18px] leading-[1.2] text-[#0D1717]`}>
                        Help us with the substacks you love!
                      </h2>
                      <p className="mt-3 text-[12px] leading-[1.3em] text-[#0D1717]/80 max-w-[560px]">
                        We are actively working on integrating more platforms to have better context, thank you for your patience!
                      </p>
                    </div>
                    <button
                      aria-label="Close"
                      className="ml-4 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-black/5 text-[#0D1717]/70 cursor-pointer"
                      onClick={closeSubstackModal}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {substackUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => handleSubstackUrlChange(index, e.target.value)}
                          placeholder="https://farza.substack.com/"
                          className="flex-1 h-[30px] rounded-[5px] border border-[#0D1717]/15 bg-[#F4F4F4] px-3 text-[12px] outline-none focus:ring-2 focus:ring-[#1DC6A1]/30"
                        />
                        <div className={`w-[30px] h-[30px] rounded-[5px] flex items-center justify-center ${
                          validatedUrls[index] ? 'bg-[#1DC6A1]' : 'bg-[#7FA9A1]'
                        }`}>
                          <svg
                            width="11"
                            height="8"
                            viewBox="0 0 11 8"
                            fill="none"
                            className="text-white"
                          >
                            <path
                              d="M1 4L3.5 6.5L9.5 1"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <button
                          type="button"
                          className="h-[30px] px-2 rounded-[5px] bg-[#F4F4F4] text-[#0D1717] text-[11px] cursor-pointer border border-[#0D1717]/10 hover:bg-[#e9e9e9]"
                          onClick={() => removeSubstackField(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-[28px] px-3 rounded-[6px] bg-[#A4D6CB] text-[#0D1717] text-[11px] cursor-pointer"
                      onClick={addSubstackField}
                    >
                      Add +
                    </button>
                    <button
                      type="button"
                      className="h-[28px] px-3 rounded-[6px] bg-[#F4F4F4] text-[#0D1717] text-[11px] cursor-pointer border border-[#0D1717]/10 hover:bg-[#e9e9e9]"
                      onClick={() => removeSubstackField()}
                    >
                      Remove Last
                    </button>
                  </div>

                  <div className="mt-5">
                    <button
                      type="button"
                      className="w-full h-[32px] rounded-[6px] bg-[#1DC6A1] text-white text-[12px] cursor-pointer disabled:opacity-60 hover:bg-[#19b391]"
                      disabled={substackImporting || validatedUrls.every(v => !v)}
                      onClick={handleImportSubstack}
                    >
                      {substackImporting ? "Importing..." : "Send & Import"}
                    </button>
                    {substackImportMessage && (
                      <p className="mt-3 text-[12px] text-center text-[#0D1717]/80">{substackImportMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}



