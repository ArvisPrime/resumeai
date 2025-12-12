import os
import time
import json
import requests
import firebase_admin
import cloudconvert
from firebase_admin import credentials, firestore, storage
from google import genai
from google.genai import types

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
# Ensure this bucket matches your actual firebase storage bucket
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'resumeai-6b02f.firebasestorage.app' 
    })

db = firestore.client()
bucket = storage.bucket()

# Initialize Gemini
# Assumes GOOGLE_API_KEY is set
gemini_client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

# Initialize CloudConvert
# Assumes CLOUDCONVERT_API_KEY is set
cloudconvert.configure(api_key=os.environ.get("CLOUDCONVERT_API_KEY"))

def generate_resume_latex(job_description, master_resume_content):
    """
    Uses Gemini to tailor the resume LaTeX based on the job description.
    """
    prompt = f"""
You are an expert Technical Resume Strategist and a LaTeX Syntax Specialist. You are part of an automated pipeline.

INPUT DATA:
1. TARGET ROLE:
{job_description}

2. LATEX TEMPLATE:
{master_resume_content}

YOUR MISSION:
Tailor the resume content to align with the Target Role while maintaining 100% syntactically correct LaTeX structure.

STRICT OUTPUT RULES (CRITICAL):
1. RETURN RAW LATEX ONLY. Do not use Markdown code blocks (```latex). Do not include conversational filler (e.g., "Here is the code").
2. Start the response immediately with \\documentclass.
3. End the response immediately with \\end{{document}}.

CONTENT OPTIMIZATION RULES:
1. KEYWORD MATCHING: Analyze the Job Description for required skills. Pivot existing bullet points to use this exact terminology.
2. LATEX INTEGRITY: You must escape special LaTeX characters (%, $, &, #).
"""
    
    # Using 'gemini-2.0-flash-exp' as requested/latest available
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=[prompt]
    )
    
    cleaned_text = response.text.strip()
    # Remove markdown code blocks if present
    if cleaned_text.startswith("```latex"):
        cleaned_text = cleaned_text[8:]
    if cleaned_text.startswith("```"):
        cleaned_text = cleaned_text[3:]
    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-3]
        
    print(f"Gemini Output Preview: {cleaned_text[:100]}...")
    return cleaned_text.strip()

def compile_latex_to_pdf(latex_code):
    """
    Uses CloudConvert to compile LaTeX to PDF.
    """
    print("Initiating CloudConvert job...")
    
    # 1. Create a Job with tasks
    # We define a pipeline: import-string -> convert -> export-url
    job = cloudconvert.Job.create(payload={
        "tasks": {
            "import-my-file": {
                "operation": "import/raw",
                "file": latex_code,
                "filename": "resume.tex"
            },
            "convert-my-file": {
                "operation": "convert",
                "input": "import-my-file",
                "output_format": "pdf",
                "input_format": "tex" 
            },
            "export-my-file": {
                "operation": "export/url",
                "input": "convert-my-file"
            }
        }
    })
    
    job_id = job['id']
    print(f"CloudConvert Job Created: {job_id}")
    
    # 2. Wait for completion
    job = cloudconvert.Job.wait(id=job_id)
    
    # 3. Check status
    export_task = None
    for task in job['tasks']:
        if task['name'] == 'export-my-file':
            export_task = task
            break
            
    if export_task and export_task['status'] == 'finished':
        file_url = export_task['result']['files'][0]['url']
        print(f"PDF Generated at CloudConvert: {file_url}")
        
        # Download the file content
        pdf_response = requests.get(file_url)
        return pdf_response.content
    else:
        # Try to find error message
        error_msg = "Unknown Error"
        for task in job['tasks']:
            if task['status'] == 'error':
                error_msg = task.get('message', 'Unknown task error')
        raise Exception(f"CloudConvert failed: {error_msg}")

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
                    
                    # 3. Compile PDF (CloudConvert)
                    print("Compiling PDF via CloudConvert...")
                    pdf_bytes = compile_latex_to_pdf(tailored_latex)
                    
                    # 4. Upload to Storage
                    print("Uploading to Firebase Storage...")
                    filename = f"resumes/{doc.id}.pdf"
                    public_url = upload_to_firebase(pdf_bytes, filename)
                    
                    # 5. Update Firestore
                    db.collection('job_queue').document(doc.id).update({
                        'status': 'Done',
                        'pdfUrl': public_url,
                        'completedAt': firestore.SERVER_TIMESTAMP
                    })
                    print(f"Job {doc.id} completed successfully. URL: {public_url}")
                    
                except Exception as e:
                    print(f"Error processing job {doc.id}: {e}")
                    db.collection('job_queue').document(doc.id).update({
                        'status': 'Error',
                        'error': str(e)
                    })

def main():
    print("Starting Resume AI Worker (CloudConvert Edition)...")
    
    if not os.environ.get("CLOUDCONVERT_API_KEY"):
        print("ERROR: CLOUDCONVERT_API_KEY environment variable is missing.")
        return

    # Watch the collection query
    col_query = db.collection('job_queue').where('status', '==', 'Pending')
    col_query.on_snapshot(process_job)
    
    print("Listening for new jobs. Press Ctrl+C to stop.")
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
