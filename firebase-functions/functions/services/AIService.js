/**
 * AIService - Encapsulates all Gemini AI interactions
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    /**
     * @param {string} apiKey - Gemini API key
     * @param {string} modelName - Model name (e.g., "gemini-3-flash-preview")
     * @param {string} apiVersion - API version (e.g., "v1beta")
     */
    constructor(apiKey, modelName = "gemini-3-flash-preview", apiVersion = "v1beta") {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel(
            { model: modelName },
            { apiVersion }
        );
        this.modelName = modelName;
    }

    /**
     * Analyze resume against job description for ATS scoring
     * @param {string} resume - The master resume content
     * @param {string} jobDescription - The job description text
     * @returns {Promise<{score: number, missing_keywords: string[], company_name: string, job_title: string}>}
     */
    async analyzeATS(resume, jobDescription) {
        const prompt = `
            Analyze this Resume vs Job Description.
            
            RESUME:
            ${resume}
            
            JOB:
            ${jobDescription}
            
            Return JSON ONLY:
            {
                "score": <0-100 integer>,
                "missing_keywords": ["keyword1", "keyword2"],
                "company_name": "Exact Company Name from Job Description",
                "job_title": "Exact Job Title"
            }
        `;

        const result = await this.model.generateContent(prompt);
        const text = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(text);
    }

    /**
     * Tailor resume for a specific job description
     * @param {string} resume - The master resume content (LaTeX)
     * @param {string} jobDescription - The job description text
     * @returns {Promise<string>} - Tailored LaTeX content
     */
    async tailorResume(resume, jobDescription) {
        const prompt = `
            Role: Resume Expert & LaTeX Specialist.
            Task: Tailor this resume for the job description.
            Constraint: Return RAW LATEX code only. Start with \\\\documentclass.
            
            RESUME:
            ${resume}
            
            JOB:
            ${jobDescription}
        `;

        const result = await this.model.generateContent(prompt);
        return result.response.text()
            .replace(/```latex/g, "")
            .replace(/```/g, "")
            .trim();
    }
}

module.exports = AIService;
