import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing API Key:", apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Say hello");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (err) {
    console.error("Failure:", err.message);
  }
}

testKey();
