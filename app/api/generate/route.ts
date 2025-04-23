import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  try {
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
    });
    const base64 = result.data[0].b64_json!;
    return NextResponse.json({ base64 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
