import fs from "fs";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function gerarPromptComImagem(
  image: Express.Multer.File,
  age?: string,
  volume?: string,
  prompt?: string,
  retryCount = 0,
  maxRetries = 3
): Promise<string> {
  let imageBuffer: Buffer;

  if (image.buffer) {
    imageBuffer = image.buffer;
  } else if (image.path) {
    if (!fs.existsSync(image.path)) {
      throw new Error(`Arquivo não encontrado no caminho: ${image.path}`);
    }
    imageBuffer = fs.readFileSync(image.path);
  } else {
    throw new Error("Arquivo não possui buffer nem path definidos");
  }

  const ageSpecs: Record<string, string> = {
    elderly:
      "The subject is elderly and the hair should have mature, age-appropriate texture and style.",
    "middle-aged":
      "The subject is middle-aged and the hair should have sophisticated, age-appropriate styling.",
    young:
      "The subject is young and the hair should have youthful, vibrant appearance.",
  };

  const volumeSpecs: Record<string, string> = {
    "more volume": "The hair should have increased volume and body.",
    "less volume":
      "The hair should have reduced volume and a more flat appearance.",
    natural: "The hair should have natural volume and texture.",
  };

  const specs = [age && ageSpecs[age], volume && volumeSpecs[volume]]
    .filter(Boolean)
    .join(" ");

  const promptText = `${prompt} ${specs}`;

  try {
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are a visual prompt engineer specialized in generating a single, precise prompt for a hair enhancement AI. Use ((double parentheses)) around important instructions. Ensure bald areas are completely filled in. Never return multiple prompt options. Never modify the face in any way. Always follow the white guideline if present.",
    //     },
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text: promptText },
    //         {
    //           type: "image_url",
    //           image_url: {
    //             url: `data:image/png;base64,${base64Image}`,
    //           },
    //         },
    //       ],
    //     },
    //   ],
    //   temperature: 0.6,
    // });

    const content = promptText || "";

    if (content.includes("I'm sorry") && retryCount < maxRetries) {
      console.warn(
        `⚠️ Tentativa ${retryCount + 1} falhou. Tentando novamente...`
      );
      return gerarPromptComImagem(
        image,
        age,
        volume,
        retryCount + 1,
        maxRetries
      );
    }

    if (content.includes("I'm sorry")) {
      throw new Error(
        "A IA recusou a solicitação mesmo após várias tentativas."
      );
    }

    console.log("✅ Prompt gerado:\n", content);
    return content;
  } catch (error) {
    console.error("❌ Erro ao gerar prompt:", error);
    throw error;
  }
}
