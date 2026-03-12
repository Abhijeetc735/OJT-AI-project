import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  candidate_score: number;
  matching_skills: string[];
  missing_skills: string[];
  experience_level: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  summary: string;
}

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface BatchAnalysisResult extends AnalysisResult {
  fileName: string;
}

export async function analyzeResume(
  jobDescription: string, 
  resumeText?: string, 
  fileData?: FileData
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in the environment.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an AI hiring assistant used in an enterprise recruitment platform.
    Your task is to analyze candidate resumes and rank them based on how well they match the provided job description.

    Job Description:
    ${jobDescription}

    ${resumeText ? `Resume Content (Text): ${resumeText}` : 'A resume file has been provided as part of this request.'}

    Instructions:
    1. Identify key skills, technologies, and experience from the resume.
    2. Compare them with the job description requirements.
    3. Evaluate the candidate’s experience level and relevance of projects.
    4. Detect if the resume includes important keywords required for the job.
    5. Identify missing or weak skill areas.
    6. Provide a compatibility score between 0 and 100.
    7. Explain clearly why the candidate received this score.
    8. Provide suggestions for improving the candidate’s profile.

    Return the response strictly in the following JSON format:
    {
      "candidate_score": number,
      "matching_skills": [],
      "missing_skills": [],
      "experience_level": "",
      "strengths": [],
      "weaknesses": [],
      "recommendation": "",
      "summary": ""
    }
  `;

  const parts: any[] = [{ text: prompt }];
  if (fileData) {
    parts.push(fileData);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidate_score: { type: Type.NUMBER },
            matching_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experience_level: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: [
            "candidate_score",
            "matching_skills",
            "missing_skills",
            "experience_level",
            "strengths",
            "weaknesses",
            "recommendation",
            "summary"
          ],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing resume:", error);
    throw new Error("Failed to analyze resume. Please check your API key and input.");
  }
}

export async function analyzeResumesBatch(
  jobDescription: string,
  resumes: { fileName: string; fileData: FileData }[]
): Promise<BatchAnalysisResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in the environment.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an AI hiring assistant. Your task is to analyze multiple candidate resumes and rank them based on how well they match the provided job description.
    
    Job Description:
    ${jobDescription}

    Instructions:
    1. Analyze each provided resume against the job description.
    2. For each resume, provide a compatibility score (0-100), matching skills, missing skills, experience level, strengths, weaknesses, a recommendation, and a summary.
    3. Ensure you return an analysis for EVERY resume provided.
    4. Match the "fileName" in the output to the corresponding resume.

    Return the response strictly as an array of objects in the following JSON format:
    [
      {
        "fileName": "string",
        "candidate_score": number,
        "matching_skills": [],
        "missing_skills": [],
        "experience_level": "",
        "strengths": [],
        "weaknesses": [],
        "recommendation": "",
        "summary": ""
      }
    ]
  `;

  const parts: any[] = [{ text: prompt }];
  resumes.forEach((r, index) => {
    parts.push({ text: `--- Resume ${index + 1}: ${r.fileName} ---` });
    parts.push(r.fileData);
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fileName: { type: Type.STRING },
              candidate_score: { type: Type.NUMBER },
              matching_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              experience_level: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: [
              "fileName",
              "candidate_score",
              "matching_skills",
              "missing_skills",
              "experience_level",
              "strengths",
              "weaknesses",
              "recommendation",
              "summary"
            ],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result as BatchAnalysisResult[];
  } catch (error) {
    console.error("Error in batch analysis:", error);
    throw new Error("Failed to perform batch analysis.");
  }
}
