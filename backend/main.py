import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Startup Analysis Agent")

# System Prompt
PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", """
You are a startup evaluation expert.

Analyze the provided startup information and predict the probability of success.
Consider:
- Market opportunity
- Product differentiation
- Business model
- Founder info
- Financial and scalability potential

Return your answer in the following format:

Success Probability: <number between 0 and 100> %
Reasoning:
- Market:
- Product:
- Founder info:
- Risks:
- Overall Verdict:

Use only the given context.
{context}
"""),
    ("human", "Analyze the startup and predict its success rate.")
])

# Request Model
class StartupRequest(BaseModel):
    prompt: str

# Logic Function
async def analyze_startup(content: str) -> str:
    # Check for API Key per request
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found. Please set it in the .env file.")

    # Initialize LLM and Embeddings per request (or you could use lru_cache for performance)
    llm = ChatOpenAI(
        model="gpt-4o",
        api_key=api_key,
        temperature=0.3
    )
    embeddings = OpenAIEmbeddings(api_key=api_key)

    # manual text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    
    # Create Document object since text_splitter expects docs or text chunks
    docs = [Document(page_content=content)]
    chunks = text_splitter.split_documents(docs)

    # Ephemeral Vector Store
    vector_store = Chroma.from_documents(chunks, embeddings)
    retriever = vector_store.as_retriever()

    # LCEL Chain
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs}
        | PROMPT_TEMPLATE
        | llm
        | StrOutputParser()
    )

    # Invoke
    response = await rag_chain.ainvoke("Predict startup success")
    
    return response

# API Endpoints
@app.post("/view")
async def view_analysis(request: StartupRequest):
    try:
        if not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
            
        result = await analyze_startup(request.prompt)
        return {"analysis": result}
        
    except ValueError as e:
        # Catch specific configuration errors
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)