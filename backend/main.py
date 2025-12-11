import os
import time
import json
import requests
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google import genai
from google.genai import types

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'storageBucket': 'YOUR_STORAGE_BUCKET_NAME.appspot.com' 
})

db = firestore.client()
bucket = storage.bucket()

# Initialize Gemini
# Assumes GOOGLE_API_KEY is set in environment variables
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def generate_resume_latex(job_description, master_resume_content):
    """
    Uses Gemini to tailor the resume LaTeX based on the job description.
    """
    prompt = f"""
    You are an expert resume writer. I have a master resume written in LaTeX and a job description.
    Your task is to rewrite the resume content to better match the job description, while keeping the LaTeX structure valid.
    
    JOB DESCRIPTION:
    {job_description}
    
    MASTER RESUME (LaTeX):
    {master_resume_content}
    
    INSTRUCTIONS:
    1. tailored based on the job description.
    2. ONLY return the valid LaTeX code. Do not include markdown formatting like ```latex ... ```.
    3. Ensure the LaTeX compiles. Do not change packages or essential structure unless necessary.
    """
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt]
    )
    
    return response.text.strip()

def compile_latex_to_pdf(latex_code):
    """
    Sends LaTeX code to latexonline.cc to generate a PDF.
    """
    url = "https://latexonline.cc/compile?text=" + requests.utils.quote(latex_code)
    response = requests.get(url) 
    
    if response.status_code == 200:
        return response.content
    else:
        raise Exception(f"LaTeX compilation failed: {response.text}")

def upload_to_firebase(pdf_bytes, filename):
    """
    Uploads PDF bytes to Firebase Storage and returns the public URL.
    """
    blob = bucket.blob(filename)
    blob.upload_from_string(pdf_bytes, content_type='application/pdf')
    blob.make_public()
    return blob.public_url

def process_job(doc_snapshot, changes, read_time):
    for change in changes:
        if change.type.name == 'ADDED':
            doc = change.document
            data = doc.to_dict()
            
            if data.get('status') == 'Pending':
                print(f"New job found: {doc.id}")
                
                try:
                    # 1. Read Master Resume
                    with open('master_resume.tex', 'r') as f:
                        master_resume = f.read()
                    
                    # 2. Generate Tailored LaTeX
                    print("Generating tailored resume with Gemini...")
                    tailored_latex = generate_resume_latex(data.get('description'), master_resume)
                    
                    # 3. Compile PDF
                    print("Compiling PDF...")
                    pdf_bytes = compile_latex_to_pdf(tailored_latex)
                    
                    # 4. Upload to Storage
                    print("Uploading to Storage...")
                    filename = f"resumes/{doc.id}.pdf"
                    public_url = upload_to_firebase(pdf_bytes, filename)
                    
                    # 5. Update Firestore
                    db.collection('job_queue').document(doc.id).update({
                        'status': 'Done',
                        'pdfUrl': public_url,
                        'completedAt': firestore.FieldValue.serverTimestamp()
                    })
                    print(f"Job {doc.id} completed successfully. URL: {public_url}")
                    
                except Exception as e:
                    print(f"Error processing job {doc.id}: {e}")
                    db.collection('job_queue').document(doc.id).update({
                        'status': 'Error',
                        'error': str(e)
                    })

def main():
    print("Starting Resume AI Worker...")
    
    # Create the job_queue collection if it doesn't exist (it will require at least one doc strictly speaking, 
    # but the listener works on the collection reference)
    col_query = db.collection('job_queue').where('status', '==', 'Pending')
    
    # Watch the collection query
    col_query.on_snapshot(process_job)
    
    print("Listening for new jobs. Press Ctrl+C to stop.")
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
