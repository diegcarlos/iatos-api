import fs from "fs";
import path from "path";

const createUpdateBfl = async (prompt: string) => {
  try {
    const filePath = path.join(__dirname, "..", "..", "bfl-prompt.txt");
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, prompt);
    } else {
      fs.writeFileSync(filePath, prompt);
    }
  } catch (error) {
    console.log(error);
  }
};

const getPromptBfl = async () => {
  const filePath = path.join(__dirname, "..", "..", "bfl-prompt.txt");
  const prompt = fs.readFileSync(filePath, "utf8");
  return prompt;
};

export { createUpdateBfl, getPromptBfl };
