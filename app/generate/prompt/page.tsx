"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronLeft, Check, Copy, Plus, Minus, X } from "lucide-react";
import { getOpenAI } from "@/lib/openai";
import { useToast } from "@/components/ui/toast-provider";
import { calculateCost } from "@/lib/costUtils";
import type { Image as OpenAIImage } from "openai/resources/images.mjs";
import type { UsageDetails } from "@/lib/costUtils";

interface ApiResponseWithUsage {
  created: number;
  data: OpenAIImage[];
  usage?: UsageDetails;
}

interface GeneratedImage {
  url: string;
  file: File;
}

function base64ToBlob(base64: string, contentType = '', sliceSize = 512): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

export default function PromptPage() {
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponseWithUsage | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cost, setCost] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showResults = loading || generatedImages.length > 0;

  useEffect(() => {
    if (loading) {
      setElapsedTime(0);
      // Update every 100ms (0.1 seconds)
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 0.1);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  const generateImage = async () => {
    let openai;
    try {
      openai = getOpenAI();
    } catch (err: any) {
      showToast(
        err?.message || 'Unknown error',
        { variant: "error", position: "bottom-right" }
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setGeneratedImages([]);
    setApiResponse(null);
    setUploaded(false);
    setUploadUrl(null);
    setCopySuccess(false);
    setCost(null);

    try {
      const result: ApiResponseWithUsage = await (openai.images.generate as any)({
        model: "gpt-image-1",
        prompt,
        quality: quality,
        n: numberOfImages,
        size: "1024x1024",
      }) as ApiResponseWithUsage;

      setApiResponse(result);

      if (result.data && result.data.length > 0) {
        const images: GeneratedImage[] = [];
        result.data.forEach((imageData, index) => {
          if (imageData.b64_json) {
            const base64 = imageData.b64_json;
            const blob = base64ToBlob(base64, 'image/png');
            const file = new File([blob], `generated_image_${Date.now()}_${index}.png`, { type: 'image/png' });
            images.push({ url: URL.createObjectURL(file), file: file });
          }
        });
        setGeneratedImages(images);

        if (result.usage) {
          const calculated = calculateCost(result.usage);
          setCost(calculated);
        } else {
          console.warn("Usage data not found in API response, cannot calculate cost.");
        }
      } else {
        throw new Error('No image data received from OpenAI or data format is incorrect');
      }
    } catch (e: any) {
      console.error(e);
      setApiResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIndividual = (imageUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!generatedImages.length) return;
    setUploading(true);
    setUploaded(false);
    setUploadUrl(null);
    setCopySuccess(false);
    const formData = new FormData();
    formData.append('file', generatedImages[0].file);

    try {
      const response = await fetch('https://upload.hyperzod.dev/public-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      if (result.file_url) { 
        setUploadUrl(result.file_url); 
        setUploaded(true); 
      } else { 
        console.error('Upload response missing URL:', result); 
        throw new Error('Upload succeeded but no URL was returned.'); 
      } 
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Failed to upload image: ${error.message}`);
      setUploaded(false); 
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) {
      alert('Clipboard API not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); 
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy link');
      setCopySuccess(false);
    }
  };

  const openPreview = (url: string) => {
    setPreviewImageUrl(url);
  };

  const closePreview = () => {
    setPreviewImageUrl(null);
  };

  return (
    <div className="container py-10 max-w-7xl mx-auto space-y-6"> 
      <Link 
        href="/"
        className={buttonVariants({ variant: "ghost", className: "mb-4 pl-2" })}
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
      </Link>

      <div className={
        showResults
          ? 'flex  space-y-4 md:space-y-0 md:space-x-6'
          : 'flex flex-col min-h-[60vh] items-center justify-center'
      }>
        <div className={`${showResults ? 'flex-1 md:max-w-[50%] flex flex-col' : 'w-full max-w-2xl'}`}> 
          <Card className="w-full h-full min-h-[500px] flex flex-col"> 
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center">Generate via Prompt</CardTitle>
              <CardDescription className="text-center">Enter a text prompt to generate an image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  className="min-h-24 resize-none"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter image prompt..."
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center justify-between w-full space-x flex-col lg:flex-row">
                {/* Quantity Selector */}
                <div className="space-y-2">
                  <Label>Number of Images</Label>
                  <div className="flex items-center justify-between border rounded-md p-2 w-full">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setNumberOfImages(prev => Math.max(1, prev - 1))} 
                      disabled={numberOfImages <= 1 || loading}
                      >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-lg w-8 text-center">{numberOfImages}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setNumberOfImages(prev => Math.min(4, prev + 1))} 
                      disabled={numberOfImages >= 4 || loading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quality Selector */}
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <div className="flex items-center justify-between border rounded-md p-2 gap-2">
                    {['low', 'medium', 'high'].map((q) => (
                      <Button
                        key={q}
                        type="button"
                        variant={quality === q ? undefined : "ghost"}
                        className={quality === q ? "bg-black text-white" : ""}
                        onClick={() => setQuality(q as 'low' | 'medium' | 'high')}
                        >
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

            </CardContent>
            <CardFooter>
              <Button 
                disabled={loading || !prompt || uploading} 
                className="w-full" 
                onClick={generateImage}
              >
                {loading ? `Generating... (${elapsedTime.toFixed(1)}s)` : 'Generate'} 
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex-1 md:max-w-[50%] flex flex-col space-y-4">
          {loading && (
            <Card className="h-full min-h-[500px] flex flex-col"> 
              <CardHeader>
                <CardTitle>Generating {numberOfImages} Image{numberOfImages > 1 ? 's' : ''}...</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <div className={numberOfImages > 1 ? 'grid grid-cols-2 gap-4 p-4' : 'flex justify-center p-4'}>
                  {Array.from({ length: numberOfImages }).map((_, index) => (
                    <Skeleton key={index} className="h-[256px] w-[256px] rounded-md" /> 
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {generatedImages.length > 0 && !loading && (
            <Card className="h-full min-h-[500px] flex flex-col"> 
              <CardHeader>
                <CardTitle>Generated Image{generatedImages.length > 1 ? 's' : ''}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={generatedImages.length > 1 ? 'grid grid-cols-2 gap-4' : 'flex justify-center'}>
                  {generatedImages.map((image, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2 p-2 border rounded">
                      <img 
                        src={image.url} 
                        alt={`Generated image ${index + 1} based on prompt`} 
                        className="w-full rounded object-contain max-h-[5000px] mx-auto block cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => openPreview(image.url)} 
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2" 
                        onClick={() => handleDownloadIndividual(image.url, image.file.name)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download {index + 1}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col items-end space-y-2">
                {cost !== null && (
                  <div className="w-full mt-2 text-center p-2 border border-gray-200 rounded-md shadow-sm bg-white">
                    <p className="text-xs text-gray-500 mb-1">Estimated Cost</p>
                    <p className="text-sm font-semibold text-green-600">
                      ${cost.toFixed(6)} 
                    </p>
                  </div>
                )}
              </CardFooter>
            </Card>
          )}

          {apiResponse && !loading && ( 
            <Card>
              <CardHeader>
                <CardTitle>OpenAI API Response</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-100 p-4 rounded-md overflow-auto text-sm max-h-[400px]">
                  {JSON.stringify(apiResponse.usage, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewImageUrl && typeof window !== 'undefined' &&
        (typeof document !== 'undefined' ?
          require('react-dom').createPortal(
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
              onClick={closePreview} 
              style={{ margin: 0 }}
            >
              <div 
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()} 
              >
                <img 
                  src={previewImageUrl} 
                  alt="Preview" 
                  className="block max-w-full max-h-[90vh] object-contain rounded-md"
                />
                <button 
                  onClick={closePreview}
                  className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-1 hover:bg-opacity-75 transition-colors"
                  aria-label="Close preview"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>,
            document.body
          ) : null)
      }
    </div>
  );
}
