"use client";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, UploadCloud } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  return (
    <main className="container grid min-h-screen place-content-center gap-8">
      <div className="flex justify-center ">
        <Image 
          src="/assets/hyp-logo.png" 
          alt="Hyp Logo" 
          width={160} 
          height={160} 
          className="object-contain"
        />
      </div>
      <h1 className="text-3xl font-bold text-center mb-6">Product Image Generator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Card onClick={() => router.push("/generate/prompt")}
          className="flex flex-col items-center justify-center gap-4 text-center cursor-pointer p-4">
          <ImageIcon className="w-10 h-10" />
          <span>Generate via Prompt</span>
        </Card>
        <Card onClick={() => router.push("/generate/image")}
          className="flex flex-col items-center justify-center gap-4 text-center cursor-pointer p-4">
          <UploadCloud className="w-10 h-10" />
          <span>Generate via Image Upload</span>
        </Card>
      </div>
    </main>
  );
}
