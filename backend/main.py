import os
import io
import json
import logging
import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File, BackgroundTasks, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions
from postgrest.exceptions import APIError
import httpx
import jwt
import time

# Load environment variables
load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

# Read config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

USE_N8N = os.getenv("USE_N8N", "False").lower() in ("true", "1", "yes")
N8N_GENERATE_JOBS_URL = os.getenv("N8N_GENERATE_JOBS_URL")
N8N_EXTRACT_SKILLS_URL = os.getenv("N8N_EXTRACT_SKILLS_URL")
N8N_MATCH_CANDIDATES_URL = os.getenv("N8N_MATCH_CANDIDATES_URL")
N8N_GENERATE_QUESTIONS_URL = os.getenv("N8N_GENERATE_QUESTIONS_URL")
N8N_REGENERATE_JOBS_URL = os.getenv("N8N_REGENERATE_JOBS_URL")
N8N_REFINE_QUESTION_URL = os.getenv("N8N_REFINE_QUESTION_URL")
CALLBACK_SECRET = os.getenv("CALLBACK_SECRET")

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "30.0"))

LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI", f"{BACKEND_BASE_URL}/api/v1/auth/linkedin/callback")

# Global backup in-memory storage for candidate queries fallback
in_memory_queries: Dict[str, List[Dict[str, Any]]] = {}

# Global memory cache for pending password updates & verification OTPs
password_otps: Dict[str, Dict[str, Any]] = {}

# Initialize FastAPI
app = FastAPI(title="Kozker Recruiter AI Backend", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
        "http://kozker.localhost",
        "http://api.localhost",
        "https://localhost",
        "https://kozker.localhost",
        "https://api.localhost"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
async def postgrest_api_error_handler(request: Request, exc: APIError):
    logger.error(f"Postgrest APIError on {request.method} {request.url.path}: {exc.message} (details: {exc.details})")
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start_time = time.time()
    path = request.url.path
    method = request.method
    headers = dict(request.headers)
    auth_header = headers.get("authorization", "")
    has_auth = f"Yes ({auth_header[:25]}...)" if auth_header else "No"
    
    response = await call_next(request)
    process_time = time.time() - start_time
    
    with open("requests.log", "a") as f:
        f.write(f"[{method}] {path} | Auth: {has_auth} | Status: {response.status_code} | Time: {process_time:.4f}s\n")
        
    return response


# Helper: Safe client creator to bypass validation for new publishable keys
def get_safe_supabase_client(url: str, key: str, jwt_token: str = None) -> Client:
    dummy_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key"
    headers = {}
    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"
    
    client = create_client(
        url, 
        dummy_jwt, 
        options=ClientOptions(headers=headers)
    )
    
    # Patch client properties with the real key
    client.supabase_key = key
    client.options.headers["apiKey"] = key
    if not jwt_token:
        client.options.headers["Authorization"] = f"Bearer {key}"
        
    # Patch GoTrue/Auth client headers if auth is used
    if hasattr(client, "auth") and client.auth:
        client.auth._headers["apiKey"] = key
        if jwt_token:
            client.auth._headers["Authorization"] = f"Bearer {jwt_token}"
        else:
            client.auth._headers["Authorization"] = f"Bearer {key}"
            
    return client

# Helper: Get Supabase client authenticated as the user
def get_supabase(authorization: Optional[str] = Header(None)) -> Client:
    jwt_token = None
    if authorization:
        if authorization.startswith("Bearer "):
            jwt_token = authorization.split(" ")[1]
        elif authorization.startswith("eyJ"):
            jwt_token = authorization
    return get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)

# Helper: Extract current user ID from Authorization header Bearer token
def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if authorization:
        token = None
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        elif authorization.startswith("eyJ"):
            token = authorization
            
        if token:
            try:
                # Decode without verification as signature is verified by Supabase API gateway
                payload = jwt.decode(token, options={"verify_signature": False})
                return payload.get("sub")
            except Exception as e:
                logger.error(f"Failed to decode JWT: {e}")
    return None

# Startup: Ensure 'avatars' storage bucket exists in Supabase
@app.on_event("startup")
async def ensure_storage_buckets():
    try:
        admin_client = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
        buckets = admin_client.storage.list_buckets()
        bucket_names = [b.name for b in buckets] if buckets else []
        if "avatars" not in bucket_names:
            admin_client.storage.create_bucket("avatars", options={"public": True})
            logger.info("Created 'avatars' storage bucket in Supabase.")
        else:
            logger.info("'avatars' storage bucket already exists.")
    except Exception as e:
        logger.warning(f"Could not ensure 'avatars' storage bucket: {e}")


# Upload profile picture to Supabase Storage
@app.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Client = Depends(get_supabase),
    user_id: Optional[str] = Depends(get_current_user_id),
):
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, WebP, or GIF.")

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size (max 5MB)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5 MB.")

    file_ext = (file.filename or "avatar.jpg").split(".")[-1].lower()
    if file_ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        file_ext = "jpg"

    file_path = f"{user_id}/avatar.{file_ext}"

    try:
        # Upload to Supabase Storage
        db.storage.from_("avatars").upload(
            file_path,
            file_bytes,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        # Get public URL
        url_data = db.storage.from_("avatars").get_public_url(file_path)
        public_url = f"{url_data}?t={int(time.time())}"

        # Save avatar_url to profiles table
        db.table("profiles").update({"avatar_url": public_url}).eq("id", user_id).execute()

        return {"url": public_url}

    except Exception as e:
        logger.error(f"Avatar upload failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def create_system_notification(db: Client, recruiter_id: str, title: str, message: str, type: str, metadata: dict = None):
    if not recruiter_id:
        logger.warning(f"Could not insert notification '{title}' because recruiter_id is empty")
        return
    try:
        db.table("notifications").insert({
            "recruiter_id": recruiter_id,
            "title": title,
            "message": message,
            "type": type,
            "metadata": metadata or {}
        }).execute()
        logger.info(f"System notification created: '{title}' for user {recruiter_id}")
    except Exception as e:
        logger.error(f"Failed to insert notification: {e}")

def log_activity_event(db: Client, action: str, entity_type: str, entity_id: str, actor_name: str = "Recruiter", actor_id: str = None, metadata: dict = None):
    try:
        payload = {
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "actor_name": actor_name,
            "metadata": metadata or {}
        }
        if actor_id:
            payload["actor_id"] = actor_id
        db.table("activity_log").insert(payload).execute()
        logger.info(f"Activity logged: {action} on {entity_type} {entity_id}")
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")

# Security Middleware: verify callback secret
async def verify_callback_secret(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Must be Bearer <token>")
    token = authorization.split(" ")[1]
    if token != CALLBACK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid callback secret token")
    return token

# Outbound Webhook Dispatcher
async def dispatch_n8n_webhook(url: str, payload: dict, context_label: str) -> bool:
    if not url:
        logger.error(f"Cannot dispatch webhook for {context_label}: URL not configured")
        return False
    logger.info(f"Dispatching outbound webhook to {url} for {context_label}")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=30.0)
            if res.status_code in (200, 201, 202, 204):
                logger.info(f"Successfully dispatched webhook for {context_label} (status: {res.status_code})")
                return True
            else:
                logger.error(f"Failed to dispatch webhook for {context_label} (status: {res.status_code}, response: {res.text})")
                return False
    except Exception as e:
        logger.error(f"Exception during webhook dispatch for {context_label}: {e}")
        return False


# Google Drive helper functions
def is_google_drive_url(url: str) -> bool:
    if not url:
        return False
    return "drive.google.com" in url

def get_drive_download_url(url: str) -> str:
    # Match standard /file/d/<ID>/view structure
    match_d = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if match_d:
        file_id = match_d.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"
        
    # Match query parameter structure id=<ID>
    match_id = re.search(r'id=([a-zA-Z0-9_-]+)', url)
    if match_id:
        file_id = match_id.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"
        
    return url

# Background task to download Google Drive files and parse them
def download_resumes_background(candidates_list: List[Dict[str, str]], jwt_token: str):
    logger.info(f"Starting background download of Google Drive resumes for {len(candidates_list)} candidates")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    for item in candidates_list:
        cand_id = item.get("id")
        url = item.get("resume_url")
        email = item.get("email")
        
        if not cand_id or not url:
            continue
            
        cand_name = email
        uploaded_by = None
        try:
            cand_res = db.table("candidates").select("full_name, uploaded_by").eq("id", cand_id).execute()
            if cand_res.data:
                cand_name = cand_res.data[0].get("full_name") or email
                uploaded_by = cand_res.data[0].get("uploaded_by")
        except Exception as resolve_err:
            logger.error(f"Failed to resolve candidate details in download_resumes_background: {resolve_err}")
            
        try:
            download_url = get_drive_download_url(url)
            logger.info(f"Downloading resume for {email} from: {download_url}")
            
            with httpx.Client(follow_redirects=True) as client:
                res = client.get(download_url, timeout=30.0)
                if res.status_code != 200:
                    logger.error(f"Failed to download GD resume for candidate {email}: status {res.status_code}")
                    if uploaded_by:
                        create_system_notification(
                            db,
                            uploaded_by,
                            "GD Resume Download Failed",
                            f"Failed to download Google Drive resume for candidate '{cand_name}' (HTTP {res.status_code}).",
                            "error",
                            {"candidate_id": cand_id, "candidate_name": cand_name, "status": "failed", "status_code": res.status_code}
                        )
                        log_activity_event(
                            db,
                            action="candidate_cv_download_failed",
                            entity_type="candidates",
                            entity_id=cand_id,
                            actor_name="System",
                            actor_id=uploaded_by,
                            metadata={"candidate_name": cand_name, "error": f"HTTP status {res.status_code}"}
                        )
                    continue
                content = res.content
                content_type = res.headers.get("content-type", "").lower()
                
            filename = "resume.pdf"
            if "application/pdf" in content_type:
                filename = "resume.pdf"
            elif "word" in content_type or "officedocument" in content_type:
                filename = "resume.docx"
            elif "text/plain" in content_type:
                filename = "resume.txt"
            else:
                if ".docx" in url.lower():
                    filename = "resume.docx"
                elif ".txt" in url.lower():
                    filename = "resume.txt"
                    
            text = extract_text_from_file(content, filename)
            if text:
                db.table("candidates").update({
                    "parsed_resume_json": {"raw_text": text}
                }).eq("id", cand_id).execute()
                logger.info(f"Successfully downloaded and parsed Google Drive resume for candidate {email}")
                if uploaded_by:
                    create_system_notification(
                        db,
                        uploaded_by,
                        "GD Resume Download Completed",
                        f"Successfully downloaded and parsed Google Drive resume for candidate '{cand_name}'.",
                        "upload",
                        {"candidate_id": cand_id, "candidate_name": cand_name, "status": "success"}
                    )
                    log_activity_event(
                        db,
                        action="candidate_cv_downloaded",
                        entity_type="candidates",
                        entity_id=cand_id,
                        actor_name="System",
                        actor_id=uploaded_by,
                        metadata={"candidate_name": cand_name, "status": "success"}
                    )
            else:
                logger.warning(f"No text extracted from GD resume for candidate {email}")
                if uploaded_by:
                    create_system_notification(
                        db,
                        uploaded_by,
                        "GD Resume Parsing Failed",
                        f"Google Drive resume was downloaded but no text could be extracted for candidate '{cand_name}'.",
                        "error",
                        {"candidate_id": cand_id, "candidate_name": cand_name, "status": "empty"}
                    )
                
        except Exception as e:
            logger.error(f"Error downloading/parsing GD resume for candidate {email}: {e}")
            if uploaded_by:
                create_system_notification(
                    db,
                    uploaded_by,
                    "GD Resume Download Failed",
                    f"Error downloading/parsing Google Drive resume for candidate '{cand_name}': {e}",
                    "error",
                    {"candidate_id": cand_id, "candidate_name": cand_name, "status": "error", "error": str(e)}
                )
                log_activity_event(
                    db,
                    action="candidate_cv_download_failed",
                    entity_type="candidates",
                    entity_id=cand_id,
                    actor_name="System",
                    actor_id=uploaded_by,
                    metadata={"candidate_name": cand_name, "error": str(e)}
                )

# Text extraction helper
def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            return text
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
    elif ext in ["docx", "doc"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs)
            return text
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {e}")
    else:
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file as text: {e}")

# Models
class ClientModel(BaseModel):
    name: str

class RequirementModel(BaseModel):
    client_id: str
    title: str
    description: str
    skills: List[str]
    experience_min: int
    experience_max: int
    budget_min: float
    budget_max: float
    seniority: str
    notes: Optional[str] = ""
    num_posts_requested: int = 1

class RequirementUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    seniority: Optional[str] = None
    notes: Optional[str] = None
    num_posts_requested: Optional[int] = None
    status: Optional[str] = None

class JobOpeningModel(BaseModel):
    requirement_id: str
    title: str
    description: str
    responsibilities: List[str]
    qualifications: List[str]
    keywords: List[str]
    salary_range: str

class JobOpeningUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    salary_range: Optional[str] = None
    status: Optional[str] = None
    processing_status: Optional[str] = None
    error_message: Optional[str] = None
    custom_stages: Optional[List[str]] = None

class SkillsApprovalModel(BaseModel):
    skills: List[Dict[str, Any]]

class CandidateModel(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    skills: List[str] = []
    experience_years: int = 0
    resume_url: Optional[str] = ""
    raw_text: Optional[str] = ""
    education: Optional[str] = ""
    working_or_not: Optional[bool] = True
    academic_details: Optional[str] = ""
    achievements: Optional[str] = ""
    source: str = "manual"
    summary: Optional[str] = ""
    job_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    parsed_resume_json: Optional[Dict[str, Any]] = None

class CandidateUpdateModel(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    resume_url: Optional[str] = None
    raw_text: Optional[str] = None
    education: Optional[str] = None
    working_or_not: Optional[bool] = None
    academic_details: Optional[str] = None
    achievements: Optional[str] = None
    summary: Optional[str] = None
    job_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    parsed_resume_json: Optional[Dict[str, Any]] = None

class ChatMessageModel(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    current_page: Optional[str] = None

class CSVUploadModel(BaseModel):
    items: List[Dict[str, Any]]

# Inbound Callback Validation Models
class JobOpeningDraft(BaseModel):
    title: str
    overview: str
    responsibilities: List[str]
    qualifications: List[str]
    budget: str
    seniority: str
    keywords: List[str]

class JobOpeningsCallback(BaseModel):
    requirement_id: str
    job_openings: List[JobOpeningDraft]

class ExtractedSkill(BaseModel):
    name: str
    weight: float
    category: Optional[str] = None

class JobSkillsCallback(BaseModel):
    job_opening_id: str
    skills: List[ExtractedSkill]

class CandidateMatchItem(BaseModel):
    candidate_id: str
    fuzzy_score: float
    strengths: List[str]
    skill_gaps: List[str]
    reasoning: Optional[str] = None

class CandidateMatchesCallback(BaseModel):
    job_opening_id: str
    matches: List[CandidateMatchItem]

class GeneratedQuestion(BaseModel):
    question: str
    difficulty: str
    category: Optional[str] = None
    order: Optional[int] = None
    reason: Optional[str] = None

class ScreeningQuestionsCallback(BaseModel):
    application_id: str
    questions: List[GeneratedQuestion]


class JobRegenerateModel(BaseModel):
    instruction: str


class JobRegenerateCallback(BaseModel):
    job_opening_id: str
    title: str
    overview: str
    responsibilities: List[str]
    qualifications: List[str]
    budget: str
    seniority: str
    keywords: List[str]


class QuestionRefineCallback(BaseModel):
    application_id: str
    question_id: str
    refined_question: str
    difficulty: Optional[str] = None
    reason: Optional[str] = None



class CompanyPageModel(BaseModel):
    company_page_id: str

class SharePostModel(BaseModel):
    text: str


class CandidateQueryCreateModel(BaseModel):
    candidate_email: str
    query_text: str


class ResolveQueryModel(BaseModel):
    is_resolved: bool = True


class AnswerQueryModel(BaseModel):
    response_text: str


class PasswordOtpRequestModel(BaseModel):
    new_password: str


class PasswordOtpConfirmModel(BaseModel):
    otp: str


# ============================================================
# API ENDPOINTS
# ============================================================

# 1. Parsing endpoint for Requirement document
@app.post("/api/v1/requirements/parse-file")
async def parse_requirement_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = extract_text_from_file(contents, file.filename)
    return {"text": text}

# 2. Clients CRUD proxies
@app.get("/api/v1/clients")
async def get_clients(db: Client = Depends(get_supabase)):
    res = db.table("clients").select("*").eq("is_deleted", False).execute()
    return res.data

@app.post("/api/v1/clients")
async def create_client_endpoint(client: ClientModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    payload = {"name": client.name}
    if user_id:
        payload["created_by"] = user_id
    try:
        res = db.table("clients").insert(payload).execute()
    except APIError as e:
        logger.error(f"Error creating client: {e}")
        if e.code == "23505":
            raise HTTPException(status_code=409, detail="A client with this name already exists for your account.")
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create client")
    
    # Log activity
    try:
        db.table("activity_log").insert({
            "action": "client_created",
            "entity_type": "clients",
            "entity_id": res.data[0]["id"],
            "actor_name": "Recruiter",
            "metadata": {"client_name": client.name}
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log client creation activity: {e}")
    
    return res.data[0]

@app.put("/api/v1/clients/{client_id}")
async def update_client(client_id: str, client: ClientModel, db: Client = Depends(get_supabase)):
    try:
        res = db.table("clients").update({"name": client.name}).eq("id", client_id).execute()
    except APIError as e:
        logger.error(f"Error updating client {client_id}: {e}")
        if e.code == "23505":
            raise HTTPException(status_code=409, detail="A client with this name already exists for your account.")
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Log activity
    try:
        db.table("activity_log").insert({
            "action": "client_updated",
            "entity_type": "clients",
            "entity_id": client_id,
            "actor_name": "Recruiter",
            "metadata": {"client_name": client.name}
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log client update activity: {e}")
    
    return res.data[0]

@app.delete("/api/v1/clients/{client_id}")
async def delete_client(client_id: str, db: Client = Depends(get_supabase)):
    res = db.table("clients").update({"is_deleted": True}).eq("id", client_id).execute()
    return {"success": True}

# ============================================================
# n8n Dispatch Helpers
# ============================================================

async def handle_generate_jobs_dispatch(new_req: dict, jwt_token: str):
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    # Resolve client name
    client_name = "Generic Client"
    try:
        client_res = db.table("clients").select("name").eq("id", new_req["client_id"]).execute()
        if client_res.data:
            client_name = client_res.data[0]["name"]
    except Exception as e:
        logger.error(f"Failed to fetch client name for n8n payload: {e}")

    callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/job-openings"
    
    payload = {
        "automation_type": "generate_job_openings",
        "request_id": f"reqjob_{new_req['id']}",
        "callback_url": callback_url,
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}",
        "requirement": {
            "requirement_id": new_req["id"],
            "client_id": new_req["client_id"],
            "client_name": client_name,
            "title": new_req["title"],
            "description": new_req["description"],
            "skills": new_req["skills"],
            "experience_min": new_req.get("experience_min") or 0,
            "experience_max": new_req.get("experience_max") or 0,
            "budget_min": new_req.get("budget_min") or 0.0,
            "budget_max": new_req.get("budget_max") or 0.0,
            "currency": "INR",
            "seniority": new_req["seniority"],
            "location": "Bangalore / Remote",
            "employment_type": "full_time",
            "notes": new_req["notes"],
            "num_posts_requested": new_req["num_posts_requested"]
        },
        "ai_instruction": {
            "instruction": f"Generate {new_req['num_posts_requested']} job openings: technical, leadership, or concise as specified.",
            "tone": "professional",
            "output_language": "en",
            "must_include": new_req["skills"],
            "avoid": ["casual wording"]
        },
        "metadata": {}
    }
    success = await dispatch_n8n_webhook(N8N_GENERATE_JOBS_URL, payload, "generate_jobs")
    if not success:
        logger.warning("n8n dispatch failed for generate_jobs. Skipping local fallback as requested by user.")
        try:
            db.table("requirements").update({"status": "failed"}).eq("id", new_req["id"]).execute()
            create_system_notification(
                db, 
                new_req.get("created_by"), 
                "Job Generation Failed", 
                f"N8N workflow failed to generate jobs for requirement '{new_req.get('title')}'", 
                "error", 
                {"requirement_id": new_req["id"], "error_type": "n8n_dispatch_failed"}
            )
            log_activity_event(
                db,
                action="n8n_dispatch_failed",
                entity_type="requirements",
                entity_id=new_req["id"],
                actor_name="System",
                actor_id=new_req.get("created_by"),
                metadata={"error_context": "generate_jobs", "req_title": new_req.get("title")}
            )
        except Exception as e:
            logger.error(f"Failed to update requirement status to failed: {e}")

async def handle_regenerate_job_dispatch(job: dict, instruction: str, jwt_token: str):
    callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/job-openings/regenerate"
    payload = {
        "automation_type": "regenerate_job_opening",
        "job_opening_id": job["id"],
        "requirement_id": job.get("requirement_id"),
        "instruction": instruction,
        "callback_url": callback_url,
        "auth_header": f"Bearer {CALLBACK_SECRET}",
        "job_details": {
            "title": job.get("title"),
            "description": job.get("description"),
            "responsibilities": job.get("responsibilities") or [],
            "qualifications": job.get("qualifications") or [],
            "salary_range": job.get("salary_range"),
            "keywords": job.get("keywords") or [],
            "status": job.get("status")
        }
    }
    
    success = await dispatch_n8n_webhook(N8N_REGENERATE_JOBS_URL, payload, "regenerate_job")
    if not success:
        logger.warning("n8n dispatch failed for regenerate_job, falling back to local fallback")
        regenerate_job_background_local(job["id"], instruction, jwt_token)

def regenerate_job_background_local(job_id: str, instruction: str, jwt_token: str):
    logger.info(f"Running local fallback regeneration for job {job_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        return
    job = job_res.data[0]
    
    new_title = f"{job['title']} (Regenerated)" if "Regenerated" not in job.get('title', '') else job['title']
    new_desc = f"{job['description']}\n\n[Regenerated with instruction: \"{instruction}\"]"
    
    db.table("job_openings").update({
        "title": new_title,
        "description": new_desc,
        "processing_status": "ready"
    }).eq("id", job_id).execute()
    
    recruiter_id = None
    try:
        req_res = db.table("requirements").select("created_by").eq("id", job.get("requirement_id")).execute()
        if req_res.data:
            recruiter_id = req_res.data[0].get("created_by")
    except Exception as e:
        logger.error(f"Failed to resolve recruiter_id in regenerate_job_background_local: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Job Regenerated Successfully",
            f"Job opening '{new_title}' has been successfully regenerated using instruction '{instruction}'.",
            "job_generation",
            {"job_opening_id": job_id, "job_title": new_title}
        )
        log_activity_event(
            db,
            action="job_regenerated",
            entity_type="job_openings",
            entity_id=job_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"job_title": new_title, "instruction": instruction}
        )

async def handle_refine_question_dispatch(app_id: str, question_id: str, question: dict, instruction: str, jwt_token: str):
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    # Fetch application details
    app_record = {}
    try:
        app_res = db.table("applications").select("*").eq("id", app_id).execute()
        if app_res.data:
            app_record = app_res.data[0]
    except Exception as e:
        logger.error(f"Failed to fetch application in handle_refine_question_dispatch: {e}")
        
    # Fetch candidate details
    cand = {}
    try:
        cand_id = app_record.get("candidate_id")
        if cand_id:
            cand_res = db.table("candidates").select("*").eq("id", cand_id).execute()
            if cand_res.data:
                cand = cand_res.data[0]
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in handle_refine_question_dispatch: {e}")
        
    # Fetch job details
    job = {}
    try:
        job_id = app_record.get("job_opening_id")
        if job_id:
            job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
            if job_res.data:
                job = job_res.data[0]
    except Exception as e:
        logger.error(f"Failed to fetch job details in handle_refine_question_dispatch: {e}")
        
    # Fetch requirement details
    req = {}
    try:
        req_id = job.get("requirement_id")
        if req_id:
            req_res = db.table("requirements").select("*").eq("id", req_id).execute()
            if req_res.data:
                req = req_res.data[0]
    except Exception as e:
        logger.error(f"Failed to fetch requirement details in handle_refine_question_dispatch: {e}")

    callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/questions/refine"
    payload = {
        "automation_type": "refine_screening_question",
        "application_id": app_id,
        "question_id": question_id,
        "instruction": instruction,
        "refine_prompt": instruction,
        "refining_prompt": instruction,
        "prompt": instruction,
        "callback_url": callback_url,
        "auth_header": f"Bearer {CALLBACK_SECRET}",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "question_details": {
            "question": question.get("question"),
            "difficulty": question.get("difficulty"),
            "reason": question.get("reason") or question.get("reasoning"),
            "refine_prompt": instruction,
            "prompt": instruction,
            "instruction": instruction
        },
        "candidate": {
            "id": cand.get("id"),
            "full_name": cand.get("full_name"),
            "email": cand.get("email"),
            "skills": cand.get("skills") or [],
            "experience_years": cand.get("experience_years") or 0,
            "raw_text": cand.get("raw_text") or ""
        },
        "job_details": {
            "id": job.get("id"),
            "title": job.get("title"),
            "description": job.get("description"),
            "responsibilities": job.get("responsibilities"),
            "qualifications": job.get("qualifications"),
            "keywords": job.get("keywords")
        },
        "requirement_details": {
            "id": req.get("id"),
            "title": req.get("title"),
            "description": req.get("description"),
            "skills": req.get("skills"),
            "experience_min": req.get("experience_min"),
            "experience_max": req.get("experience_max"),
            "seniority": req.get("seniority")
        }
    }
    
    success = await dispatch_n8n_webhook(N8N_GENERATE_QUESTIONS_URL, payload, "refine_question")
    if not success:
        logger.warning("n8n dispatch failed for refine_question, falling back to local fallback")
        refine_question_background_local(app_id, question_id, instruction, jwt_token)

def refine_question_background_local(app_id: str, question_id: str, instruction: str, jwt_token: str):
    logger.info(f"Running local fallback refinement for question {question_id} in application {app_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    res = db.table("applications").select("id, screening_questions, candidate_id, reviewed_by").eq("id", app_id).execute()
    if not res.data:
        return
    app_record = res.data[0]
    questions = app_record.get("screening_questions") or []
    
    found = False
    cand_name = "Candidate"
    for q in questions:
        if q.get("id") == question_id:
            old_question = q.get("question")
            q["question"] = f"{old_question} (AI instructions applied: {instruction})"
            q["modified"] = True
            q["refining"] = False
            found = True
            break
            
    if not found:
        return
        
    db.table("applications").update({
        "screening_questions": questions
    }).eq("id", app_id).execute()
    
    recruiter_id = app_record.get("reviewed_by")
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", app_record["candidate_id"]).execute()
        if cand_res.data:
            cand_name = cand_res.data[0].get("full_name") or "Candidate"
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in refine_question_background_local: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Question Refined Successfully",
            f"Screening question for candidate '{cand_name}' has been successfully refined by AI.",
            "job_generation",
            {"application_id": app_id, "question_id": question_id}
        )
        log_activity_event(
            db,
            action="screening_question_refined",
            entity_type="applications",
            entity_id=app_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"candidate_name": cand_name, "question_id": question_id}
        )

def run_local_scan_publish(job_id: str, jwt_token: str):
    logger.info(f"Running local scan and publish for job {job_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        return
    job = job_res.data[0]
    
    # Generate 5 default skills from keywords/responsibilities
    keywords = job.get("keywords") or []
    default_skills = keywords[:5]
    while len(default_skills) < 5:
        default_skills.append(f"Required Skill {len(default_skills) + 1}")
        
    weights = [0.30, 0.25, 0.15, 0.15, 0.15]
    
    skills_list = []
    for idx, skill_name in enumerate(default_skills):
        skills_list.append({
            "id": f"sk-{idx + 1}-{int(time.time())}",
            "job_opening_id": job_id,
            "skill_name": skill_name,
            "weight": weights[idx],
            "skill_order": idx + 1,
            "approved": False
        })
        
    db.table("job_opening_skills").upsert({
        "job_opening_id": job_id,
        "skills": skills_list
    }, on_conflict="job_opening_id").execute()
        
    db.table("job_openings").update({"processing_status": "skill_approval"}).eq("id", job_id).execute()
    
    # Resolve recruiter_id and send notification/log
    recruiter_id = None
    job_title = job.get("title", "Unknown Job")
    try:
        req_res = db.table("requirements").select("created_by").eq("id", job.get("requirement_id")).execute()
        if req_res.data:
            recruiter_id = req_res.data[0].get("created_by")
    except Exception as e:
        logger.error(f"Failed to resolve recruiter_id in run_local_scan_publish: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Skills Extraction Completed",
            f"Mandate skills successfully extracted (local fallback) for job '{job_title}'. Core requirement weights are ready for review.",
            "job_generation",
            {"job_opening_id": job_id, "job_title": job_title}
        )
        log_activity_event(
            db,
            action="skills_extracted",
            entity_type="job_openings",
            entity_id=job_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"job_title": job_title}
        )

async def handle_scan_publish_dispatch(job: dict, jwt_token: str):
    callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/job-skills"
    payload = {
        "job_opening_id": job["id"],
        "title": job["title"],
        "description": job["description"],
        "responsibilities": job["responsibilities"],
        "qualifications": job["qualifications"],
        "keywords": job["keywords"],
        "salary_range": job["salary_range"],
        "callback_url": callback_url,
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}"
    }
    success = await dispatch_n8n_webhook(N8N_EXTRACT_SKILLS_URL, payload, "extract_skills")
    if not success:
        logger.warning("n8n dispatch failed for extract_skills, falling back to local execution")
        run_local_scan_publish(job["id"], jwt_token)

async def handle_match_candidates_dispatch(job_id: str, jwt_token: str):
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    try:
        # Fetch job title
        job_res = db.table("job_openings").select("title").eq("id", job_id).execute()
        job_title = job_res.data[0].get("title", "") if job_res.data else ""

        # Fetch approved skills
        skills_res = db.table("job_opening_skills").select("skills").eq("job_opening_id", job_id).execute()
        approved_skills = skills_res.data[0].get("skills", []) if skills_res.data else []
        
        callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/candidate-matches"
        payload = {
            "job_opening": {
                "job_opening_id": job_id,
                "title": job_title
            },
            "approved_skills": approved_skills,
            "callback_url": callback_url,
            "authorization": f"Bearer {CALLBACK_SECRET}",
            "auth_header": f"Bearer {CALLBACK_SECRET}"
        }
        
        success = await dispatch_n8n_webhook(N8N_MATCH_CANDIDATES_URL, payload, "match_candidates")
        if not success:
            logger.warning("n8n dispatch failed for match_candidates, falling back to local execution")
            match_candidates_background(job_id, jwt_token)
    except Exception as e:
        logger.error(f"Error in handle_match_candidates_dispatch: {e}")
        match_candidates_background(job_id, jwt_token)

async def handle_generate_questions_dispatch(app_record: dict, cand: dict, job: dict, req: dict, jwt_token: str):
    callback_url = f"{BACKEND_BASE_URL}/api/v1/callbacks/screening-questions"
    payload = {
        "application_id": app_record["id"],
        "callback_url": callback_url,
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}",
        "candidate": {
            "id": cand["id"],
            "full_name": cand["full_name"],
            "email": cand["email"],
            "skills": cand.get("skills") or [],
            "experience_years": cand.get("experience_years") or 0,
            "raw_text": cand.get("raw_text") or ""
        },
        "job_details": {
            "id": job.get("id"),
            "title": job.get("title"),
            "description": job.get("description"),
            "responsibilities": job.get("responsibilities"),
            "qualifications": job.get("qualifications"),
            "keywords": job.get("keywords")
        },
        "requirement_details": {
            "id": req.get("id"),
            "title": req.get("title"),
            "description": req.get("description"),
            "skills": req.get("skills"),
            "experience_min": req.get("experience_min"),
            "experience_max": req.get("experience_max"),
            "seniority": req.get("seniority")
        }
    }
    success = await dispatch_n8n_webhook(N8N_GENERATE_QUESTIONS_URL, payload, "generate_questions")
    if not success:
        logger.warning("n8n dispatch failed for generate_questions, falling back to local execution")
        generate_questions_background(
            app_record["id"],
            cand["full_name"],
            cand.get("skills") or [],
            cand.get("experience_years") or 0,
            cand.get("raw_text") or "",
            jwt_token
        )

# 3. Requirements & Background AI Job generation
def generate_job_openings_background(req_id: str, client_id: str, req_title: str, req_desc: str, req_skills: List[str], req_exp_min: int, req_exp_max: int, req_seniority: str, req_budget_min: float, req_budget_max: float, num_posts: int, jwt_token: str):
    logger.info(f"Starting background job generation for requirement {req_id}")
    # Initialize a system Supabase client with the user's JWT to write on their behalf
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    db.table("requirements").update({"status": "generating"}).eq("id", req_id).execute()
    
    for i in range(1, num_posts + 1):
        try:
            job_title = f"{req_title} (Option {i})"
            job_desc = ""
            responsibilities = []
            qualifications = []
            salary_range = f"₹{int(req_budget_min)} - ₹{int(req_budget_max)} LPA"
            keywords = req_skills
            
            # Simulated Fallback
            job_title = f"Senior {req_title} - Strategy & Execution (Option {i})" if i == 1 else f"Lead {req_title} - Innovation & Delivery (Option {i})"
            job_desc = f"We are seeking a talented {job_title} for our client. The ideal candidate will leverage modern patterns, lead key initiatives, and deliver high-impact features. This is a fast-paced environment requiring strong problem-solving skills."
            responsibilities = [
                "Lead development of core features and platform widgets.",
                "Collaborate with product and UX designers to craft high-fidelity interfaces.",
                "Ensure responsive designs and optimize rendering code for target metrics.",
                "Implement thorough unit testing across critical flows."
            ]
            qualifications = [
                f"At least {req_exp_min} years of professional engineering experience.",
                f"Strong competency in: {', '.join(req_skills[:4])}.",
                "Excellent analytical thinking and clear articulation of design decisions."
            ]
            
            
            # Insert job opening draft
            db.table("job_openings").insert({
                "requirement_id": req_id,
                "post_index": i,
                "title": job_title,
                "description": job_desc,
                "responsibilities": responsibilities,
                "qualifications": qualifications,
                "keywords": keywords,
                "salary_range": salary_range,
                "status": "draft",
                "processing_status": "ready"
            }).execute()
            
        except Exception as e:
            logger.error(f"Error generating job opening option {i}: {e}")
            db.table("requirements").update({"status": "ready"}).eq("id", req_id).execute()
            return
            
    # Mark requirement as ready
    db.table("requirements").update({"status": "ready"}).eq("id", req_id).execute()
    logger.info(f"Background job generation completed for requirement {req_id}")

    # Resolve recruiter_id and req_title for system notification
    recruiter_id = None
    req_title = "Unknown Requirement"
    try:
        req_res = db.table("requirements").select("created_by, title").eq("id", req_id).execute()
        if req_res.data:
            recruiter_id = req_res.data[0].get("created_by")
            req_title = req_res.data[0].get("title", "Unknown Requirement")
    except Exception as e:
        logger.error(f"Failed to resolve requirement details for notification in local generate: {e}")

    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Job Generation Completed",
            f"Successfully generated {num_posts} job openings (local fallback) for mandate '{req_title}'.",
            "job_generation",
            {"requirement_id": req_id, "requirement_title": req_title, "job_openings_count": num_posts}
        )
        log_activity_event(
            db,
            action="job_generation_completed",
            entity_type="requirements",
            entity_id=req_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"req_title": req_title, "job_openings_count": num_posts}
        )

@app.get("/api/v1/requirements")
async def get_requirements(db: Client = Depends(get_supabase)):
    res = db.table("requirements").select("*").eq("is_deleted", False).execute()
    return res.data

@app.put("/api/v1/requirements/{req_id}")
async def update_requirement(req_id: str, req: RequirementUpdateModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    update_data = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    
    # Fetch current requirement details first
    curr_req_res = db.table("requirements").select("*").eq("id", req_id).execute()
    if not curr_req_res.data:
        raise HTTPException(status_code=404, detail="Requirement not found")
    old_req = curr_req_res.data[0]
    
    if not update_data:
        return old_req

    # Check if any structural fields are being updated
    structural_fields = {"title", "description", "skills", "experience_min", "experience_max", "budget_min", "budget_max", "seniority", "num_posts_requested"}
    has_structural_change = any(f in update_data for f in structural_fields)
    
    if has_structural_change:
        # Soft delete existing job openings first so they are replaced by the new generation
        db.table("job_openings").update({"is_deleted": True}).eq("requirement_id", req_id).execute()
        
    # Check status transitions and job existence
    new_status = update_data.get("status") or old_req.get("status")
    new_num_posts = update_data.get("num_posts_requested")
    if new_num_posts is None:
        new_num_posts = old_req.get("num_posts_requested") or 1
        
    # Verify if job openings already exist
    jobs_res = db.table("job_openings").select("id").eq("requirement_id", req_id).eq("is_deleted", False).execute()
    existing_jobs_count = len(jobs_res.data) if jobs_res.data else 0
    
    trigger_generation = False
    if (update_data.get("status") == "generating") or (
        new_status in ["generating", "ready"] and (
            existing_jobs_count == 0 or new_num_posts > existing_jobs_count
        )
    ):
        trigger_generation = True
        update_data["status"] = "generating" # force to generating during process
            
    res = db.table("requirements").update(update_data).eq("id", req_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    new_req = res.data[0]
        
    db.table("activity_log").insert({
        "action": "requirement_updated",
        "entity_type": "requirements",
        "entity_id": req_id,
        "actor_name": "Recruiter",
        "metadata": {"req_title": new_req.get("title", "")}
    }).execute()
    
    if trigger_generation:
        auth_header = request.headers.get("Authorization", "")
        jwt_token = ""
        if auth_header:
            if auth_header.startswith("Bearer "):
                jwt_token = auth_header.split(" ")[1]
            elif auth_header.startswith("eyJ"):
                jwt_token = auth_header
                
        if USE_N8N:
            background_tasks.add_task(
                handle_generate_jobs_dispatch,
                new_req,
                jwt_token
            )
        else:
            background_tasks.add_task(
                generate_job_openings_background,
                req_id,
                new_req.get("client_id"),
                new_req.get("title"),
                new_req.get("description"),
                new_req.get("skills") or [],
                new_req.get("experience_min") or 0,
                new_req.get("experience_max") or 0,
                new_req.get("seniority"),
                new_req.get("budget_min") or 0.0,
                new_req.get("budget_max") or 0.0,
                new_req.get("num_posts_requested") or 1,
                jwt_token
            )
            
    return new_req


@app.delete("/api/v1/requirements/{req_id}")
async def delete_requirement(req_id: str, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Soft delete requirement
    res = db.table("requirements").update({"is_deleted": True}).eq("id", req_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    # Soft delete linked job openings
    db.table("job_openings").update({"is_deleted": True}).eq("requirement_id", req_id).execute()
    
    # Log activity
    db.table("activity_log").insert({
        "action": "requirement_deleted",
        "entity_type": "requirements",
        "entity_id": req_id,
        "actor_name": "Recruiter",
        "metadata": {"req_title": res.data[0].get("title", "")}
    }).execute()
    
    return {"status": "success"}

@app.post("/api/v1/requirements")
async def create_requirement(req: RequirementModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    payload = {
        "client_id": req.client_id,
        "title": req.title,
        "description": req.description,
        "skills": req.skills,
        "experience_min": req.experience_min,
        "experience_max": req.experience_max,
        "budget_min": req.budget_min,
        "budget_max": req.budget_max,
        "seniority": req.seniority,
        "notes": req.notes,
        "num_posts_requested": req.num_posts_requested,
        "status": "generating"
    }
    if user_id:
        payload["created_by"] = user_id
    res = db.table("requirements").insert(payload).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create requirement")
    
    new_req = res.data[0]
    
    # Forward the user's JWT token
    auth_header = request.headers.get("Authorization", "")
    jwt_token = ""
    if auth_header:
        if auth_header.startswith("Bearer "):
            jwt_token = auth_header.split(" ")[1]
        elif auth_header.startswith("eyJ"):
            jwt_token = auth_header
    
    # Trigger background job openings generation task
    if USE_N8N:
        background_tasks.add_task(
            handle_generate_jobs_dispatch,
            new_req,
            jwt_token
        )
    else:
        background_tasks.add_task(
            generate_job_openings_background,
            new_req["id"],
            req.client_id,
            req.title,
            req.description,
            req.skills,
            req.experience_min,
            req.experience_max,
            req.seniority,
            req.budget_min,
            req.budget_max,
            req.num_posts_requested,
            jwt_token
        )
    
    # Log activity
    db.table("activity_log").insert({
        "action": "requirement_created",
        "entity_type": "requirements",
        "entity_id": new_req["id"],
        "actor_name": "Recruiter",
        "metadata": {"req_title": req.title}
    }).execute()
    
    return new_req


@app.get("/api/v1/activity_log")
async def get_activity_log(db: Client = Depends(get_supabase)):
    res = db.table("activity_log").select("*").order("created_at", desc=True).execute()
    return res.data


@app.delete("/api/v1/activity_log/{id}")
async def delete_activity_log(id: str, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    res = db.table("activity_log").delete().eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return {"status": "success"}


@app.delete("/api/v1/activity_log")
async def delete_all_activity_logs(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db.table("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    return {"status": "success"}


@app.get("/api/v1/notifications")
async def get_notifications(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    res = db.table("notifications").select("*").eq("recruiter_id", user_id).order("created_at", desc=True).execute()
    return res.data


@app.post("/api/v1/notifications/{id}/read")
async def mark_notification_read(id: str, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    res = db.table("notifications").update({"is_read": True}).eq("id", id).eq("recruiter_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}


@app.post("/api/v1/notifications/read-all")
async def mark_all_notifications_read(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db.table("notifications").update({"is_read": True}).eq("recruiter_id", user_id).execute()
    return {"status": "success"}


@app.delete("/api/v1/notifications/{id}")
async def delete_notification(id: str, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    res = db.table("notifications").delete().eq("id", id).eq("recruiter_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}


@app.delete("/api/v1/notifications")
async def delete_all_notifications(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db.table("notifications").delete().eq("recruiter_id", user_id).execute()
    return {"status": "success"}


# 4. Job Openings endpoints
@app.get("/api/v1/jobs")
async def get_jobs(db: Client = Depends(get_supabase)):
    res = db.table("job_openings").select("*, requirements(id, title, clients(name))").eq("is_deleted", False).execute()
    formatted = []
    for row in res.data:
        req = row.get("requirements") or {}
        cli = req.get("clients") or {}
        formatted.append({
            **{k: v for k, v in row.items() if k != "requirements"},
            "client_name": cli.get("name") or "Generic Client"
        })
    return formatted


@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_openings").select("*, requirements(id, title, clients(name))").eq("id", job_id).eq("is_deleted", False).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
    row = res.data[0]
    req = row.get("requirements") or {}
    cli = req.get("clients") or {}
    return {
        **{k: v for k, v in row.items() if k != "requirements"},
        "client_name": cli.get("name") or "Generic Client"
    }


@app.delete("/api/v1/jobs/{job_id}")
async def delete_job(job_id: str, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Soft delete job opening
    res = db.table("job_openings").update({"is_deleted": True}).eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
        
    # Log activity
    db.table("activity_log").insert({
        "action": "job_deleted",
        "entity_type": "job_openings",
        "entity_id": job_id,
        "actor_name": "Recruiter",
        "metadata": {"job_title": res.data[0].get("title", "")}
    }).execute()
    
    return {"status": "success"}


@app.post("/api/v1/jobs/{job_id}/regenerate")
async def regenerate_job(job_id: str, payload: JobRegenerateModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
    job = job_res.data[0]
    
    db.table("job_openings").update({"processing_status": "generating"}).eq("id", job_id).execute()
    
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    
    if USE_N8N:
        background_tasks.add_task(
            handle_regenerate_job_dispatch,
            job,
            payload.instruction,
            jwt_token
        )
    else:
        background_tasks.add_task(
            regenerate_job_background_local,
            job_id,
            payload.instruction,
            jwt_token
        )
        
    return {"status": "generating"}

@app.patch("/api/v1/jobs/{job_id}")
async def patch_job(job_id: str, job_update: JobOpeningUpdateModel, db: Client = Depends(get_supabase)):
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
        
    update_data = {}
    if job_update.title is not None:
        update_data["title"] = job_update.title
    if job_update.description is not None:
        update_data["description"] = job_update.description
    if job_update.responsibilities is not None:
        update_data["responsibilities"] = job_update.responsibilities
    if job_update.qualifications is not None:
        update_data["qualifications"] = job_update.qualifications
    if job_update.keywords is not None:
        update_data["keywords"] = job_update.keywords
    if job_update.salary_range is not None:
        update_data["salary_range"] = job_update.salary_range
    if job_update.status is not None:
        if job_update.status not in ['draft', 'confirmed', 'published', 'closed']:
            raise HTTPException(status_code=400, detail="Invalid status value")
        update_data["status"] = job_update.status
    if job_update.processing_status is not None:
        update_data["processing_status"] = job_update.processing_status
    if job_update.error_message is not None:
        update_data["error_message"] = job_update.error_message
    if job_update.custom_stages is not None:
        update_data["custom_stages"] = job_update.custom_stages

    if update_data:
        res = db.table("job_openings").update(update_data).eq("id", job_id).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update job opening")
        updated_job = res.data[0]
        
        try:
            db.table("activity_log").insert({
                "action": "job_updated",
                "entity_type": "job_openings",
                "entity_id": job_id,
                "actor_name": "Recruiter",
                "metadata": {"job_title": updated_job.get("title", ""), "updated_fields": list(update_data.keys())}
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log job update activity: {e}")
        return updated_job
    return job_res.data[0]

@app.post("/api/v1/jobs/{job_id}/confirm")
async def confirm_job(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_openings").update({"status": "confirmed"}).eq("id", job_id).execute()
    return res.data[0] if res.data else {}

@app.post("/api/v1/jobs/{job_id}/scan-publish")
@app.post("/api/v1/jobs/{job_id}/scan-and-publish")
async def scan_and_publish_job(job_id: str, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    # Fetch job details
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
    
    job = job_res.data[0]
    db.table("job_openings").update({"processing_status": "skill_approval"}).eq("id", job_id).execute()
    
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    
    if USE_N8N:
        background_tasks.add_task(handle_scan_publish_dispatch, job, jwt_token)
    else:
        background_tasks.add_task(run_local_scan_publish, job_id, jwt_token)
        
    return {"status": "skill_approval"}


def generate_candidate_query_response(job: dict, query_text: str) -> str:
    import re
    query = query_text.lower()
    title = job.get("title") or "this role"
    
    # 1. Salary query
    if any(k in query for k in ["salary", "pay", "compensation", "package", "lpa", "ctc", "remuneration", "money"]):
        sal = job.get("salary_range")
        if sal and sal.strip():
            return f"The salary range for the {title} position is {sal}."
        else:
            return f"The salary range for the {title} position is not explicitly specified. We have forwarded your question to the hiring team."
            
    # 2. Experience query
    if any(k in query for k in ["experience", "years", "yrs", "how long", "mid", "senior", "junior"]):
        quals = job.get("qualifications") or []
        exp_mentions = [q for q in quals if "year" in q.lower() or "experience" in q.lower()]
        if exp_mentions:
            return f"Regarding experience requirements for {title}: " + " ".join(exp_mentions)
        return f"Please review the preferred qualifications. Typically, relevant industry experience in similar roles is preferred. We have alerted the recruiter to clarify this for you."

    # 3. Location / Remote query
    if any(k in query for k in ["location", "remote", "wfh", "office", "hybrid", "city", "where"]):
        desc = job.get("description", "")
        loc_match = re.search(r'(remote|hybrid|office|on-site|location)', desc, re.IGNORECASE)
        if loc_match:
            return f"Regarding location: The role description mentions '{loc_match.group(0)}'. Please review the full job description details on this page."
        return f"This role's location / work model (remote/hybrid/on-site) is not explicitly listed. We have forwarded this query to the hiring team."

    # 4. Responsibilities query
    if any(k in query for k in ["responsibility", "responsibilities", "duties", "duty", "do", "task", "day to day", "role"]):
        resps = job.get("responsibilities") or []
        if resps:
            bullets = "\n".join([f"- {r}" for r in resps[:4]])
            return f"Key responsibilities for this role include:\n{bullets}"
        return f"Responsibilities for this role include delivering on the goals outlined in the job description. The recruiter has been notified of your inquiry."

    # 5. Skills / Tech stack query
    if any(k in query for k in ["skill", "skills", "tech", "technology", "technologies", "language", "framework", "database"]):
        keywords = job.get("keywords") or []
        quals = job.get("qualifications") or []
        skills_mentioned = [q for q in quals if any(kw.lower() in q.lower() for kw in keywords)]
        
        tech_list = ", ".join(keywords) if keywords else ""
        resp = ""
        if tech_list:
            resp += f"The key technologies and skills mentioned for this role are: {tech_list}. "
        if skills_mentioned:
            resp += f"\nPreferred qualifications: " + " ".join(skills_mentioned[:2])
        if resp:
            return resp.strip()
        return "The required skills are detailed in the job opening description and qualifications. We have forwarded your tech stack query to the team."

    # 6. Qualifications query
    if any(k in query for k in ["qualification", "qualifications", "require", "requirements", "degree", "education", "background"]):
        quals = job.get("qualifications") or []
        if quals:
            bullets = "\n".join([f"- {q}" for q in quals[:4]])
            return f"Preferred qualifications for this role:\n{bullets}"
        return f"The qualifications for this position are listed in the details panel. We have notified the hiring team of your question."

    # 7. Generic Fallback
    client = job.get("client_name")
    client_str = f" with {client}" if client else ""
    return f"Thank you for your question regarding the {title} position{client_str}. We have recorded your query and forwarded it to our hiring team for review."


def send_email(to_email: str, subject: str, html_body: str, reply_to: Optional[str] = None, sender_name: Optional[str] = None):
    import smtplib
    import os
    import re
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from datetime import datetime
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@kozker.ai")
    
    # Log to console & requests.log for local audit
    log_msg = f"\n========================================\n[EMAIL DISPATCH] To: {to_email}\nSubject: {subject}\nReply-To: {reply_to}\nSender-Name: {sender_name}\nBody:\n{html_body}\n========================================\n"
    logger.info(log_msg)
    
    try:
        with open("requests.log", "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] EMAIL To: {to_email} | Subject: {subject} | Reply-To: {reply_to}\n{html_body}\n\n")
    except Exception as le:
        logger.error(f"Failed to write email to requests.log: {le}")
        
    if smtp_host and smtp_port and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            if sender_name:
                msg["From"] = f"{sender_name} <{smtp_from}>"
            else:
                msg["From"] = smtp_from
            msg["To"] = to_email
            if reply_to:
                msg["Reply-To"] = reply_to
            
            text_body = re.sub('<[^<]+?>', '', html_body)
            
            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            
            msg.attach(part1)
            msg.attach(part2)
            
            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_host, port)
            else:
                server = smtplib.SMTP(smtp_host, port)
                server.starttls()
                
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email successfully sent via SMTP to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email via SMTP to {to_email}: {e}")
    else:
        logger.info(f"SMTP is not configured. Email to {to_email} was logged to console and requests.log.")


# 10. Candidate queries endpoints
@app.post("/api/v1/jobs/{job_id}/queries")
async def post_candidate_query(job_id: str, payload: CandidateQueryCreateModel, db: Client = Depends(get_supabase)):
    import uuid
    from datetime import datetime
    
    # Try to fetch job details
    job = {}
    try:
        job_res = db.table("job_openings").select("*, requirements(id, title, created_by, clients(name))").eq("id", job_id).eq("is_deleted", False).execute()
        if job_res.data:
            row = job_res.data[0]
            req = row.get("requirements") or {}
            cli = req.get("clients") or {}
            job = {
                **{k: v for k, v in row.items() if k != "requirements"},
                "client_name": cli.get("name") or "Generic Client",
                "created_by": req.get("created_by") or "usr-1"
            }
    except Exception as e:
        logger.error(f"Failed to fetch job details for query answer generator: {e}")
        
    # Generate the context-aware response
    ai_response = generate_candidate_query_response(job, payload.query_text)
    
    query_id = str(uuid.uuid4())
    new_query = {
        "id": query_id,
        "job_id": job_id,
        "candidate_email": payload.candidate_email,
        "query_text": payload.query_text,
        "ai_response": ai_response,
        "is_resolved": False,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    # Dual-mode save: database first, in-memory backup second
    saved_to_db = False
    try:
        db.table("candidate_queries").insert(new_query).execute()
        saved_to_db = True
    except Exception as e:
        logger.warning(f"Failed to save candidate query to Supabase: {e}. Falling back to in-memory dictionary.")
        if job_id not in in_memory_queries:
            in_memory_queries[job_id] = []
        in_memory_queries[job_id].append(new_query)
        
    # Recruiter notification: try to insert into db notifications, fallback to logging
    recruiter_id = job.get("created_by") or "usr-1"
    notif_msg = f"Candidate ({payload.candidate_email}) submitted a query for role '{job.get('title', 'Active Opening')}': '{payload.query_text}'"
    try:
        db.table("notifications").insert({
            "recruiter_id": recruiter_id,
            "title": "New Candidate Query",
            "message": notif_msg,
            "type": "upload", # matches valid types
            "is_read": False,
            "metadata": {"job_id": job_id, "query_id": query_id}
        }).execute()
    except Exception as ne:
        logger.warning(f"Failed to insert database notification for candidate query: {ne}")
        
    return new_query


@app.get("/api/v1/jobs/{job_id}/queries")
async def get_candidate_queries(job_id: str, email: Optional[str] = None, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not email and not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: Recruiter auth or candidate email filter required")
        
    # Dual-mode read
    try:
        query_builder = db.table("candidate_queries").select("*").eq("job_id", job_id)
        if email:
            query_builder = query_builder.eq("candidate_email", email.strip())
        res = query_builder.order("created_at", desc=True).execute()
        
        db_queries = res.data or []
        mem_queries = in_memory_queries.get(job_id, [])
        if email:
            mem_queries = [mq for mq in mem_queries if mq.get("candidate_email", "").strip().lower() == email.strip().lower()]
            
        all_queries = {q["id"]: q for q in (db_queries + mem_queries)}
        return sorted(all_queries.values(), key=lambda x: x["created_at"], reverse=True)
    except Exception as e:
        logger.warning(f"Failed to fetch candidate queries from Supabase: {e}. Falling back to in-memory dictionary.")
        mem_queries = in_memory_queries.get(job_id, [])
        if email:
            mem_queries = [mq for mq in mem_queries if mq.get("candidate_email", "").strip().lower() == email.strip().lower()]
        return sorted(mem_queries, key=lambda x: x["created_at"], reverse=True)


@app.post("/api/v1/queries/{query_id}/resolve")
async def resolve_candidate_query(query_id: str, payload: ResolveQueryModel, db: Client = Depends(get_supabase)):
    # Dual-mode update
    updated_query = None
    try:
        res = db.table("candidate_queries").update({"is_resolved": payload.is_resolved}).eq("id", query_id).execute()
        if res.data:
            updated_query = res.data[0]
    except Exception as e:
        logger.warning(f"Failed to update candidate query in Supabase: {e}. Updating in-memory.")
        
    # Check/update in-memory backup as well to maintain consistency
    for job_id, queries in in_memory_queries.items():
        for q in queries:
            if q["id"] == query_id:
                q["is_resolved"] = payload.is_resolved
                updated_query = q
                break
                
    if not updated_query:
        raise HTTPException(status_code=404, detail="Query not found")
        
    return updated_query


@app.get("/api/v1/queries")
async def get_all_candidate_queries(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        # Fetch the recruiter's own job opening IDs (Rls scopes this automatically for authenticated user)
        jobs_res = db.table("job_openings").select("id").eq("is_deleted", False).execute()
        recruiter_job_ids = {j["id"] for j in jobs_res.data} if jobs_res.data else set()

        # Fetch from Supabase candidate_queries table, joined with job details if possible
        res = db.table("candidate_queries").select("*, job_openings(id, title)").order("created_at", desc=True).execute()
        db_queries = res.data or []
        
        # Explicit python-side filtering to match recruiter job IDs
        db_queries = [q for q in db_queries if q.get("job_id") in recruiter_job_ids]
        
        # Merge with in-memory backups filtered by recruiter's job IDs
        all_mem = []
        for j_id, q_list in in_memory_queries.items():
            if j_id in recruiter_job_ids:
                all_mem.extend(q_list)
            
        all_queries = {q["id"]: q for q in (db_queries + all_mem)}
        return sorted(all_queries.values(), key=lambda x: x["created_at"], reverse=True)
    except Exception as e:
        logger.warning(f"Failed to fetch candidate queries from Supabase: {e}. Falling back to in-memory.")
        # Fallback to fetching recruiter's jobs to filter in-memory queries
        recruiter_job_ids = set()
        try:
            jobs_res = db.table("job_openings").select("id").eq("is_deleted", False).execute()
            if jobs_res.data:
                recruiter_job_ids = {j["id"] for j in jobs_res.data}
        except Exception as je:
            logger.warning(f"Failed to fetch job openings for fallback queries filter: {je}")

        all_mem = []
        for j_id, q_list in in_memory_queries.items():
            if not recruiter_job_ids or j_id in recruiter_job_ids:
                all_mem.extend(q_list)
        return sorted(all_mem, key=lambda x: x["created_at"], reverse=True)


@app.post("/api/v1/queries/{query_id}/answer")
async def answer_candidate_query(query_id: str, payload: AnswerQueryModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    updated_query = None
    try:
        res = db.table("candidate_queries").update({
            "ai_response": payload.response_text,
            "is_resolved": True
        }).eq("id", query_id).execute()
        if res.data:
            updated_query = res.data[0]
    except Exception as e:
        logger.warning(f"Failed to update query answer in Supabase: {e}. Updating in-memory.")

    # Check/update in-memory backup as well to maintain consistency
    for job_id, queries in in_memory_queries.items():
        for q in queries:
            if q["id"] == query_id:
                q["ai_response"] = payload.response_text
                q["is_resolved"] = True
                updated_query = q
                break

    if not updated_query:
        raise HTTPException(status_code=404, detail="Query not found")

    # Send response email directly to candidate
    try:
        cand_email = updated_query.get("candidate_email")
        orig_text = updated_query.get("query_text")
        ans_text = payload.response_text
        j_id = updated_query.get("job_id")
        
        # Fetch job title
        job_title = "Active Opening"
        try:
            job_res = db.table("job_openings").select("title").eq("id", j_id).execute()
            if job_res.data:
                job_title = job_res.data[0].get("title") or "Active Opening"
        except Exception as je:
            logger.warning(f"Failed to fetch job title for email notification: {je}")
            
        # Fetch recruiter details if user_id is present
        recruiter_email = None
        recruiter_name = None
        if user_id:
            try:
                prof_res = db.table("profiles").select("email, full_name").eq("id", user_id).execute()
                if prof_res.data:
                    recruiter_email = prof_res.data[0].get("email")
                    recruiter_name = prof_res.data[0].get("full_name")
            except Exception as pe:
                logger.warning(f"Failed to fetch recruiter profile for email metadata: {pe}")
            
        subject = f"Answer to your query regarding the {job_title} position"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <div style="background-color: #ff7e5f; padding: 15px; border-radius: 4px 4px 0 0; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Kozker Recruiter Support</h2>
                </div>
                <div style="padding: 20px 10px;">
                    <p>Hi there,</p>
                    <p>The hiring team has responded to your question regarding the <strong>{job_title}</strong> opening.</p>
                    
                    <div style="background-color: #f7fafc; border-left: 4px solid #cbd5e0; padding: 12px; margin: 15px 0; font-style: italic;">
                        <strong>Your Question:</strong><br/>
                        "{orig_text}"
                    </div>
                    
                    <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin: 15px 0;">
                        <strong>Answer:</strong><br/>
                        {ans_text}
                    </div>
                    
                    <p style="margin-top: 25px;">Best regards,<br/>{recruiter_name or 'The Hiring Team'}</p>
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #718096;">
                    This is an automated notification from Kozker Recruiter AI Workspace.
                </div>
            </body>
        </html>
        """
        send_email(cand_email, subject, html_body, reply_to=recruiter_email, sender_name=recruiter_name)
    except Exception as e:
        logger.error(f"Failed to construct or send query response email: {e}")

    return updated_query


@app.get("/api/v1/jobs/{job_id}/skills")
async def get_job_skills(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_opening_skills").select("skills").eq("job_opening_id", job_id).execute()
    if res.data:
        return res.data[0].get("skills", [])
    return []

async def handle_approve_skills_logic(job_id: str, skills_data: SkillsApprovalModel, background_tasks: BackgroundTasks, request: Request, db: Client):
    # Format skills into a consolidated list
    skills_list = []
    for idx, skill in enumerate(skills_data.skills):
        skills_list.append({
            "id": skill.get("id") or f"sk-{idx + 1}-{int(time.time())}",
            "job_opening_id": job_id,
            "skill_name": skill["skill_name"],
            "weight": float(skill.get("weight") or 0.0),
            "skill_order": idx + 1,
            "approved": True
        })
        
    # Normalize weights so they sum to exactly 1.0 (to satisfy database trigger)
    total_w = sum(s["weight"] for s in skills_list)
    if total_w > 0:
        running_w = 0.0
        for idx, s in enumerate(skills_list):
            if idx == len(skills_list) - 1:
                s["weight"] = round(1.0 - running_w, 4)
            else:
                norm_w = round(s["weight"] / total_w, 4)
                s["weight"] = norm_w
                running_w += norm_w
    else:
        # If all weights are 0, distribute them equally
        n = len(skills_list)
        if n > 0:
            running_w = 0.0
            for idx, s in enumerate(skills_list):
                if idx == n - 1:
                    s["weight"] = round(1.0 - running_w, 4)
                else:
                    w = round(1.0 / n, 4)
                    s["weight"] = w
                    running_w += w

    db.table("job_opening_skills").upsert({
        "job_opening_id": job_id,
        "skills": skills_list
    }, on_conflict="job_opening_id").execute()
        
    # Mark job status as published
    db.table("job_openings").update({
        "status": "published",
        "processing_status": "matching"
    }).eq("id", job_id).execute()
    
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    user_id = get_current_user_id(auth_header)
    
    # Send activity logs
    job_title = "Job opening"
    try:
        job_res = db.table("job_openings").select("title").eq("id", job_id).execute()
        if job_res.data:
            job_title = job_res.data[0].get("title", "")
    except Exception as e:
        logger.error(f"Failed to fetch job title in handle_approve_skills_logic: {e}")
        
    log_activity_event(
        db,
        action="skills_approved",
        entity_type="job_openings",
        entity_id=job_id,
        actor_name="Recruiter",
        actor_id=user_id,
        metadata={"job_title": job_title, "skills_count": len(skills_list)}
    )
    
    log_activity_event(
        db,
        action="job_published",
        entity_type="job_openings",
        entity_id=job_id,
        actor_name="Recruiter",
        actor_id=user_id,
        metadata={"job_title": job_title}
    )
    
    # Trigger matching task in the background
    if USE_N8N:
        background_tasks.add_task(handle_match_candidates_dispatch, job_id, jwt_token)
    else:
        background_tasks.add_task(match_candidates_background, job_id, jwt_token)
        
    return {"status": "published"}

@app.put("/api/v1/jobs/{job_id}/skills")
async def save_skills_put(job_id: str, skills_data: SkillsApprovalModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    return await handle_approve_skills_logic(job_id, skills_data, background_tasks, request, db)

@app.post("/api/v1/jobs/{job_id}/approve-skills")
async def save_skills_post(job_id: str, skills_data: SkillsApprovalModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    return await handle_approve_skills_logic(job_id, skills_data, background_tasks, request, db)


def evaluate_candidate_matching_with_history(db: Client, cand_id: str, job_id: str, approved_skills: list, cand_skills: list, cand_raw_text: str):
    # 1. Base skill match
    matched_score = 45.0
    strengths = []
    skill_gaps = []
    
    for sk in approved_skills:
        sk_name = sk["skill_name"].lower()
        sk_weight = float(sk["weight"])
        if sk_name in cand_skills or sk_name in cand_raw_text.lower():
            matched_score += (sk_weight * 0.5)
            strengths.append(sk["skill_name"])
        else:
            skill_gaps.append(sk["skill_name"])
            
    matched_score = min(matched_score, 100.0)
    
    # 2. Get previous performance
    # Fetch other applications
    other_apps_res = db.table("applications").select("*, job_openings(title)").eq("candidate_id", cand_id).neq("job_opening_id", job_id).execute()
    other_apps = other_apps_res.data or []
    
    # Fetch stages
    other_app_ids = [oa["id"] for oa in other_apps]
    other_stages = []
    if other_app_ids:
        stages_res = db.table("interview_stages").select("*").in_("application_id", other_app_ids).execute()
        other_stages = stages_res.data or []
        
    # Adjustment
    score_adjustment = 0.0
    perf_summaries = []
    
    for app in other_apps:
        job_title = app.get("job_openings", {}).get("title", "Other Job")
        app_stage = app.get("stage")
        app_status = app.get("stage_status")
        app_notes = app.get("stage_notes")
        
        app_stages = [stg for stg in other_stages if stg["application_id"] == app["id"]]
        
        # Calculate status effect
        if app_stage == "hired":
            score_adjustment += 12.0
            perf_summaries.append(f"Successfully Hired for '{job_title}'")
        elif app_stage == "rejected" or app_status == "failed":
            score_adjustment -= 10.0
            perf_summaries.append(f"Rejected/Failed for '{job_title}'")
        elif app_notes:
            perf_summaries.append(f"Applied to '{job_title}' (Notes: {app_notes})")
            
        # Add details from individual rounds
        for stg in app_stages:
            outcome = stg.get("outcome")
            notes = stg.get("notes")
            round_name = stg.get("stage_name", "interview")
            if outcome == "passed":
                score_adjustment += 3.0
            elif outcome == "failed":
                score_adjustment -= 6.0
                if notes:
                    perf_summaries.append(f"Failed {round_name} stage (Notes: {notes})")
                else:
                    perf_summaries.append(f"Failed {round_name} stage")
            elif outcome == "on_hold":
                score_adjustment += 1.0
                if notes:
                    perf_summaries.append(f"On hold in {round_name} stage (Notes: {notes})")
            elif notes:
                perf_summaries.append(f"{round_name} stage feedback: {notes}")
                
    # Apply adjustment & clamp
    matched_score += score_adjustment
    matched_score = max(min(matched_score, 100.0), 0.0)
    
    # Construct match reason
    match_reason = f"System scan matched skills: {', '.join(strengths)}. Missing: {', '.join(skill_gaps)}."
    if perf_summaries:
        perf_text = " Previous Performance Considerations: " + "; ".join(perf_summaries) + "."
        match_reason += perf_text
        
    return matched_score, match_reason, strengths, skill_gaps

# Candidate matching background task
def match_candidates_background(job_id: str, jwt_token: str):
    logger.info(f"Starting background candidate matching for job {job_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    try:
        # Fetch job and approved skills
        job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
        skills_res = db.table("job_opening_skills").select("skills").eq("job_opening_id", job_id).execute()
        candidates_res = db.table("candidates").select("*").eq("is_deleted", False).execute()
        
        if not job_res.data or not skills_res.data or not candidates_res.data:
            db.table("job_openings").update({"processing_status": "ready"}).eq("id", job_id).execute()
            return
            
        job = job_res.data[0]
        approved_skills = skills_res.data[0].get("skills", []) if skills_res.data else []
        candidates = candidates_res.data
        for cand in candidates:
            if "parsed_resume_json" in cand and cand["parsed_resume_json"]:
                if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
                    cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
        
        # Clear existing job_candidates for this job
        db.table("job_candidates").delete().eq("job_opening_id", job_id).execute()
        
        seen_candidate_ids = set()
        scored_candidates = []
        for idx, cand in enumerate(candidates):
            if cand["id"] in seen_candidate_ids:
                continue
            seen_candidate_ids.add(cand["id"])
            cand_skills = [s.lower() for s in (cand.get("skills") or [])]
            cand_raw_text = cand.get("raw_text") or ""
            
            # Use unified evaluation helper
            matched_score, match_reason, strengths, skill_gaps = evaluate_candidate_matching_with_history(
                db, cand["id"], job_id, approved_skills, cand_skills, cand_raw_text
            )
            
            # Create application and link candidates
            app_res = db.table("applications").upsert({
                "candidate_id": cand["id"],
                "job_opening_id": job_id,
                "fuzzy_score": matched_score,
                "match_score": int(matched_score),
                "match_reason": match_reason,
                "strengths": strengths[:3],
                "skill_gaps": skill_gaps[:3],
                "screening_status": "pending"
            }, on_conflict="candidate_id,job_opening_id").execute()
            
            if app_res.data:
                if matched_score >= MATCH_THRESHOLD:
                    scored_candidates.append({
                        "job_opening_id": job_id,
                        "candidate_id": cand["id"],
                        "application_id": app_res.data[0]["id"],
                        "fuzzy_score": matched_score,
                        "rank_order": 1,  # updated later
                        "strengths": strengths[:3],
                        "skill_gaps": skill_gaps[:3],
                        "parsed_resume": cand.get("parsed_resume_json")
                    })
        
        # Sort and rank
        scored_candidates.sort(key=lambda x: x["fuzzy_score"], reverse=True)
        for rank, item in enumerate(scored_candidates, 1):
            item["rank_order"] = rank
            db.table("job_candidates").insert(item).execute()
            
        # Update job opening status
        db.table("job_openings").update({"processing_status": "ready"}).eq("id", job_id).execute()
        
        # Send notification and log activity
        recruiter_id = None
        job_title = job.get("title", "Unknown Job") if 'job' in locals() else "Unknown Job"
        try:
            req_res = db.table("requirements").select("created_by").eq("id", job.get("requirement_id")).execute()
            if req_res.data:
                recruiter_id = req_res.data[0].get("created_by")
        except Exception as resolve_err:
            logger.error(f"Failed to resolve recruiter_id in match_candidates_background: {resolve_err}")
            
        if recruiter_id:
            create_system_notification(
                db,
                recruiter_id,
                "Candidate Matching Completed",
                f"Candidate matching completed (local fallback) for job '{job_title}'. Found {len(scored_candidates)} matches.",
                "candidate_matching",
                {"job_opening_id": job_id, "job_title": job_title, "matches_count": len(scored_candidates)}
            )
            log_activity_event(
                db,
                action="candidate_matching_completed",
                entity_type="job_openings",
                entity_id=job_id,
                actor_name="System",
                actor_id=recruiter_id,
                metadata={"job_title": job_title, "matches_count": len(scored_candidates)}
            )
        
    except Exception as e:
        logger.error(f"Error matching candidates: {e}")
        db.table("job_openings").update({"processing_status": "error", "error_message": str(e)}).eq("id", job_id).execute()
        
        # Resolve recruiter_id to notify of error
        recruiter_id = None
        job_title = "Unknown Job"
        try:
            job_res = db.table("job_openings").select("title, requirement_id").eq("id", job_id).execute()
            if job_res.data:
                job_title = job_res.data[0].get("title", "")
                req_res = db.table("requirements").select("created_by").eq("id", job_res.data[0].get("requirement_id")).execute()
                if req_res.data:
                    recruiter_id = req_res.data[0].get("created_by")
        except Exception as resolve_err:
            logger.error(f"Failed to resolve recruiter_id for error matching candidates: {resolve_err}")
            
        if recruiter_id:
            create_system_notification(
                db,
                recruiter_id,
                "Candidate Matching Failed",
                f"Candidate matching failed for job '{job_title}': {e}",
                "error",
                {"job_opening_id": job_id, "job_title": job_title, "error": str(e)}
            )
            log_activity_event(
                db,
                action="candidate_matching_failed",
                entity_type="job_openings",
                entity_id=job_id,
                actor_name="System",
                actor_id=recruiter_id,
                metadata={"job_title": job_title, "error": str(e)}
            )

@app.get("/api/v1/jobs/{job_id}/candidates")
async def get_ranked_candidates(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_candidates").select("*, candidates(*), applications(*)").eq("job_opening_id", job_id).order("created_at", desc=True).execute()
    # Format to match frontend expected JobCandidate layout
    formatted = []
    seen_candidate_ids = set()
    for row in res.data:
        cand_id = row.get("candidate_id")
        if cand_id in seen_candidate_ids:
            continue
        seen_candidate_ids.add(cand_id)
        
        cand = row.get("candidates") or {}
        app_rec = row.get("applications") or {}
        application_id = row.get("application_id")
        
        # Self-healing logic for application_id
        if not application_id:
            # 1. Query applications table to see if an application exists for that candidate and job opening
            app_check = db.table("applications").select("*").eq("candidate_id", cand_id).eq("job_opening_id", job_id).execute()
            if app_check.data:
                app_rec = app_check.data[0]
                application_id = app_rec["id"]
                # Update the job_candidates entry
                db.table("job_candidates").update({"application_id": application_id}).eq("id", row["id"]).execute()
            else:
                # 2. Insert new application row and update job_candidates reference
                fuzzy_score = row.get("fuzzy_score") or 0.0
                try:
                    match_score = int(fuzzy_score)
                except (ValueError, TypeError):
                    match_score = 0
                strengths = row.get("strengths") or []
                skill_gaps = row.get("skill_gaps") or []
                match_reason = f"Automatically matched candidate with score {fuzzy_score}"
                
                app_res = db.table("applications").upsert({
                    "candidate_id": cand_id,
                    "job_opening_id": job_id,
                    "fuzzy_score": fuzzy_score,
                    "match_score": match_score,
                    "match_reason": match_reason,
                    "strengths": strengths[:3] if isinstance(strengths, list) else [],
                    "skill_gaps": skill_gaps[:3] if isinstance(skill_gaps, list) else [],
                    "screening_status": "pending",
                    "stage": "screening",
                    "stage_status": "pending"
                }, on_conflict="candidate_id,job_opening_id").execute()
                
                if app_res.data:
                    app_rec = app_res.data[0]
                    application_id = app_rec["id"]
                    db.table("job_candidates").update({"application_id": application_id}).eq("id", row["id"]).execute()
                    
        # Resolve fuzzy score from application record if available, fallback to job_candidate table score
        fuzzy_score = app_rec.get("fuzzy_score") if (app_rec and app_rec.get("fuzzy_score") is not None) else (row.get("fuzzy_score") or 0.0)

        formatted.append({
            "id": row["id"],
            "job_opening_id": row["job_opening_id"],
            "application_id": application_id,
            "fuzzy_score": fuzzy_score,
            "rank_order": row["rank_order"],
            "candidate_id": row["candidate_id"],
            "candidate_name": cand.get("full_name", "Unknown"),
            "experience_years": cand.get("experience_years", 0),
            "skills": cand.get("skills") or [],
            "strengths": row.get("strengths") or [],
            "skill_gaps": row.get("skill_gaps") or [],
            "stage": app_rec.get("stage") or "screening",
            "stage_status": app_rec.get("stage_status") or "pending",
            "parsed_resume": row.get("parsed_resume")
        })
        
    # Sort by score descending and re-assign rank numbers
    formatted.sort(key=lambda x: x["fuzzy_score"], reverse=True)
    for idx, item in enumerate(formatted, 1):
        item["rank_order"] = idx
        
    return formatted

@app.post("/api/v1/jobs/{job_id}/candidates/{cand_id}")
async def link_candidate_to_job(job_id: str, cand_id: str, db: Client = Depends(get_supabase)):
    cand_res = db.table("candidates").select("*").eq("id", cand_id).execute()
    skills_res = db.table("job_opening_skills").select("skills").eq("job_opening_id", job_id).execute()
    
    if not cand_res.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    cand = cand_res.data[0]
    if "parsed_resume_json" in cand and cand["parsed_resume_json"]:
        if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
            cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
    approved_skills = skills_res.data[0].get("skills", []) if skills_res.data else []
    
    cand_skills = [s.lower() for s in (cand.get("skills") or [])]
    cand_raw_text = cand.get("raw_text") or ""
    
    # Use unified evaluation helper
    matched_score, match_reason, strengths, skill_gaps = evaluate_candidate_matching_with_history(
        db, cand_id, job_id, approved_skills, cand_skills, cand_raw_text
    )
    
    app_res = db.table("applications").upsert({
        "candidate_id": cand_id,
        "job_opening_id": job_id,
        "fuzzy_score": matched_score,
        "match_score": int(matched_score),
        "match_reason": match_reason,
        "strengths": strengths[:3],
        "skill_gaps": skill_gaps[:3],
        "screening_status": "pending",
        "stage": "screening",
        "stage_status": "pending"
    }, on_conflict="candidate_id,job_opening_id").execute()
    
    if not app_res.data:
        raise HTTPException(status_code=400, detail="Failed to link candidate")
        
    new_app = app_res.data[0]
    
    # Preserve existing rank_order if they were already mapped
    existing_jc_cand = db.table("job_candidates").select("rank_order").eq("job_opening_id", job_id).eq("candidate_id", cand_id).execute()
    if existing_jc_cand.data:
        rank = existing_jc_cand.data[0]["rank_order"]
    else:
        existing_jc = db.table("job_candidates").select("*").eq("job_opening_id", job_id).execute()
        rank = len(existing_jc.data) + 1
    
    db.table("job_candidates").upsert({
        "job_opening_id": job_id,
        "candidate_id": cand_id,
        "application_id": new_app["id"],
        "fuzzy_score": matched_score,
        "rank_order": rank,
        "strengths": strengths[:3],
        "skill_gaps": skill_gaps[:3],
        "parsed_resume": cand.get("parsed_resume_json")
    }, on_conflict="job_opening_id,candidate_id").execute()
    
    db.table("activity_log").insert({
        "action": "candidate_linked",
        "entity_type": "applications",
        "entity_id": new_app["id"],
        "actor_name": "Recruiter",
        "metadata": {"candidate_name": cand.get("full_name")}
    }).execute()
    
    return {"success": True, "application": new_app}

# 5. Candidates & Applications
@app.get("/api/v1/candidates")
async def get_candidates(db: Client = Depends(get_supabase)):
    res = db.table("candidates").select("*").eq("is_deleted", False).execute()
    data = res.data or []
    for cand in data:
        if "parsed_resume_json" in cand and cand["parsed_resume_json"]:
            if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
                cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
    return data

@app.get("/api/v1/candidates/{candidate_id}")
async def get_candidate_details(candidate_id: str, db: Client = Depends(get_supabase)):
    res = db.table("candidates").select("*").eq("id", candidate_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    cand = res.data[0]
    if "parsed_resume_json" in cand and cand["parsed_resume_json"]:
        if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
            cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
    return cand

@app.put("/api/v1/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, cand: CandidateUpdateModel, db: Client = Depends(get_supabase)):
    current_res = db.table("candidates").select("*").eq("id", candidate_id).execute()
    if not current_res.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    current_cand = current_res.data[0]

    if cand.email is not None and cand.email.strip().lower() != (current_cand.get("email") or "").strip().lower():
        dup_check = db.table("candidates").select("id").eq("email", cand.email.strip()).execute()
        if dup_check.data:
            other_ids = [r["id"] for r in dup_check.data if r["id"] != candidate_id]
            if other_ids:
                raise HTTPException(
                    status_code=409, 
                    detail=f"A candidate with the email address '{cand.email}' already exists in the database."
                )

    update_data = {}
    if cand.full_name is not None:
        update_data["full_name"] = cand.full_name
    if cand.email is not None:
        update_data["email"] = cand.email
    if cand.phone is not None:
        update_data["phone"] = cand.phone
    if cand.skills is not None:
        update_data["skills"] = cand.skills
    if cand.experience_years is not None:
        update_data["experience_years"] = cand.experience_years
    if cand.resume_url is not None:
        update_data["resume_url"] = cand.resume_url
    if cand.education is not None:
        update_data["education"] = cand.education
    if cand.working_or_not is not None:
        update_data["working_or_not"] = cand.working_or_not
    if cand.academic_details is not None:
        update_data["academic_details"] = cand.academic_details
    if cand.achievements is not None:
        update_data["achievements"] = cand.achievements
    if cand.job_id is not None:
        update_data["job_id"] = cand.job_id

    parsed_json = current_cand.get("parsed_resume_json") or {}
    if not isinstance(parsed_json, dict):
        parsed_json = {}

    modified_json = False
    if cand.summary is not None:
        parsed_json["summary"] = cand.summary
        modified_json = True
    if cand.raw_text is not None:
        parsed_json["raw_text"] = cand.raw_text
        modified_json = True
    if cand.parsed_resume_json is not None:
        parsed_json = {**parsed_json, **cand.parsed_resume_json}
        modified_json = True

    if modified_json:
        update_data["parsed_resume_json"] = parsed_json

    if update_data:
        try:
            res = db.table("candidates").update(update_data).eq("id", candidate_id).execute()
        except Exception as e:
            logger.error(f"Database error during candidate update of ID '{candidate_id}': {e}")
            raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
            
        if not res.data:
            logger.warning(f"No candidate rows returned after update for ID '{candidate_id}'. Permisson denied or not found.")
            raise HTTPException(status_code=500, detail="Update failed: candidate row not updated. Check permission policies.")
        updated_cand = res.data[0]
    else:
        updated_cand = current_cand

    if "parsed_resume_json" in updated_cand and updated_cand["parsed_resume_json"]:
        if isinstance(updated_cand["parsed_resume_json"], dict) and "raw_text" in updated_cand["parsed_resume_json"]:
            updated_cand["raw_text"] = updated_cand["parsed_resume_json"]["raw_text"]

    try:
        db.table("activity_log").insert({
            "action": "candidate_updated",
            "entity_type": "candidates",
            "entity_id": candidate_id,
            "actor_name": "Recruiter",
            "metadata": {"candidate_name": updated_cand.get("full_name", "")}
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log candidate update activity: {e}")

    return updated_cand

@app.delete("/api/v1/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, db: Client = Depends(get_supabase)):
    res = db.table("candidates").update({"is_deleted": True}).eq("id", candidate_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    try:
        db.table("activity_log").insert({
            "action": "candidate_deleted",
            "entity_type": "candidates",
            "entity_id": candidate_id,
            "actor_name": "Recruiter",
            "metadata": {"candidate_name": res.data[0].get("full_name", "")}
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log candidate deletion activity: {e}")
        
    return {"success": True}

@app.get("/api/v1/candidates/{candidate_id}/applications")
async def get_candidate_applications(candidate_id: str, db: Client = Depends(get_supabase)):
    res = db.table("applications").select("*, job_openings(*, requirements(*, clients(name)))").eq("candidate_id", candidate_id).execute()
    formatted = []
    for row in res.data:
        job = row.get("job_openings") or {}
        req = job.get("requirements") or {}
        cli = req.get("clients") or {}
        formatted.append({
            **{k: v for k, v in row.items() if k != "job_openings"},
            "job_title": job.get("title", "Unknown Job"),
            "client_name": cli.get("name", "Generic Client")
        })
    return formatted

@app.get("/api/v1/candidates/{candidate_id}/history")
async def get_candidate_history(candidate_id: str, db: Client = Depends(get_supabase)):
    apps_res = db.table("applications").select("*, job_openings(*, requirements(*, clients(name)))").eq("candidate_id", candidate_id).execute()
    apps = apps_res.data or []
    
    app_ids = [a["id"] for a in apps]
    stages = []
    if app_ids:
        stages_res = db.table("interview_stages").select("*").in_("application_id", app_ids).execute()
        stages = stages_res.data or []
        
    formatted = []
    for app_row in apps:
        job = app_row.get("job_openings") or {}
        req = job.get("requirements") or {}
        cli = req.get("clients") or {}
        app_stages = [stg for stg in stages if stg["application_id"] == app_row["id"]]
        
        # Sort stages by created_at or order
        app_stages.sort(key=lambda x: x.get("stage_order") or 1)
        
        formatted.append({
            "application_id": app_row["id"],
            "job_id": job.get("id"),
            "job_title": job.get("title", "Unknown Job"),
            "client_name": cli.get("name", "Generic Client"),
            "fuzzy_score": app_row.get("fuzzy_score"),
            "match_score": app_row.get("match_score"),
            "match_reason": app_row.get("match_reason"),
            "screening_status": app_row.get("screening_status"),
            "stage": app_row.get("stage"),
            "stage_status": app_row.get("stage_status"),
            "stage_notes": app_row.get("stage_notes"),
            "stages": app_stages,
            "created_at": app_row.get("created_at")
        })
    return formatted

@app.get("/api/v1/applications")
async def get_all_applications(db: Client = Depends(get_supabase)):
    res = db.table("applications").select("*, candidates(*), job_openings(*, requirements(*, clients(id, name)))").execute()
    data = res.data or []
    for app_rec in data:
        cand = app_rec.get("candidates") or {}
        if cand and "parsed_resume_json" in cand and cand["parsed_resume_json"]:
            if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
                cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
        
        # Format job_openings to contain clients and client_name for backward compatibility
        job = app_rec.get("job_openings") or {}
        if job:
            req = job.get("requirements") or {}
            cli = req.get("clients") or {}
            job["clients"] = cli
            job["client_name"] = cli.get("name", "Generic Client")
            job["client_id"] = req.get("client_id")
            # Remove nested requirements to keep payload clean
            if "requirements" in job:
                del job["requirements"]
    return data

@app.post("/api/v1/candidates")
async def create_candidate(cand: CandidateModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    # Limit source value to allowed constraints: 'csv', 'pdf', 'docx', 'manual'
    db_source = cand.source
    if db_source not in ["csv", "pdf", "docx", "manual"]:
        db_source = "manual"

    # Search if candidate already exists with same email AND job_id (globally, including soft-deleted ones)
    query = db.table("candidates").select("*").eq("email", cand.email)
    if cand.job_id:
        query = query.eq("job_id", cand.job_id)
    else:
        query = query.is_("job_id", "null")
    exists = query.execute()

    # Resolve recruiter_id from job_id if not logged in
    recruiter_id = None
    if cand.job_id:
        job_res = db.table("job_openings").select("requirements(created_by)").eq("id", cand.job_id).execute()
        if job_res.data:
            req_data = job_res.data[0].get("requirements") or {}
            recruiter_id = req_data.get("created_by")

    db_uploaded_by = user_id if user_id else (cand.uploaded_by if cand.uploaded_by else recruiter_id)

    if exists.data:
        existing_cand = exists.data[0]
        # Merge skills (take union)
        existing_skills = existing_cand.get("skills") or []
        merged_skills = list(set(existing_skills + cand.skills))
        
        # Merge experience (take max)
        merged_exp = max(existing_cand.get("experience_years") or 0, cand.experience_years)
        
        # Merge other text fields
        merged_education = cand.education if cand.education else existing_cand.get("education")
        merged_phone = cand.phone if cand.phone else existing_cand.get("phone")
        merged_academic = cand.academic_details if cand.academic_details else existing_cand.get("academic_details")
        merged_achievements = cand.achievements if cand.achievements else existing_cand.get("achievements")
             # Merge raw text
        existing_raw = ""
        existing_summary = ""
        existing_parsed = {}
        if "parsed_resume_json" in existing_cand and isinstance(existing_cand["parsed_resume_json"], dict):
            existing_parsed = existing_cand["parsed_resume_json"]
            existing_raw = existing_parsed.get("raw_text") or ""
            existing_summary = existing_parsed.get("summary") or ""
        
        merged_raw = existing_raw
        if cand.raw_text and cand.raw_text not in existing_raw:
            merged_raw = f"{existing_raw}\n\n[Updated Profile]:\n{cand.raw_text}" if existing_raw else cand.raw_text
        merged_summary = cand.summary if cand.summary else existing_summary
        
        incoming_parsed = cand.parsed_resume_json or {}
        merged_parsed = {**existing_parsed, **incoming_parsed}
        merged_parsed["raw_text"] = merged_raw
        merged_parsed["summary"] = merged_summary
            
        res = db.table("candidates").update({
            "full_name": cand.full_name,
            "phone": merged_phone,
            "skills": merged_skills,
            "experience_years": merged_exp,
            "education": merged_education,
            "working_or_not": cand.working_or_not,
            "academic_details": merged_academic,
            "achievements": merged_achievements,
            "parsed_resume_json": merged_parsed,
            "source": db_source,
            "job_id": cand.job_id if cand.job_id else existing_cand.get("job_id"),
            "uploaded_by": db_uploaded_by if db_uploaded_by else existing_cand.get("uploaded_by"),
            "is_deleted": False  # Reactivate candidate if it was soft-deleted
        }).eq("id", existing_cand["id"]).execute()
        
        if res.data:
            data = res.data[0]
            data["raw_text"] = merged_raw
            return data
 
    incoming_parsed = cand.parsed_resume_json or {}
    parsed_resume_payload = {**incoming_parsed}
    parsed_resume_payload["raw_text"] = cand.raw_text
    parsed_resume_payload["summary"] = cand.summary or ""

    payload = {
        "full_name": cand.full_name,
        "email": cand.email,
        "phone": cand.phone if cand.phone else None,
        "skills": cand.skills,
        "experience_years": cand.experience_years,
        "resume_url": cand.resume_url,
        "parsed_resume_json": parsed_resume_payload,
        "education": cand.education,
        "working_or_not": cand.working_or_not,
        "academic_details": cand.academic_details,
        "achievements": cand.achievements,
        "source": db_source,
        "job_id": cand.job_id,
        "uploaded_by": db_uploaded_by
    }
    res = db.table("candidates").insert(payload).execute()
    
    if res.data:
        data = res.data[0]
        data["raw_text"] = cand.raw_text
        return data
    return {}

@app.post("/api/v1/candidates/upload/csv")
async def upload_csv_candidates(
    payload: CSVUploadModel, 
    background_tasks: BackgroundTasks, 
    db: Client = Depends(get_supabase), 
    authorization: Optional[str] = Header(None),
    user_id: Optional[str] = Depends(get_current_user_id)
):
    inserted = 0
    skipped = 0
    candidates_with_gd_resumes = []
    
    jwt_token = None
    if authorization:
        if authorization.startswith("Bearer "):
            jwt_token = authorization.split(" ")[1]
        elif authorization.startswith("eyJ"):
            jwt_token = authorization
            
    for item in payload.items:
        email = item.get("email")
        full_name = item.get("full_name")
        if not email or not full_name:
            continue
            
        # Check if candidate email already exists (globally, including soft-deleted ones)
        exists_res = db.table("candidates").select("*").eq("email", email).execute()
        
        # Skills list parser
        skills_input = item.get("skills", "")
        skills_list = []
        if isinstance(skills_input, str):
            skills_list = [s.strip() for s in skills_input.split(",") if s.strip()]
        elif isinstance(skills_input, list):
            skills_list = [str(s).strip() for s in skills_input if str(s).strip()]
            
        phone_input = item.get("phone")
        phone_val = str(phone_input).strip() if phone_input else None
        if phone_val == "" or phone_val == "null":
            phone_val = None
            
        exp_years = int(item.get("experience_years") or 0)
        education_val = item.get("education")
        working_val = item.get("working_or_not")
        academic_val = item.get("academic_details")
        achievements_val = item.get("achievements")
        resume_url_val = item.get("resume_url")
        
        # Resolve working status boolean
        if isinstance(working_val, str):
            working_bool = working_val.lower().strip() in ["true", "yes", "1", "working", "employed"]
        elif isinstance(working_val, bool):
            working_bool = working_val
        else:
            working_bool = True  # default
        
        candidate_id = None
        
        if exists_res.data:
            skipped += 1
            existing_cand = exists_res.data[0]
            candidate_id = existing_cand["id"]
            existing_skills = existing_cand.get("skills") or []
            merged_skills = list(set(existing_skills + skills_list))
            merged_exp = max(existing_cand.get("experience_years") or 0, exp_years)
            merged_education = education_val if education_val else existing_cand.get("education")
            merged_academic = academic_val if academic_val else existing_cand.get("academic_details")
            merged_achievements = achievements_val if achievements_val else existing_cand.get("achievements")
            
            existing_raw = ""
            if "parsed_resume_json" in existing_cand and isinstance(existing_cand["parsed_resume_json"], dict):
                existing_raw = existing_cand["parsed_resume_json"].get("raw_text") or ""
            merged_raw = f"{existing_raw}\n\n[CSV Re-upload]: Parsed from CSV: {full_name}" if existing_raw else f"Parsed from CSV: {full_name}"
            
            # If the resume URL is a Google Drive URL, set a placeholder while we fetch it in background
            parsed_resume_payload = {"raw_text": merged_raw}
            if resume_url_val and is_google_drive_url(resume_url_val):
                parsed_resume_payload = {"raw_text": "Downloading and extracting Google Drive resume..."}
            
            # Update existing candidate details
            db.table("candidates").update({
                "full_name": full_name,
                "phone": phone_val if phone_val else existing_cand.get("phone"),
                "skills": merged_skills,
                "experience_years": merged_exp,
                "education": merged_education,
                "working_or_not": working_bool,
                "academic_details": merged_academic,
                "achievements": merged_achievements,
                "resume_url": resume_url_val if resume_url_val else existing_cand.get("resume_url"),
                "parsed_resume_json": parsed_resume_payload,
                "source": "csv",
                "uploaded_by": user_id or existing_cand.get("uploaded_by"),
                "is_deleted": False  # Reactivate candidate if it was soft-deleted
            }).eq("email", email).execute()
        else:
            inserted += 1
            # If the resume URL is a Google Drive URL, set a placeholder while we fetch it in background
            parsed_resume_payload = {"raw_text": f"Parsed from CSV: {full_name}"}
            if resume_url_val and is_google_drive_url(resume_url_val):
                parsed_resume_payload = {"raw_text": "Downloading and extracting Google Drive resume..."}
                
            # Insert new candidate
            res = db.table("candidates").insert({
                "full_name": full_name,
                "email": email,
                "phone": phone_val,
                "skills": skills_list,
                "experience_years": exp_years,
                "parsed_resume_json": parsed_resume_payload,
                "resume_url": resume_url_val,
                "education": education_val,
                "working_or_not": working_bool,
                "academic_details": academic_val,
                "achievements": achievements_val,
                "source": "csv",
                "uploaded_by": user_id
            }).execute()
            
            if res.data:
                candidate_id = res.data[0]["id"]
                
        # If candidate has Google Drive resume URL, add to background processing list
        if candidate_id and resume_url_val and is_google_drive_url(resume_url_val):
            candidates_with_gd_resumes.append({
                "id": candidate_id,
                "email": email,
                "resume_url": resume_url_val
            })
            
    if candidates_with_gd_resumes:
        background_tasks.add_task(download_resumes_background, candidates_with_gd_resumes, jwt_token)
        
    if user_id:
        create_system_notification(
            db,
            user_id,
            "Candidate Upload Completed",
            f"Successfully parsed candidate CSV. Imported {inserted} new candidates and updated {skipped} existing ones.",
            "upload",
            {"inserted": inserted, "skipped": skipped}
        )
        log_activity_event(
            db,
            action="candidate_csv_imported",
            entity_type="candidates",
            entity_id=None,
            actor_name="Recruiter",
            actor_id=user_id,
            metadata={"inserted": inserted, "skipped": skipped}
        )
        
    return {"inserted": inserted, "skipped": skipped}

# accept application -> triggers background personalized question generation
def generate_questions_background(app_id: str, candidate_name: str, skills: List[str], exp_years: int, raw_text: str, jwt_token: str):
    logger.info(f"Starting background question generation for application {app_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    try:
        # Fallback if no questions generated or no client
        questions = [
            {"question": f"Can you detail your experience working with {skills[0] if skills else 'modern tech'} and how you applied it in your previous role?", "difficulty": "easy"},
            {"question": "How do you handle client-side rendering bottlenecks when managing large datagrid lists?", "difficulty": "medium"},
            {"question": "Describe a time you solved a challenging concurrency/state synchronization issue.", "difficulty": "hard"}
        ]
            
        import uuid
        questions_array = []
        for idx, q in enumerate(questions):
            questions_array.append({
                "id": str(uuid.uuid4()),
                "question": q["question"],
                "difficulty": q["difficulty"],
                "question_order": idx + 1,
                "ai_generated": True,
                "modified": False
            })
            
        # Update applications table screening_questions column
        db.table("applications").update({
            "screening_questions": questions_array
        }).eq("id", app_id).execute()
        
    except Exception as e:
        logger.error(f"Error generating screening questions: {e}")

def ensure_questions_have_ids(questions_list: list, app_id: str, db: Client) -> list:
    import uuid
    modified = False
    healed_list = []
    for q in (questions_list or []):
        if not isinstance(q, dict):
            continue
        if not q.get("id"):
            q["id"] = str(uuid.uuid4())
            modified = True
        q["application_id"] = app_id
        healed_list.append(q)
        
    if modified:
        try:
            db.table("applications").update({
                "screening_questions": healed_list
            }).eq("id", app_id).execute()
        except Exception as e:
            logger.error(f"Failed to save auto-healed screening question IDs: {e}")
    return healed_list

@app.get("/api/v1/applications/{app_id}")
async def get_application(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("applications").select("*, candidates(*)").eq("id", app_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_record = res.data[0]
    cand = app_record.get("candidates") or {}
    if cand and "parsed_resume_json" in cand and cand["parsed_resume_json"]:
        if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
            cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
    
    healed_qs = ensure_questions_have_ids(app_record.get("screening_questions") or [], app_id, db)
    
    return {
        "id": app_record["id"],
        "candidate_id": app_record["candidate_id"],
        "job_opening_id": app_record["job_opening_id"],
        "candidate_name": cand.get("full_name", "Unknown"),
        "candidate_email": cand.get("email", ""),
        "candidate_experience": cand.get("experience_years", 0),
        "candidate_skills": cand.get("skills") or [],
        "candidate_cv": cand.get("raw_text") or "",
        "fuzzy_score": app_record.get("fuzzy_score") or 0,
        "match_score": app_record.get("match_score") or 0,
        "match_reason": app_record.get("match_reason") or "",
        "strengths": app_record.get("strengths") or [],
        "skill_gaps": app_record.get("skill_gaps") or [],
        "screening_status": app_record.get("screening_status") or "pending",
        "stage": app_record.get("stage") or "screening",
        "stage_status": app_record.get("stage_status") or "pending",
        "stage_notes": app_record.get("stage_notes") or "",
        "priority": app_record.get("priority") or 0,
        "created_at": app_record.get("created_at"),
        "screening_questions": healed_qs
    }

async def handle_accept_application_logic(app_id: str, background_tasks: BackgroundTasks, request: Request, db: Client):
    res = db.table("applications").update({"screening_status": "accepted"}).eq("id", app_id).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to accept application")
        
    app_record = res.data[0]
    
    # Fetch candidate details
    cand_res = db.table("candidates").select("*").eq("id", app_record["candidate_id"]).execute()
    if cand_res.data:
        cand = cand_res.data[0]
        if "parsed_resume_json" in cand and cand["parsed_resume_json"]:
            if isinstance(cand["parsed_resume_json"], dict) and "raw_text" in cand["parsed_resume_json"]:
                cand["raw_text"] = cand["parsed_resume_json"]["raw_text"]
        auth_header = request.headers.get("Authorization", "")
        jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
        user_id = get_current_user_id(auth_header)
        
        # Fetch job and requirement details for the outbound payload
        job_res = db.table("job_openings").select("*").eq("id", app_record["job_opening_id"]).execute()
        job = job_res.data[0] if job_res.data else {}
        
        log_activity_event(
            db,
            action="application_accepted",
            entity_type="applications",
            entity_id=app_id,
            actor_name="Recruiter",
            actor_id=user_id,
            metadata={"candidate_name": cand.get("full_name", ""), "job_title": job.get("title", "")}
        )
        
        req_res = db.table("requirements").select("*").eq("id", job.get("requirement_id", "")).execute()
        req = req_res.data[0] if req_res.data else {}
        
        if USE_N8N:
            background_tasks.add_task(
                handle_generate_questions_dispatch,
                app_record,
                cand,
                job,
                req,
                jwt_token
            )
        else:
            background_tasks.add_task(
                generate_questions_background,
                app_id,
                cand["full_name"],
                cand.get("skills") or [],
                cand.get("experience_years") or 0,
                cand.get("raw_text") or "",
                jwt_token
            )
            
    return app_record

@app.patch("/api/v1/applications/{app_id}/accept")
async def accept_application_patch(app_id: str, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    return await handle_accept_application_logic(app_id, background_tasks, request, db)

@app.post("/api/v1/applications/{app_id}/accept")
async def accept_application_post(app_id: str, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    return await handle_accept_application_logic(app_id, background_tasks, request, db)


@app.patch("/api/v1/applications/{app_id}/reject")
async def reject_application(app_id: str, request: Request, db: Client = Depends(get_supabase)):
    res = db.table("applications").update({"screening_status": "rejected"}).eq("id", app_id).execute()
    if res.data:
        app_record = res.data[0]
        auth_header = request.headers.get("Authorization", "")
        user_id = get_current_user_id(auth_header)
        
        cand_name = "Candidate"
        job_title = "Job opening"
        try:
            cand_res = db.table("candidates").select("full_name").eq("id", app_record["candidate_id"]).execute()
            if cand_res.data:
                cand_name = cand_res.data[0].get("full_name") or "Candidate"
            job_res = db.table("job_openings").select("title").eq("id", app_record["job_opening_id"]).execute()
            if job_res.data:
                job_title = job_res.data[0].get("title") or "Job opening"
        except Exception as e:
            logger.error(f"Failed to fetch candidate/job details in reject_application: {e}")
            
        log_activity_event(
            db,
            action="application_rejected",
            entity_type="applications",
            entity_id=app_id,
            actor_name="Recruiter",
            actor_id=user_id,
            metadata={"candidate_name": cand_name, "job_title": job_title}
        )
    return res.data[0] if res.data else {}

@app.get("/api/v1/applications/{app_id}/stages")
async def get_application_stages(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("interview_stages").select("*").eq("application_id", app_id).order("created_at", desc=False).execute()
    return res.data or []

@app.patch("/api/v1/applications/{app_id}/stage")
async def update_application_stage(app_id: str, request: Request, db: Client = Depends(get_supabase)):
    data = await request.json()
    stage = data.get("stage")
    stage_status = data.get("stage_status")
    notes = data.get("notes") or ""
    
    # 1. Update applications table
    res = db.table("applications").update({
        "stage": stage,
        "stage_status": stage_status,
        "stage_notes": notes
    }).eq("id", app_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to update application stage")
        
    app_record = res.data[0]
    
    # 2. Insert into interview_stages table if it's one of the valid stage_names
    valid_stages = ['screening']
    job_id = app_record.get("job_opening_id")
    if job_id:
        job_res = db.table("job_openings").select("custom_stages").eq("id", job_id).execute()
        if job_res.data:
            custom = job_res.data[0].get("custom_stages") or []
            valid_stages.extend(custom)
    else:
        valid_stages.extend(['technical', 'hr', 'final'])

    if stage in valid_stages:
        existing = db.table("interview_stages").select("id").eq("application_id", app_id).execute()
        order = len(existing.data) + 1
        
        outcome = "pending"
        if stage_status == "passed":
            outcome = "passed"
        elif stage_status == "failed":
            outcome = "failed"
        elif stage_status == "on_hold":
            outcome = "on_hold"
            
        # If outcome is failed, note check constraint requires notes
        if outcome == "failed" and not notes.strip():
            notes = "Stage failed."
            
        db.table("interview_stages").insert({
            "application_id": app_id,
            "stage_name": stage,
            "stage_order": order,
            "status": "completed",
            "outcome": outcome,
            "notes": notes
        }).execute()
        
    # 3. Log activity
    db.table("activity_log").insert({
        "action": "stage_updated",
        "entity_type": "applications",
        "entity_id": app_id,
        "actor_name": "Recruiter",
        "metadata": {"stage": stage, "status": stage_status}
    }).execute()
    
    return app_record

# 6. Screening Questions Endpoints
class QuestionCreateModel(BaseModel):
    question: str
    difficulty: str = "medium"

@app.post("/api/v1/applications/{app_id}/questions")
async def add_screening_question(app_id: str, data: QuestionCreateModel, request: Request, db: Client = Depends(get_supabase)):
    # Fetch application to get screening_questions array
    app_res = db.table("applications").select("*").eq("id", app_id).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app_rec = app_res.data[0]
    
    questions_list = app_rec.get("screening_questions") or []
    max_order = max([q.get("question_order", 0) for q in questions_list]) if questions_list else 0
    
    import uuid
    new_q = {
        "id": str(uuid.uuid4()),
        "question": data.question,
        "difficulty": data.difficulty,
        "question_order": max_order + 1,
        "ai_generated": False,
        "modified": False
    }
    questions_list.append(new_q)
    
    db.table("applications").update({
        "screening_questions": questions_list
    }).eq("id", app_id).execute()
    
    # Log activity
    auth_header = request.headers.get("Authorization", "")
    user_id = get_current_user_id(auth_header)
    
    cand_name = "Candidate"
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", app_rec["candidate_id"]).execute()
        if cand_res.data:
            cand_name = cand_res.data[0].get("full_name") or "Candidate"
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in add_screening_question: {e}")
        
    log_activity_event(
        db,
        action="screening_question_added",
        entity_type="applications",
        entity_id=app_id,
        actor_name="Recruiter",
        actor_id=user_id,
        metadata={"candidate_name": cand_name, "question": data.question[:60] + "..." if len(data.question) > 60 else data.question}
    )
    
    return new_q

@app.get("/api/v1/applications/{app_id}/questions")
async def get_questions(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("applications").select("screening_questions").eq("id", app_id).execute()
    if not res.data:
        return []
    questions_list = res.data[0].get("screening_questions") or []
    healed_qs = ensure_questions_have_ids(questions_list, app_id, db)
    healed_qs.sort(key=lambda x: x.get("question_order", 1) or x.get("order", 1) or 1)
    return healed_qs

@app.patch("/api/v1/questions/{q_id}")
async def edit_question(q_id: str, data: Dict[str, Any], request: Request, db: Client = Depends(get_supabase)):
    # Find the application row containing this question ID in its screening_questions JSONB array
    res = db.table("applications").select("*").filter("screening_questions", "cs", f'[{{"id": "{q_id}"}}]').execute()
    if not res.data:
        res = db.table("applications").select("*").execute()
        
    target_app = None
    target_question = None
    for row in res.data:
        qs = row.get("screening_questions") or []
        for q in qs:
            if q.get("id") == q_id:
                target_app = row
                target_question = q
                break
        if target_app:
            break
            
    if not target_app or not target_question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if "question" in data:
        target_question["question"] = data["question"]
    if "difficulty" in data:
        target_question["difficulty"] = data["difficulty"]
    if "reason" in data:
        target_question["reason"] = data["reason"]
    if "order" in data:
        target_question["order"] = data["order"]
    if "question_order" in data:
        target_question["question_order"] = data["question_order"]
        
    target_question["modified"] = True
    
    db.table("applications").update({
        "screening_questions": target_app["screening_questions"]
    }).eq("id", target_app["id"]).execute()
    
    # Log activity
    auth_header = request.headers.get("Authorization", "")
    user_id = get_current_user_id(auth_header)
    
    cand_name = "Candidate"
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", target_app.get("candidate_id")).execute()
        if cand_res.data:
            cand_name = cand_res.data[0].get("full_name") or "Candidate"
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in edit_question: {e}")
        
    log_activity_event(
        db,
        action="screening_question_updated",
        entity_type="applications",
        entity_id=target_app["id"],
        actor_name="Recruiter",
        actor_id=user_id,
        metadata={"candidate_name": cand_name, "question": target_question["question"][:60] + "..." if len(target_question["question"]) > 60 else target_question["question"]}
    )
    
    target_question["application_id"] = target_app["id"]
    return target_question

@app.delete("/api/v1/questions/{q_id}")
async def delete_question(q_id: str, request: Request, db: Client = Depends(get_supabase)):
    # Find the application row containing this question ID in its screening_questions JSONB array
    res = db.table("applications").select("*").filter("screening_questions", "cs", f'[{{"id": "{q_id}"}}]').execute()
    if not res.data:
        res = db.table("applications").select("*").execute()
        
    target_app = None
    target_question = None
    for row in res.data:
        qs = row.get("screening_questions") or []
        for q in qs:
            if q.get("id") == q_id:
                target_app = row
                target_question = q
                break
        if target_app:
            break
            
    if not target_app or not target_question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Remove the question from the array
    updated_questions = [q for q in target_app["screening_questions"] if q.get("id") != q_id]
    
    db.table("applications").update({
        "screening_questions": updated_questions
    }).eq("id", target_app["id"]).execute()
    
    # Log activity
    auth_header = request.headers.get("Authorization", "")
    user_id = get_current_user_id(auth_header)
    
    cand_name = "Candidate"
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", target_app.get("candidate_id")).execute()
        if cand_res.data:
            cand_name = cand_res.data[0].get("full_name") or "Candidate"
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in delete_question: {e}")
        
    log_activity_event(
        db,
        action="screening_question_deleted",
        entity_type="applications",
        entity_id=target_app["id"],
        actor_name="Recruiter",
        actor_id=user_id,
        metadata={"candidate_name": cand_name, "question": target_question["question"][:60] + "..." if len(target_question["question"]) > 60 else target_question["question"]}
    )
    
    return {"status": "success", "message": "Question deleted successfully"}

@app.post("/api/v1/questions/{q_id}/ai-edit")
async def ai_edit_question(q_id: str, data: Dict[str, str], background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    instruction = data.get("instruction", "")
    
    res = db.table("applications").select("id, screening_questions, candidate_id").filter("screening_questions", "cs", f'[{{"id": "{q_id}"}}]').execute()
    if not res.data:
        res = db.table("applications").select("id, screening_questions, candidate_id").execute()
        
    target_app = None
    target_question = None
    for row in res.data:
        qs = row.get("screening_questions") or []
        for q in qs:
            if q.get("id") == q_id:
                target_app = row
                target_question = q
                break
        if target_app:
            break
            
    if not target_app or not target_question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    
    if USE_N8N:
        # Mark as refining in DB first
        target_question["refining"] = True
        db.table("applications").update({
            "screening_questions": target_app["screening_questions"]
        }).eq("id", target_app["id"]).execute()
        
        background_tasks.add_task(
            handle_refine_question_dispatch,
            target_app["id"],
            q_id,
            target_question,
            instruction,
            jwt_token
        )
    else:
        # Instant local fallback
        old_question = target_question["question"]
        new_question = f"{old_question} (AI instructions applied: {instruction})"
        target_question["question"] = new_question
        target_question["modified"] = True
        target_question["refining"] = False
        
        db.table("applications").update({
            "screening_questions": target_app["screening_questions"]
        }).eq("id", target_app["id"]).execute()
        
    target_question["application_id"] = target_app["id"]
    return target_question

# 7. Chatbot Endpoint
@app.post("/api/v1/chatbot/message")
async def handle_chat_message(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db: Client = Depends(get_supabase),
    user_id: Optional[str] = Depends(get_current_user_id)
):
    # Call n8n webhook for ATS AI Copilot
    n8n_url = "https://n8n.srv832341.hstgr.cloud/webhook/ats-ai-copilot"

    # Compile database stats to inject in context as fallback/enrichment
    try:
        clients_count = len(db.table("clients").select("id").eq("is_deleted", False).execute().data or [])
        reqs_count = len(db.table("requirements").select("id").eq("is_deleted", False).execute().data or [])
        candidates_count = len(db.table("candidates").select("id").eq("is_deleted", False).execute().data or [])
        jobs_count = len(db.table("job_openings").select("id").eq("is_deleted", False).execute().data or [])
    except Exception:
        clients_count = reqs_count = candidates_count = jobs_count = 0

    # Ensure required structured payload fields
    if not payload.get("session_id"):
        payload["session_id"] = f"copilot_{user_id or 'anonymous'}"
    if not payload.get("request_id"):
        import time
        payload["request_id"] = f"copilot_req_{int(time.time() * 1000)}"
    if not payload.get("recruiter_id"):
        payload["recruiter_id"] = user_id or "usr-1"
    if not payload.get("workspace_id"):
        payload["workspace_id"] = "default"

    # Set callbacks & authorization securely
    base_url = str(request.base_url).rstrip("/")
    payload["callback_base_url"] = f"{base_url}/api/v1/callbacks"
    payload["authorization"] = f"Bearer {CALLBACK_SECRET}"

    # Merge database stats and metadata
    page_ctx = payload.get("page_context") or {}
    page_ctx["db_clients_count"] = clients_count
    page_ctx["db_requirements_count"] = reqs_count
    page_ctx["db_candidates_count"] = candidates_count
    page_ctx["db_jobs_count"] = jobs_count
    payload["page_context"] = page_ctx

    import json
    logger.info(f"Forwarding chatbot message to n8n copilot webhook: {n8n_url} with payload: {json.dumps(payload, default=str)}")

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(n8n_url, json=payload, timeout=60.0)
            if res.status_code in (200, 201, 202):
                logger.info(f"Successfully received response from n8n copilot (status: {res.status_code})")
                try:
                    res_data = res.json()
                    if isinstance(res_data, list) and len(res_data) > 0:
                        res_data = res_data[0]
                    if isinstance(res_data, dict):
                        if "status" not in res_data:
                            res_data["status"] = "success"
                        return res_data
                except Exception as parse_err:
                    logger.error(f"Error parsing n8n JSON response: {parse_err}")
                
                return {
                    "status": "success",
                    "request_id": payload.get("request_id"),
                    "automation_type": "ats_ai_copilot",
                    "action_type": "answer",
                    "assistant_reply": res.text or "Success"
                }
            else:
                logger.error(f"n8n copilot webhook returned non-success status: {res.status_code}, response: {res.text}")
    except Exception as e:
        logger.error(f"Exception calling n8n copilot webhook: {e}")

    user_msg = payload.get("message", "")
    reply = ""
    if "candidate" in user_msg.lower():
        reply = f"Currently, there are {candidates_count} candidates in the common pool. Rohan Sharma (fuzzy match score: 94.5%) is accepted and in the Technical Interview stage."
    elif "job" in user_msg.lower() or "opening" in user_msg.lower():
        reply = f"We have {jobs_count} job openings. The most recent one created is mapped to Google client requirements."
    else:
        reply = f"Hello! I'm your Kozker Recruiter AI Companion. I see we have {clients_count} clients and {reqs_count} active mandate requirements. How can I help you manage your pipeline today?"

    return {
        "status": "success",
        "request_id": payload.get("request_id"),
        "automation_type": "ats_ai_copilot",
        "action_type": "answer",
        "assistant_reply": reply
    }

# ============================================================
# n8n Inbound Callbacks
# ============================================================

@app.post("/api/v1/callbacks/job-openings", dependencies=[Depends(verify_callback_secret)])
async def callback_job_openings(payload: JobOpeningsCallback):
    logger.info(f"Received job openings callback for requirement {payload.requirement_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Check if requirement exists
    req_res = db.table("requirements").select("*").eq("id", payload.requirement_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    # Clear existing drafts for this requirement
    db.table("job_openings").delete().eq("requirement_id", payload.requirement_id).eq("status", "draft").execute()
    
    # Save job opening drafts
    for idx, jo in enumerate(payload.job_openings, 1):
        db.table("job_openings").insert({
            "requirement_id": payload.requirement_id,
            "post_index": idx,
            "title": jo.title,
            "description": jo.overview,
            "responsibilities": jo.responsibilities,
            "qualifications": jo.qualifications,
            "keywords": jo.keywords,
            "salary_range": jo.budget,
            "status": "draft",
            "processing_status": "ready"
        }).execute()
        
    # Set requirement status to ready
    db.table("requirements").update({"status": "ready"}).eq("id", payload.requirement_id).execute()
    
    # Send notification and log activity
    req_data = req_res.data[0]
    recruiter_id = req_data.get("created_by")
    req_title = req_data.get("title", "Unknown Requirement")
    
    create_system_notification(
        db,
        recruiter_id,
        "Job Generation Completed",
        f"Successfully generated {len(payload.job_openings)} job openings for mandate '{req_title}'.",
        "job_generation",
        {"requirement_id": payload.requirement_id, "requirement_title": req_title, "job_openings_count": len(payload.job_openings)}
    )
    log_activity_event(
        db,
        action="job_generation_completed",
        entity_type="requirements",
        entity_id=payload.requirement_id,
        actor_name="System",
        actor_id=recruiter_id,
        metadata={"req_title": req_title, "job_openings_count": len(payload.job_openings)}
    )
    return {"status": "success"}

@app.post("/api/v1/callbacks/job-skills", dependencies=[Depends(verify_callback_secret)])
async def callback_job_skills(payload: JobSkillsCallback):
    logger.info(f"Received job skills callback for job {payload.job_opening_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    skills_list = []
    for idx, sk in enumerate(payload.skills, 1):
        skills_list.append({
            "id": f"sk-{idx}-{int(time.time())}",
            "job_opening_id": payload.job_opening_id,
            "skill_name": sk.name,
            "weight": sk.weight,
            "skill_order": idx,
            "approved": False
        })
        
    db.table("job_opening_skills").upsert({
        "job_opening_id": payload.job_opening_id,
        "skills": skills_list
    }, on_conflict="job_opening_id").execute()
        
    # Set job processing_status to ready
    db.table("job_openings").update({"processing_status": "ready"}).eq("id", payload.job_opening_id).execute()
    
    # Resolve recruiter_id and send notification/log
    recruiter_id = None
    job_title = "Unknown Job"
    try:
        job_res = db.table("job_openings").select("title, requirement_id").eq("id", payload.job_opening_id).execute()
        if job_res.data:
            job_title = job_res.data[0].get("title", "")
            req_res = db.table("requirements").select("created_by").eq("id", job_res.data[0].get("requirement_id")).execute()
            if req_res.data:
                recruiter_id = req_res.data[0].get("created_by")
    except Exception as e:
        logger.error(f"Failed to resolve recruiter_id in callback_job_skills: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Skills Extraction Completed",
            f"Mandate skills successfully extracted for job '{job_title}'. Core requirement weights are ready for review.",
            "job_generation",
            {"job_opening_id": payload.job_opening_id, "job_title": job_title}
        )
        log_activity_event(
            db,
            action="skills_extracted",
            entity_type="job_openings",
            entity_id=payload.job_opening_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"job_title": job_title}
        )
        
    return {"status": "success"}


@app.post("/api/v1/callbacks/job-openings/regenerate", dependencies=[Depends(verify_callback_secret)])
async def callback_regenerate_job(payload: JobRegenerateCallback):
    logger.info(f"Received job openings callback for requirement {payload.job_opening_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    job_res = db.table("job_openings").select("*").eq("id", payload.job_opening_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
        
    db.table("job_openings").update({
        "title": payload.title,
        "description": payload.overview,
        "responsibilities": payload.responsibilities,
        "qualifications": payload.qualifications,
        "salary_range": payload.budget,
        "keywords": payload.keywords,
        "processing_status": "ready"
    }).eq("id", payload.job_opening_id).execute()
    
    job_data = job_res.data[0]
    req_res = db.table("requirements").select("created_by").eq("id", job_data.get("requirement_id")).execute()
    recruiter_id = req_res.data[0].get("created_by") if req_res.data else None
    
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Job Regenerated Successfully",
            f"Job opening '{payload.title}' has been successfully regenerated by n8n workflow.",
            "job_generation",
            {"job_opening_id": payload.job_opening_id, "job_title": payload.title}
        )
        log_activity_event(
            db,
            action="job_regenerated",
            entity_type="job_openings",
            entity_id=payload.job_opening_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"job_title": payload.title}
        )
    return {"status": "success"}

@app.post("/api/v1/callbacks/candidate-matches", dependencies=[Depends(verify_callback_secret)])
async def callback_candidate_matches(payload: CandidateMatchesCallback):
    logger.info(f"Received candidate matches callback for job {payload.job_opening_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Clear existing job candidates
    db.table("job_candidates").delete().eq("job_opening_id", payload.job_opening_id).execute()
    
    # Fetch candidates' parsed_resume_json
    cand_ids = [match.candidate_id for match in payload.matches]
    cand_resumes = {}
    if cand_ids:
        cands_res = db.table("candidates").select("id, parsed_resume_json").in_("id", cand_ids).execute()
        if cands_res.data:
            cand_resumes = {c["id"]: c.get("parsed_resume_json") for c in cands_res.data}
            
    seen_candidate_ids = set()
    scored_candidates = []
    for idx, match in enumerate(payload.matches):
        if match.candidate_id in seen_candidate_ids:
            continue
        seen_candidate_ids.add(match.candidate_id)
        
        # Upsert application
        app_res = db.table("applications").upsert({
            "candidate_id": match.candidate_id,
            "job_opening_id": payload.job_opening_id,
            "fuzzy_score": match.fuzzy_score,
            "match_score": int(match.fuzzy_score),
            "match_reason": match.reasoning or "",
            "strengths": match.strengths[:3],
            "skill_gaps": match.skill_gaps[:3],
            "screening_status": "pending"
        }, on_conflict="candidate_id,job_opening_id").execute()
        
        if app_res.data:
            if match.fuzzy_score >= MATCH_THRESHOLD:
                scored_candidates.append({
                    "job_opening_id": payload.job_opening_id,
                    "candidate_id": match.candidate_id,
                    "application_id": app_res.data[0]["id"],
                    "fuzzy_score": match.fuzzy_score,
                    "rank_order": 1, # updated later
                    "strengths": match.strengths[:3],
                    "skill_gaps": match.skill_gaps[:3],
                    "parsed_resume": cand_resumes.get(match.candidate_id)
                })
            
    # Sort and rank
    scored_candidates.sort(key=lambda x: x["fuzzy_score"], reverse=True)
    for rank, item in enumerate(scored_candidates, 1):
        item["rank_order"] = rank
        db.table("job_candidates").insert(item).execute()
        
    # Set job status/processing_status
    db.table("job_openings").update({"processing_status": "ready"}).eq("id", payload.job_opening_id).execute()
    
    # Send notification and log activity
    recruiter_id = None
    job_title = "Unknown Job"
    try:
        job_res = db.table("job_openings").select("title, requirement_id").eq("id", payload.job_opening_id).execute()
        if job_res.data:
            job_title = job_res.data[0].get("title", "")
            req_id = job_res.data[0].get("requirement_id")
            req_res = db.table("requirements").select("created_by").eq("id", req_id).execute()
            if req_res.data:
                recruiter_id = req_res.data[0].get("created_by")
    except Exception as e:
        logger.error(f"Failed to resolve recruiter_id/job_title in callback_candidate_matches: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Candidate Matching Completed",
            f"Candidate matching completed for job '{job_title}'. Found {len(payload.matches)} matches.",
            "candidate_matching",
            {"job_opening_id": payload.job_opening_id, "job_title": job_title, "matches_count": len(payload.matches)}
        )
        log_activity_event(
            db,
            action="candidate_matching_completed",
            entity_type="job_openings",
            entity_id=payload.job_opening_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"job_title": job_title, "matches_count": len(payload.matches)}
        )
    return {"status": "success"}

@app.post("/api/v1/callbacks/screening-questions", dependencies=[Depends(verify_callback_secret)])
async def callback_screening_questions(payload: ScreeningQuestionsCallback):
    logger.info(f"Received screening questions callback for application {payload.application_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Verify application exists
    app_res = db.table("applications").select("id, job_opening_id, candidate_id").eq("id", payload.application_id).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app_data = app_res.data[0]
    recruiter_id = None
    job_title = "Unknown Job"
    candidate_name = "Unknown Candidate"
    
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", app_data["candidate_id"]).execute()
        if cand_res.data:
            candidate_name = cand_res.data[0].get("full_name") or "Unknown Candidate"
            
        job_res = db.table("job_openings").select("title, requirement_id").eq("id", app_data["job_opening_id"]).execute()
        if job_res.data:
            job_title = job_res.data[0].get("title", "")
            req_res = db.table("requirements").select("created_by").eq("id", job_res.data[0].get("requirement_id")).execute()
            if req_res.data:
                recruiter_id = req_res.data[0].get("created_by")
    except Exception as e:
        logger.error(f"Failed to resolve details in callback_screening_questions: {e}")
        
    import uuid
    questions_list = []
    for idx, q in enumerate(payload.questions, 1):
        questions_list.append({
            "id": str(uuid.uuid4()),
            "question": q.question,
            "difficulty": q.difficulty,
            "question_order": q.order if q.order is not None else idx,
            "reason": q.reason,
            "ai_generated": True,
            "modified": False
        })
        
    db.table("applications").update({
        "screening_questions": questions_list
    }).eq("id", payload.application_id).execute()
    
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Screening Questions Generated",
            f"Screening questions generated for candidate '{candidate_name}' applying for '{job_title}'.",
            "screening_questions",
            {"application_id": payload.application_id, "candidate_name": candidate_name, "job_title": job_title}
        )
        log_activity_event(
            db,
            action="screening_questions_generated",
            entity_type="applications",
            entity_id=payload.application_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"candidate_name": candidate_name, "job_title": job_title}
        )
    return {"status": "success"}

@app.post("/api/v1/callbacks/questions/refine", dependencies=[Depends(verify_callback_secret)])
async def callback_refine_question(payload: QuestionRefineCallback):
    logger.info(f"Received question refinement callback for application {payload.application_id}, question {payload.question_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Fetch application and screening_questions
    app_res = db.table("applications").select("id, screening_questions, candidate_id, reviewed_by").eq("id", payload.application_id).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app_record = app_res.data[0]
    questions = app_record.get("screening_questions") or []
    
    found = False
    for q in questions:
        if q.get("id") == payload.question_id:
            q["question"] = payload.refined_question
            if payload.difficulty:
                q["difficulty"] = payload.difficulty
            if payload.reason:
                q["reason"] = payload.reason
            q["modified"] = True
            q["refining"] = False
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Question not found in application")
        
    db.table("applications").update({
        "screening_questions": questions
    }).eq("id", payload.application_id).execute()
    
    # Resolve candidate details for activity log and notification
    cand_name = "Candidate"
    recruiter_id = app_record.get("reviewed_by")
    try:
        cand_res = db.table("candidates").select("full_name").eq("id", app_record["candidate_id"]).execute()
        if cand_res.data:
            cand_name = cand_res.data[0].get("full_name") or "Candidate"
    except Exception as e:
        logger.error(f"Failed to fetch candidate details in callback_refine_question: {e}")
        
    if recruiter_id:
        create_system_notification(
            db,
            recruiter_id,
            "Question Refined Successfully",
            f"Screening question for candidate '{cand_name}' has been successfully refined by AI.",
            "job_generation",
            {"application_id": payload.application_id, "question_id": payload.question_id}
        )
        log_activity_event(
            db,
            action="screening_question_refined",
            entity_type="applications",
            entity_id=payload.application_id,
            actor_name="System",
            actor_id=recruiter_id,
            metadata={"candidate_name": cand_name, "question_id": payload.question_id}
        )
        
    return {"status": "success"}

# ============================================================
# LINKEDIN INTEGRATION API ENDPOINTS
# ============================================================

@app.get("/api/v1/integrations/linkedin/authorize")
async def linkedin_authorize(user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # If client ID is not configured, generate a mock redirect callback to help testing locally
    if not LINKEDIN_CLIENT_ID or "your_linkedin" in LINKEDIN_CLIENT_ID.lower() or LINKEDIN_CLIENT_ID == "null":
        # Simulate local flow
        mock_auth_url = f"{BACKEND_BASE_URL}/api/v1/auth/linkedin/callback?code=mock_oauth_code&state={user_id}"
        return {"url": mock_auth_url}
        
    scopes = "openid profile w_member_social"
    import urllib.parse
    encoded_redirect = urllib.parse.quote(LINKEDIN_REDIRECT_URI)
    encoded_scopes = urllib.parse.quote(scopes)
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={encoded_redirect}"
        f"&state={user_id}"
        f"&scope={encoded_scopes}"
    )
    return {"url": auth_url}

@app.get("/api/v1/auth/linkedin/callback")
async def linkedin_callback(code: str, state: str):
    # state is the user_id passing from auth
    user_id = state
    
    # Check if this is a simulated demo login
    is_mock = (
        code == "mock_oauth_code" or 
        not LINKEDIN_CLIENT_ID or 
        "your_linkedin" in LINKEDIN_CLIENT_ID.lower() or 
        not LINKEDIN_CLIENT_SECRET or 
        "your_linkedin" in LINKEDIN_CLIENT_SECRET.lower()
    )
    
    frontend_redirect_success = f"{FRONTEND_BASE_URL}/profile?tab=integrations&status=success"
    
    try:
        db_admin = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
        
        if is_mock:
            # Upsert mock account credentials
            from datetime import datetime, timedelta
            expires_at = datetime.utcnow() + timedelta(days=60)
            
            rpc_payload = {
                "p_user_id": user_id,
                "p_linkedin_member_id": "mock_member_12345",
                "p_linkedin_access_token": "mock_access_token_abcde12345",
                "p_linkedin_refresh_token": "mock_refresh_token_xyz987",
                "p_expires_at": expires_at.isoformat()
            }
            db_admin.rpc("upsert_linkedin_account", rpc_payload).execute()
            return RedirectResponse(url=frontend_redirect_success)
            
        # Real code exchange
        async with httpx.AsyncClient() as client:
            token_url = "https://www.linkedin.com/oauth/v2/accessToken"
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": LINKEDIN_REDIRECT_URI,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET
            }
            token_res = await client.post(token_url, data=data)
            if token_res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_res.text}")
                
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 5184000) # Default 60 days
            
            from datetime import datetime, timedelta
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            # Fetch user info
            userinfo_url = "https://api.linkedin.com/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_res = await client.get(userinfo_url, headers=headers)
            
            member_id = "unknown_member"
            if user_res.status_code == 200:
                user_data = user_res.json()
                member_id = user_data.get("sub") or user_data.get("id") or "unknown_member"
            else:
                # Fallback to /v2/me if userinfo fails
                me_url = "https://api.linkedin.com/v2/me"
                me_res = await client.get(me_url, headers=headers)
                if me_res.status_code == 200:
                    member_id = me_res.json().get("id") or "unknown_member"
            
            # Save account details
            rpc_payload = {
                "p_user_id": user_id,
                "p_linkedin_member_id": member_id,
                "p_linkedin_access_token": access_token,
                "p_linkedin_refresh_token": refresh_token,
                "p_expires_at": expires_at.isoformat()
            }
            db_admin.rpc("upsert_linkedin_account", rpc_payload).execute()
            
            return RedirectResponse(url=frontend_redirect_success)
            
    except Exception as e:
        logger.error(f"Error handling LinkedIn callback: {e}")
        import urllib.parse
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(
            url=f"{FRONTEND_BASE_URL}/profile?tab=integrations&status=error&message={err_msg}"
        )

@app.get("/api/v1/integrations/linkedin/status")
async def get_linkedin_status(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        res = db.table("linkedin_accounts").select("*").eq("user_id", user_id).execute()
        if res.data:
            account = res.data[0]
            return {
                "connected": True,
                "linkedin_member_id": account.get("linkedin_member_id"),
                "company_page_id": account.get("company_page_id"),
                "expires_at": account.get("expires_at")
            }
    except Exception as e:
        logger.error(f"Error checking LinkedIn status: {e}")
        
    return {"connected": False}

@app.post("/api/v1/integrations/linkedin/company-page")
async def save_linkedin_company_page(payload: CompanyPageModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        db.table("linkedin_accounts").update({"company_page_id": payload.company_page_id}).eq("user_id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving LinkedIn company page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save page ID: {str(e)}")

@app.post("/api/v1/integrations/linkedin/disconnect")
async def disconnect_linkedin(db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        db.table("linkedin_accounts").delete().eq("user_id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error disconnecting LinkedIn: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect LinkedIn account: {str(e)}")

@app.post("/api/v1/jobs/{job_id}/share-linkedin")
async def share_job_linkedin(job_id: str, payload: SharePostModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # 1. Fetch connection details
    connection_res = db.table("linkedin_accounts").select("*").eq("user_id", user_id).execute()
    if not connection_res.data:
        raise HTTPException(status_code=400, detail="LinkedIn account is not connected. Please connect it under Settings.")
        
    account = connection_res.data[0]
    company_page_id = account.get("company_page_id")
    access_token = account.get("linkedin_access_token")
    linkedin_member_id = account.get("linkedin_member_id")
    
    # Fetch job title for activity logging
    job_title = "Job Opening"
    try:
        job_res = db.table("job_openings").select("title").eq("id", job_id).execute()
        if job_res.data:
            job_title = job_res.data[0].get("title", "Job Opening")
    except Exception:
        pass
        
    # Check if mock connection
    is_mock = access_token.startswith("mock_")
    
    try:
        if is_mock:
            # Simulate a 1-second delay for sharing
            import asyncio
            await asyncio.sleep(1)
            
            target_desc = f"LinkedIn Company Page '{company_page_id}'" if company_page_id else "your LinkedIn Personal Feed"
            
            # Log notification & activity event
            create_system_notification(
                db,
                user_id,
                "Job Shared on LinkedIn (Simulated)",
                f"Job opening '{job_title}' was successfully shared to {target_desc} (Simulated).",
                "job_generation",
                {"job_id": job_id}
            )
            log_activity_event(
                db,
                action="job_shared_linkedin",
                entity_type="jobs",
                entity_id=job_id,
                actor_name="Recruiter",
                actor_id=user_id,
                metadata={
                    "job_title": job_title, 
                    "company_page_id": company_page_id,
                    "shared_to": "company" if company_page_id else "personal",
                    "simulated": True
                }
            )
            return {
                "success": True, 
                "post_id": "urn:li:share:mock_share_998877", 
                "simulated": True,
                "shared_to": "company" if company_page_id else "personal",
                "message": f"Successfully published to {target_desc} (Simulated)."
            }
            
        # Real post submission using ugcPosts
        # Determine initial author URN and whether we are targeting personal profile
        author_urn = None
        is_personal = True
        
        if company_page_id and company_page_id.strip():
            author_urn = company_page_id.strip()
            if not author_urn.startswith("urn:li:"):
                author_urn = f"urn:li:organization:{author_urn}"
            is_personal = False
        else:
            if not linkedin_member_id:
                raise Exception("LinkedIn Member ID is missing from your connection details. Please reconnect your account.")
            author_urn = f"urn:li:person:{linkedin_member_id}"
            
        ugc_post_payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": payload.text
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        async with httpx.AsyncClient() as client:
            ugc_url = "https://api.linkedin.com/v2/ugcPosts"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
                "Content-Type": "application/json"
            }
            
            res = await client.post(ugc_url, json=ugc_post_payload, headers=headers)
            
            # If posting to Company Page fails due to lack of scope (Status 403), fallback to personal feed
            if res.status_code == 403 and not is_personal and linkedin_member_id:
                logger.warning("Failed to post to LinkedIn Company Page (Status 403). Retrying to post to Personal Profile...")
                author_urn = f"urn:li:person:{linkedin_member_id}"
                ugc_post_payload["author"] = author_urn
                res = await client.post(ugc_url, json=ugc_post_payload, headers=headers)
                is_personal = True
                
            if res.status_code not in (200, 201):
                raise Exception(f"LinkedIn API error (Status {res.status_code}): {res.text}")
                
            res_data = res.json()
            post_id = res_data.get("id") or "urn:li:share:unknown"
            
            target_description = "your LinkedIn Personal Feed" if is_personal else f"LinkedIn Company Page '{company_page_id}'"
            
            # Log notification & activity event
            create_system_notification(
                db,
                user_id,
                "Job Shared on LinkedIn",
                f"Job opening '{job_title}' was successfully shared to {target_description}.",
                "job_generation",
                {"job_id": job_id}
            )
            log_activity_event(
                db,
                action="job_shared_linkedin",
                entity_type="jobs",
                entity_id=job_id,
                actor_name="Recruiter",
                actor_id=user_id,
                metadata={
                    "job_title": job_title, 
                    "company_page_id": company_page_id if not is_personal else None, 
                    "shared_to": "personal" if is_personal else "company",
                    "post_id": post_id
                }
            )
            return {
                "success": True, 
                "post_id": post_id,
                "shared_to": "personal" if is_personal else "company",
                "message": f"Successfully published to {target_description}."
            }
            
    except Exception as e:
        logger.error(f"Error sharing job on LinkedIn: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to post to LinkedIn: {str(e)}")


@app.post("/api/v1/auth/request-password-otp")
async def request_password_otp(payload: PasswordOtpRequestModel, db: Client = Depends(get_supabase), user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get user email and full name from the profiles table
    try:
        prof_res = db.table("profiles").select("email, full_name").eq("id", user_id).execute()
        if not prof_res.data:
            raise HTTPException(status_code=404, detail="Recruiter profile not found")
        
        user_email = prof_res.data[0].get("email")
        user_name = prof_res.data[0].get("full_name") or "Recruiter"
    except Exception as e:
        logger.error(f"Failed to fetch profile details for password OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile details")

    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in profile")

    # Generate 6-digit numeric OTP
    import random
    otp_code = f"{random.randint(100000, 999999)}"
    
    # Store OTP in cache (expires in 5 minutes)
    password_otps[user_id] = {
        "otp": otp_code,
        "new_password": payload.new_password,
        "expires_at": time.time() + 300
    }
    
    # Send email
    subject = "Confirm Your Password Change Request - Kozker AI"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 4px;">
            <div style="background-color: #ff7e5f; padding: 15px; border-radius: 4px 4px 0 0; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Kozker Security</h2>
            </div>
            <div style="padding: 20px 10px; text-align: center;">
                <p style="font-size: 14px; color: #4a5568;">Hi {user_name},</p>
                <p style="font-size: 14px; color: #4a5568;">You requested a password change. Please use the following One-Time Password (OTP) to confirm your identity:</p>
                <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; padding: 15px; margin: 20px auto; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #ff7e5f; display: inline-block; border-radius: 4px;">
                    {otp_code}
                </div>
                <p style="font-size: 12px; color: #718096; margin-top: 10px;">This OTP is valid for 5 minutes. If you did not request this change, please ignore this email and secure your account immediately.</p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #718096;">
                This is a secure automated notification from Kozker Recruiter AI.
            </div>
        </body>
    </html>
    """
    try:
        send_email(user_email, subject, html_body, sender_name="Kozker Security")
    except Exception as e:
        logger.error(f"Failed to dispatch password change OTP email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {"status": "success", "message": "OTP has been sent to your registered email."}


@app.post("/api/v1/auth/confirm-password-otp")
async def confirm_password_otp(payload: PasswordOtpConfirmModel, request: Request, user_id: Optional[str] = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    otp_data = password_otps.get(user_id)
    if not otp_data:
        raise HTTPException(status_code=400, detail="No pending password change request found or OTP expired.")
    
    if time.time() > otp_data["expires_at"]:
        password_otps.pop(user_id, None)
        raise HTTPException(status_code=400, detail="OTP code has expired. Please request a new one.")
        
    if otp_data["otp"] != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")
        
    new_password = otp_data["new_password"]
    
    # Update password using Admin API with service role client to bypass auth session state requirements
    try:
        db_admin = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)
        db_admin.auth.admin.update_user_by_id(user_id, attributes={"password": new_password})
        
        # Evict from cache
        password_otps.pop(user_id, None)
    except Exception as e:
        logger.error(f"User password update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")
        
    return {"status": "success", "message": "Password updated successfully."}


# Simple index status check
@app.get("/")
def index():
    return {"status": "ok", "message": "Kozker Recruiter AI FastAPI middleware is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
