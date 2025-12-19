/**
 * CloudConvertService - Encapsulates PDF generation via CloudConvert
 */

const CloudConvert = require("cloudconvert");

class CloudConvertService {
    constructor(apiKey) {
        this.cloudConvert = new CloudConvert(apiKey);
    }

    /**
     * Convert LaTeX content to PDF
     * @param {string} latexContent - Raw LaTeX content
     * @returns {Promise<string>} - URL to download the generated PDF
     */
    async convertLatexToPdf(latexContent) {
        const job = await this.cloudConvert.jobs.create({
            tasks: {
                "import-raw": {
                    operation: "import/raw",
                    file: latexContent,
                    filename: "resume.tex"
                },
                "convert-pdf": {
                    operation: "convert",
                    input: "import-raw",
                    output_format: "pdf",
                    input_format: "tex"
                },
                "export-url": {
                    operation: "export/url",
                    input: "convert-pdf"
                }
            }
        });

        const finishedJob = await this.cloudConvert.jobs.wait(job.id);

        if (finishedJob.status === 'error') {
            const failedTask = finishedJob.tasks.find(t => t.status === 'error');
            throw new Error(`CloudConvert Error: ${failedTask ? failedTask.message : "Unknown Error"}`);
        }

        const exportTask = finishedJob.tasks.find(
            t => t.name === "export-url" && t.status === "finished"
        );

        if (!exportTask || !exportTask.result) {
            throw new Error("CloudConvert Job finished but no export URL found.");
        }

        return exportTask.result.files[0].url;
    }
}

module.exports = CloudConvertService;
