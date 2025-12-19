/**
 * StorageService - Encapsulates Firebase Storage operations
 */

class StorageService {
    constructor(storage, bucketName) {
        this.bucket = storage.bucket(bucketName);
    }

    /**
     * Upload a PDF buffer to Firebase Storage
     * @param {Buffer} pdfBuffer - The PDF content as a Buffer
     * @param {string} filePath - The destination path in the bucket (e.g., "resumes/file.pdf")
     * @param {object} metadata - Optional metadata to attach
     * @returns {Promise<string>} - The storage path of the uploaded file
     */
    async uploadPdf(pdfBuffer, filePath, metadata = {}) {
        const file = this.bucket.file(filePath);
        await file.save(pdfBuffer, {
            contentType: 'application/pdf',
            metadata: { metadata }
        });
        return filePath;
    }

    /**
     * Check if a file exists in storage
     * @param {string} storagePath - The path in the bucket
     * @returns {Promise<boolean>}
     */
    async fileExists(storagePath) {
        const file = this.bucket.file(storagePath);
        const [exists] = await file.exists();
        return exists;
    }

    /**
     * Generate a short-lived signed URL for a file
     * @param {string} storagePath - The path in the bucket
     * @param {number} expiresInMinutes - How long the URL should be valid (default: 15)
     * @returns {Promise<string>} - The signed URL
     */
    async getSignedUrl(storagePath, expiresInMinutes = 15) {
        const file = this.bucket.file(storagePath);

        const [exists] = await file.exists();
        if (!exists) {
            throw new Error("File not found in storage.");
        }

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });

        return url;
    }
}

module.exports = StorageService;
