# SnapSolve 📐📸

SnapSolve is an intelligent math tutor that solves math problems directly from photos (handwritten or printed), renders step-by-step mathematical reasoning with KaTeX/LaTeX, highlights core intuition in a "Key Idea" box, and provides adaptive practice problems.

Powered by **Gemini 3.8 Flash** via `@google/genai` and **KaTeX**.

---

## Features

- 📸 **Photo OCR & Formula Extraction**: Upload or snap a photo of any math problem (notebooks, textbooks, quizzes).
- ✏️ **Interactive Problem Review**: Review extracted text, use quick math shortcut keys ($\sqrt{x}$, $\frac{a}{b}$, $\int$, $\sum$, $\pi$, $\theta$), and view a live KaTeX rendering before solving.
- 📝 **Step-by-Step KaTeX Solutions**: Every deduction is rendered in clean LaTeX with an explanation of *why* the step works.
- 💡 **Key Idea Box**: Summarizes the fundamental intuition in 2–3 concise sentences.
- 🎯 **Adaptive Practice**: Generates 3 similar problems of increasing difficulty (Easy, Medium, Hard) with click-to-reveal answers.
- ⚙️ **Customizable Settings**:
  - **Level Selector**: High School, Undergraduate, and Advanced.
  - **Hint Only Mode**: Shows only the first step to guide you without spoiling the answer.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, KaTeX
- **Backend**: Express (Node.js v22), `@google/genai` SDK
- **AI Model**: Gemini 3.8 Flash (`gemini-3.8-flash`)

---

## Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
cd <YOUR-REPO-NAME>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and add your Gemini API key:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```
*(Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).)*

### 4. Run the development server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 5. Build for production
```bash
npm run build
npm start
```
