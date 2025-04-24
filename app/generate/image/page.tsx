"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronLeft, Check, Copy, UploadCloud, X } from "lucide-react"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { getOpenAI } from "@/lib/openai";
import { calculateCost } from "@/lib/costUtils"; // Import cost calculation utility
import Image from "next/image";
import { useDropzone } from 'react-dropzone';
import type { Image as OpenAIImage } from "openai/resources/images.mjs"; // Import the specific Image type
import type { UsageDetails } from "@/lib/costUtils"; // Import UsageDetails type
import { useToast } from "@/components/ui/toast-provider";

// Define the expected API response structure including usage
interface ApiResponseWithUsage {
  created: number;
  data: OpenAIImage[];
  usage?: UsageDetails; // Make usage optional as it might not always be present
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

export default function ImagePage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>(""); 
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<File | null>(null); 
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [uploaded, setUploaded] = useState(false); 
  const [uploadUrl, setUploadUrl] = useState<string | null>(null); 
  const [copySuccess, setCopySuccess] = useState(false); 
  const [apiResponse, setApiResponse] = useState<ApiResponseWithUsage | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [cost, setCost] = useState<number | null>(null); // Add state for cost
  const timerRef = useRef<NodeJS.Timeout | null>(null); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  useEffect(() => {
    if (loading) {
      setElapsedTime(0); 
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length) {
      const newFiles = acceptedFiles.slice(0, 3); 
      setFiles(newFiles);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews(newPreviews);
    }
  }, [previews]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp'] 
    },
    maxFiles: 3,
    multiple: true
  });

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setPreviews(prevPreviews => {
      const newPreviews = prevPreviews.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prevPreviews[indexToRemove]);
      return newPreviews;
    });
  };

  const generateFromImages = async () => {
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
    if (files.length === 0) return; 
    setLoading(true);
    setImageUrl(null); 
    setGeneratedFile(null);
    setApiResponse(null);
    setUploaded(false); 
    setUploadUrl(null);
    setCopySuccess(false);
    setCost(null); // Reset cost on new generation
    setError(null);

    try {
      // Combine custom prompt with selected style
      const fullPrompt = (selectedStyle && selectedStyle !== 'none') ? `${prompt}, make it in a ${selectedStyle} style` : prompt;

      const result: ApiResponseWithUsage = await (openai.images.edit as any)({
        model: "gpt-image-1", 
        image: files[0], 
        prompt: fullPrompt,
        quality: "medium",
        size: "1024x1024", 
      }) as ApiResponseWithUsage; // Cast response to include usage

      setApiResponse(result); 

      if (result.data && result.data[0].b64_json) {
        const base64 = result.data[0].b64_json;
        const blob = base64ToBlob(base64, 'image/png');
        const file = new File([blob], `generated_image_${Date.now()}.png`, { type: 'image/png' });
        setGeneratedFile(file); 
        setImageUrl(URL.createObjectURL(file)); 

        // Calculate and set cost if usage data is available
        if (result.usage) {
          const calculated = calculateCost(result.usage);
          setCost(calculated);
        } else {
          console.warn("Usage data not found in API response, cannot calculate cost.");
        }
      } else {
        throw new Error('No image data received from OpenAI');
      }

    } catch (error: any) {
      console.error('Error generating image:', error);
      setError(error.message || 'An unexpected error occurred');
      setApiResponse(null); // <-- Set to null on error
    } finally {
      setLoading(false);
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      } 
    }
  };

  const handleDownload = () => {
    if (!generatedFile || !imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = generatedFile.name; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!generatedFile) return;
    setUploading(true);
    setUploaded(false);
    setUploadUrl(null);
    setCopySuccess(false);
    const formData = new FormData();
    formData.append('file', generatedFile);

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
      if (result.data.file_url) { 
        setUploadUrl(result.data.file_url); 
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

  return (
    <div className="container py-10 max-w-7xl mx-auto space-y-6 mb-20"> 
      {/* Add Back Button */} 
      <Link 
        href="/"
        className={buttonVariants({ variant: "ghost", className: "mb-4 pl-2" })}
      >
         <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
      </Link>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center">Generate via Image Upload</CardTitle>
          <CardDescription className="text-center">Upload an image and add a prompt to generate a new image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Updated Image Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload Images (Up to 3)</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer flex flex-col items-center justify-center min-h-[200px] ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input {...getInputProps()} id="file-upload" />
              {previews.length === 0 ? (
                <>
                  <UploadCloud className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  {isDragActive ? (
                    <p>Drop the images here ...</p>
                  ) : (
                    <p>Upload</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WEBP supported</p>
                </>
              ) : (
                // Display previews inside the dropzone
                <div className="grid grid-cols-3 gap-3 w-full">
                  {previews.map((src, index) => (
                    <div key={index} className="relative w-full h-48 border rounded overflow-hidden group">
                      <Image
                        src={src}
                        alt={`Preview ${index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                      <button
                        type="button" // Prevent form submission if inside a form
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropzone activation
                          removeFile(index);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {/* Optionally show upload text if less than max files */} 
                  {files.length < 3 && (
                     <div className="flex flex-col items-center justify-center text-xs text-gray-500 border border-dashed border-gray-300 rounded h-48 p-2 hover:bg-gray-50">
                       <UploadCloud className="h-6 w-6 mb-1 text-gray-400" />
                       Add more or <br/> click to replace
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Style Selector */}
          <div className="lg:space-x-6 flex flex-col lg:flex-row gap-6 lg:gap-0">

            <div className="space-y-2 max-w-2xl w-full">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                className="min-h-20 resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt describing the output..."
                spellCheck={false}
                />
            </div>

            <div className="space-y-2 w-full max-w-sm flex flex-col justify-center lg:mt-4">
              <Label htmlFor="style-select">Select Style </Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger id="style-select" className="w-full">
                  <SelectValue placeholder="Choose a style..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Photorealistic">Realistic</SelectItem>
                  <SelectItem value="Animated">Animated</SelectItem>
                  <SelectItem value="Studio HD">Studio HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            disabled={loading || files.length === 0 || uploading} 
            className="w-full" 
            onClick={generateFromImages}
          >
            {loading ? `Generating... (${elapsedTime}s)` : 'Generate'} 
          </Button>
        </CardFooter>
      </Card>

      {loading && (
        <Card>
          <CardHeader>
            <CardTitle>Generating Image...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <Skeleton className="h-[512px] w-[512px] rounded-md" />
          </CardContent>
        </Card>
      )}

      {imageUrl && generatedFile && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={imageUrl} alt="Generated" className="w-full rounded object-contain max-h-[512px] mx-auto block" />
          </CardContent>
          <CardFooter className="flex space-y-2 justify-between"> 
              {cost !== null && (
                <div className="text-center p-4 border border-gray-300 rounded-lg shadow-sm bg-white ">
                  <p className="text-sm text-gray-600 mb-1">Estimated Cost</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${cost.toFixed(3)} {/* Display cost with 6 decimal places */}
                  </p>
                </div>
              )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button onClick={handleUpload} disabled={uploading || uploaded}>
                {uploading ? 'Uploading...' : (uploaded ? <Check className="h-4 w-4" /> : 'Upload Image')}
              </Button>
            </div>
            {uploaded && uploadUrl && (
              <Button 
                variant="secondary" 
                onClick={() => copyToClipboard(uploadUrl)}
                className="justify-center"
              >
                <Copy className="mr-2 h-4 w-4" /> 
                {copySuccess ? 'Copied!' : 'Share Image Link'}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>OpenAI API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded-md overflow-auto text-sm max-h-[400px]">
              {JSON.stringify(apiResponse?.usage, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
