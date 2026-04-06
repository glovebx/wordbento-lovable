
import { getLlmConfig } from '../../utils/security';
import { jsonrepair } from 'jsonrepair';
import { cleanAiJsonResponse } from '../../utils/languageParser.js';

export const extractWordsByAi = async (c, userId, analysisData, hasFreeQuota) => {
  console.log(`Calling AI for source2: ${analysisData.sourceType}`);

  let candidates = false;

  let llm = await getLlmConfig(c, 'gemini', userId, hasFreeQuota);

  if (llm[1]) {
    candidates = await extractWordsByPlaformAi(c, llm, analysisData);
  }
  if (!candidates || candidates.length === 0) {
    llm = await getLlmConfig(c, 'deepseek', userId, hasFreeQuota);
    if (llm[1]) {
      candidates = await extractWordsByPlaformAi(c, llm, analysisData);
    }
  }

  return candidates;
}

const extractWordsByPlaformAi = async (c, llm, analysisData) => {
  console.log(`Calling ${llm[0]} AI for source2: ${analysisData.sourceType}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:
  
  let AI_API_ENDPOINT = llm[1]
  let AI_API_KEY = llm[2]
  let AI_API_MODEL = llm[3]

  try {
    const prompt = analysisData.sourceType === 'article' ? `
我给你一篇文章，请从中将${analysisData.examType}等级的单词筛选出来，最多300个，请仅以json格式的数组返回，不要包含任何其他文本或解释。
文章如下：${analysisData.content}
              ` : `我给你一个url，请访问阅读其中的正文，从中将${analysisData.examType}等级的单词筛选出来，最多300个，请仅以json格式的数组返回，不要包含任何其他文本或解释。
URL如下：${analysisData.content}`;


      const jsonData = {
        model: AI_API_MODEL,
        messages:[
          {role: 'system', content: 'You are a helpful assistant.'},
          {role: 'user', content: prompt},
        ]};

      console.log(jsonData);  

      const response = await fetch(AI_API_ENDPOINT, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${AI_API_KEY}`
          },
          body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
          console.error(`${llm[0]} AI API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

      const data = await response.json(); // No type assertion needed in JS
      // console.log(data);

      // 2. Check if the 'choices' array exists and is not empty
      if (!data.choices || data.choices.length === 0) {
        console.error(`${llm[0]} API call failed: Response does not contain any choices.`);
        // Handle this case
        // You might want to log the full response here to debug what was received
        console.log("Full response:", data);
        return null; // Or throw an error
      }

      // 3. Check if the first choice contains a message
      if (!data.choices[0].message) {
          console.error(`${llm[0]} API call failed: The first choice does not contain a message.`);
           // Handle this case
           console.log("Full response:", data);
          return null; // Or throw an error
      }

      // If all checks pass, access and log the message content
      const messageContent = data.choices[0].message.content;
      console.log("API call successful. Received message:");
      console.log(`messageContent: ${messageContent}`);

      const jsonStr = cleanAiJsonResponse(messageContent)

      if (jsonStr) {
        const repairedStr = jsonrepair(jsonStr.toLowerCase())
        console.log(`repairedStr: ${repairedStr}`);

        const jsonWords = JSON.parse(repairedStr);

        // Validate the structure of the received data if necessary
        return jsonWords;
      }

      return [];
  } catch (error) {
      console.error(`Network error calling ${llm[0]} AI API:`, error);
      return null;
  }
};
