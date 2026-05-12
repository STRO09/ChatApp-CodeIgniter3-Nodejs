import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Using API Key:", apiKey);
  
  // Try different API versions if one fails
  const versions = ['v1', 'v1beta'];
  
  for (const ver of versions) {
    console.log(`--- Testing Version: ${ver} ---`);
    try {
      const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: ver });
      // The SDK doesn't have a direct listModels, we have to use the rest API or a hack
      // But we can try to get a model and see if it fails
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("test");
      console.log(`[${ver}] gemini-1.5-flash works!`);
    } catch (err) {
      console.log(`[${ver}] gemini-1.5-flash failed: ${err.message}`);
    }
  }
}

listModels();
