import fs from "fs";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function gerarPromptComImagem(
  image: Express.Multer.File,
  age?: string,
  volume?: string,
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

  const base64Image = imageBuffer.toString("base64");

  // Montar prompt base com ênfase em não alterar o rosto
  let promptText = `
Generate a prompt for BFL.ia to add hair within the white guideline area. 
The result must be ((extremely natural and realistic)). 
The added hair must blend ((perfectly)) with the existing color, texture, and lighting.

((The face must remain 100% identical to the original image — including all facial features, skin texture, expression, and proportions.)) 
((Absolutely no changes of any kind are allowed to the person's face.)) 
Only the hair inside the white guideline should be enhanced.

Hair color consistency is a ((critical priority)), and must follow the original hair seen in the image without introducing new tones or styles.
`;

  if (age) {
    const ageSpecs = {
      elderly:
        "The subject is elderly and the hair should have mature, age-appropriate texture and style.",
      "middle-aged":
        "The subject is middle-aged and the hair should have sophisticated, age-appropriate styling.",
      young:
        "The subject is young and the hair should have youthful, vibrant appearance.",
    };
    promptText += ` ${ageSpecs[age as keyof typeof ageSpecs]}`;
  }

  if (volume) {
    const volumeSpecs = {
      "more volume": "The hair should have increased volume and body.",
      "less volume":
        "The hair should have reduced volume and a more flat appearance.",
      natural: "The hair should have natural volume and texture.",
    };
    promptText += ` ${volumeSpecs[volume as keyof typeof volumeSpecs]}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a visual prompt engineer specialized in generating instructions for an AI that enhances hair appearance in images. You must generate a purely positive prompt using ((double parentheses)) to emphasize key features. Never use negative prompts. Hair should be added only within the white guideline on the scalp. The person's face, expression, and skin must remain completely unchanged. The added hair must match the person's existing style, direction, texture, and especially hair color as seen in the image. Avoid any clinical or medical terms. The goal is to describe visually how the image should look after enhancement.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: promptText.trim() },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.6,
    });

    const content = response.choices[0].message.content || "";

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
