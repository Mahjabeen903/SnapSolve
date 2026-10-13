import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Support larger payloads for camera high-res photos
app.use(express.json({ limit: '25mb' }));

// Server-side Google GenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to call Gemini with retry on transient spikes (e.g. 503 or 429)
async function generateContentWithRetry(params: any, maxRetries = 2) {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const isTransient =
        err?.status === 'UNAVAILABLE' ||
        err?.code === 503 ||
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('demand');
      if (attempt <= maxRetries && isTransient) {
        console.warn(`Transient Gemini API error (attempt ${attempt}), retrying in 1.5s...`);
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }
      throw err;
    }
  }
}

// Endpoint 1: Extract Math Problem from Image
app.post('/api/extract-problem', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        readable: false,
        errorMessage: 'No image provided. Please upload or take a photo of a math problem.',
      });
    }

    // Clean base64 string if it contains data URI header
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const promptText = `
You are the OCR and math extraction engine for "SnapSolve", an intelligent math tutor.
Analyze this photo of a math problem (handwritten or printed).

Carefully determine if there is a legible math problem in the photo:
1. If the photo is completely blurred, unintelligible, cut off, too dark, or does not contain any recognizable math problem, return readable=false with a friendly, supportive error message suggesting how to retake a clear photo.
2. If there IS a discernible math problem, return readable=true, and transcribe the entire problem text faithfully.
- Format all math equations and formulas using standard LaTeX notation ($...$ for inline or $$...$$ for standalone formulas).
- Do not skip details, exponents, subscripts, limits, or specific variables.
- If there are multiple sub-questions or numbers (like (a), (b) or problem 1), extract the primary or highlighted one, or all clearly visible parts.
- Provide a concise topic hint (e.g., "Calculus: Definite Integral", "Algebra: System of Equations", "Trigonometry: Identity Verification").
`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: promptText }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readable: {
              type: Type.BOOLEAN,
              description: 'Whether a readable math problem was found',
            },
            errorMessage: {
              type: Type.STRING,
              description: 'Friendly error message if unreadable',
            },
            extractedProblem: {
              type: Type.STRING,
              description: 'The extracted math problem with LaTeX notation',
            },
            topicHint: {
              type: Type.STRING,
              description: 'Detected mathematical topic or branch',
            },
          },
          required: ['readable'],
        },
      },
    });

    const rawText = response.text || '{}';
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        readable: false,
        errorMessage: "We had trouble parsing the image. Please try taking a clearer, well-lit photo.",
      };
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/extract-problem:', error);
    return res.status(500).json({
      readable: false,
      errorMessage: error?.message || 'Failed to analyze the photo. Please check your photo and try again.',
    });
  }
});

// Endpoint 2: Solve Problem with Step-by-Step LaTeX & Practice Problems
app.post('/api/solve-problem', async (req: Request, res: Response) => {
  try {
    const { problemText, level = 'High School', hintOnly = false } = req.body;

    if (!problemText || typeof problemText !== 'string' || !problemText.trim()) {
      return res.status(400).json({ error: 'Math problem text is required.' });
    }

    const systemPrompt = `
You are SnapSolve, a world-class math tutor that provides clear, pedagogical solutions.
Target Audience Level: ${level}
- High School: Emphasize fundamental algebraic steps, state identities clearly, avoid unexplained leaps.
- Undergraduate: Rigorous, referencing standard calculus/linear algebra/differential equations theorems.
- Advanced: Deep mathematical precision, optimal techniques, elegant proofs.

Mode: ${hintOnly ? 'HINT ONLY MODE: Provide ONLY the first step (the key first move/hint to get unstuck) in the steps array, but still provide the key idea and practice problems.' : 'FULL STEP-BY-STEP SOLUTION: Provide all sequential steps leading to the final answer.'}

Guidelines:
1. Steps: Each step MUST have:
   - "stepNumber": integer starting from 1
   - "title": concise action (e.g., "Choose u and dv for integration by parts", "Complete the square", "Find eigenvalues")
   - "latex": clean, valid LaTeX representing the mathematical transformation for this step (e.g. "\\int x e^x dx = x e^x - \\int e^x dx")
   - "explanation": 1-2 sentence explanation of WHY this step works and why we do it.
2. "keyIdea": Exactly 2 to 3 sentences explaining the overarching concept and intuition behind this type of problem.
3. "finalAnswer": The clean final answer in LaTeX (e.g., "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}").
4. "practiceProblems": Exactly 3 similar practice problems with increasing difficulty:
   - Problem 1: Easy / warm-up (same core principle with simpler numbers/terms)
   - Problem 2: Medium (standard exam-level variation)
   - Problem 3: Hard (requires deeper insight, multiple steps, or clever substitution)
   For each practice problem, include problem prompt, problemLatex, the final answer in LaTeX, and a short solution explanation.
`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash',
      contents: `Solve this math problem:
"""
${problemText}
"""
`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problemTitle: {
              type: Type.STRING,
              description: 'Short title of the problem',
            },
            keyIdea: {
              type: Type.STRING,
              description: '2 to 3 sentences explaining the core concept/intuition',
            },
            steps: {
              type: Type.ARRAY,
              description: 'Step-by-step solution steps',
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  latex: { type: Type.STRING, description: 'LaTeX mathematical expression' },
                  explanation: { type: Type.STRING, description: 'Short explanation of why it works' },
                },
                required: ['stepNumber', 'title', 'latex', 'explanation'],
              },
            },
            finalAnswer: {
              type: Type.STRING,
              description: 'Final simplified answer in LaTeX format',
            },
            practiceProblems: {
              type: Type.ARRAY,
              description: '3 similar practice problems with increasing difficulty',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "'Easy', 'Medium', or 'Hard'" },
                  description: { type: Type.STRING, description: 'Word statement or prompt' },
                  problemLatex: { type: Type.STRING, description: 'LaTeX formula for the practice problem' },
                  answer: { type: Type.STRING, description: 'LaTeX final answer' },
                  explanation: { type: Type.STRING, description: 'Explanation and steps for answer' },
                },
                required: ['id', 'difficulty', 'description', 'problemLatex', 'answer', 'explanation'],
              },
            },
          },
          required: ['problemTitle', 'keyIdea', 'steps', 'finalAnswer', 'practiceProblems'],
        },
      },
    });

    const rawText = response.text || '{}';
    const solutionData = JSON.parse(rawText);
    return res.json(solutionData);
  } catch (error: any) {
    console.error('Error in /api/solve-problem:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to solve problem. Please check the equation and try again.',
    });
  }
});

// Development vs Production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`SnapSolve server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
