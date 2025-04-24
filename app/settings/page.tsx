"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("OPENAI_API_KEY") || "";
    setApiKey(stored);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("OPENAI_API_KEY", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="container mx-auto p-6">
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", className: "mb-4 pl-2" })}
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-2xl font-semibold my-4 ml-7">Settings</h1>
      <Card className="p-4 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col mb-2 p-4">
            OpenAI API Key
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>
          <Button type="submit">Save</Button>
          {saved && <p className="text-green-500">API Key saved!</p>}
        </form>
      </Card>
      {saved && (
        <div className="mt-4 max-w-3xl mx-auto p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            Key ends with: ****{apiKey.slice(-4)}
          </p>
        </div>
      )}
    </main>
  );
}
