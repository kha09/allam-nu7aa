
import os
import pandas as pd
import getpass
from sklearn.model_selection import train_test_split

# Evaluation metrices
from sklearn.metrics import accuracy_score  # Or any other metric like BLEU, ROUGE
from nltk.translate.bleu_score import sentence_bleu
from rouge_score import rouge_scorer
from sklearn.metrics import f1_score


# langchain
import matplotlib.pyplot as plt
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
#from langchain.vectorstores import FAISS
from langchain_community.vectorstores import FAISS
from langchain.chains.question_answering import load_qa_chain
from langchain.chains import ConversationalRetrievalChain
from langchain_ibm import WatsonxEmbeddings
from langchain_ibm import WatsonxLLM
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_community.docstore.in_memory import InMemoryDocstore


# ibm_watsonx_ai
from ibm_watsonx_ai.foundation_models.utils.enums import ModelTypes
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.foundation_models.utils.enums import DecodingMethods
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.metanames import EmbedTextParamsMetaNames
from ibm_watson_machine_learning.metanames import GenTextParamsMetaNames as GenParams

"""# 1. Loading CSVs and chunking with LangChain


"""

# Simple method - Split by pages
loader = CSVLoader(
    "C:\\Users\\KHA\Documents\\allam files\\nadaLangchain\\Arabic-Error-Checker\\الأخطاء اللغوية .csv", 
    encoding='utf-8'
)
pages = loader.load_and_split()

print(pages[0])

# SKIP TO STEP 2 IF YOU'RE USING THIS METHOD
chunks = pages

"""# 2. Embed text and store embeddings

### Seting up connection with watsonx.ai and get environment Variables

Get watsonx URL
"""

try:
    os.environ["WATSONX_URL"] = wxa_url
except NameError:
    wxa_url = getpass.getpass("Please enter your watsonx.ai URL domain (hit enter): ")
    os.environ["WATSONX_URL"] = wxa_url

"""Get watsonx API key"""

try:
     os.environ["WATSONX_APIKEY"] = wxa_api_key
except NameError:
    wxa_api_key = getpass.getpass("Please enter your watsonx.ai API key (hit enter): ")
    os.environ["WATSONX_APIKEY"] = wxa_api_key

"""Get watsonx Project ID"""

try:
    os.environ["WATSONX_PROJECT_ID"] = wxa_project_id
except NameError:
    wxa_project_id = getpass.getpass("Please enter your watsonx.ai Project ID (hit enter): ")
    os.environ["WATSONX_PROJECT_ID"] = wxa_project_id

"""### Loading the embedding model"""

# adjust model parameters
embed_params = {
    EmbedTextParamsMetaNames.TRUNCATE_INPUT_TOKENS: 3,
    EmbedTextParamsMetaNames.RETURN_OPTIONS: {"input_text": True},
}

multilingual_e5_embedding = WatsonxEmbeddings(
    model_id="intfloat/multilingual-e5-large",
    params=embed_params,
    url=wxa_url,
    project_id=wxa_project_id
)

"""### Initilaize FIASS vector database"""
db = FAISS.from_documents(chunks,multilingual_e5_embedding)

"""# 3. Setup retrieval function

## Loading ALLAM model
"""

# adjust model parameters
parameters = {
    GenParams.MIN_NEW_TOKENS: 1,
    GenParams.TEMPERATURE: 0.6,
    GenParams.MAX_NEW_TOKENS: 500
}

allam_llm = WatsonxLLM(
    model_id="sdaia/allam-1-13b-instruct",
    params=parameters,
    url=wxa_url,
    project_id=wxa_project_id
)

"""### Get response from ALLAM model directly"""

#Sentence = "معلموا المبحث نشيطون."

Sentence = input("Please enter a sentence with error: ")

# define input query
# query = "قم بتصحيح الجملة التالية مع توضيح الخطأ اللغوي فيها واكتب الرد باللغة العربية: " + Sentence

query ="""
قم بتصحيح الجملة التالية (""" + Sentence + """) مع تطبيق الشروط التالية:
1- توضيح نوع الخطأ اللغوي فيها
2- اختصار التفسير حدود 20 كلمة فقط
3- الرد كاملاً يجب أن يكون باللغة العربية

اكتب الرد على النحو التالي:
الخطأ: الجملة
نوع الخطأ: النوع
الصواب: تصحيح الجملة
التفسير: كتابة التفسيرالمختصر
"""

allam_response = allam_llm(query)

print("Query: " + query)
print("Response: " + allam_response)

"""### Get response from knowledge base (Create QA chain to integrate similarity search with input queries)"""

Sentence

# Check that similarity search is working
docs = db.similarity_search(Sentence, k=10)
for i in docs:
  print(i)
  print("")

chain = load_qa_chain(allam_llm, chain_type="stuff")
allam_response_RAG = chain.run(input_documents=docs, question=query)

print("Query: " + query)
print("Response: " + allam_response_RAG)

"""### Paraphrase the Original Query"""

# define input query
query = "أعد صياغة الجملة التالية بخمس طرق غير متشابهة واجعل كل جملة في سطر جديد  : " + Sentence

allam_response_paraphrase = allam_llm(query)

print("Query: " + query)
print("Response: " + allam_response_paraphrase)

"""# 4. Evaluation

- Type of error (accuracy/f1 score)
- explination of error (ROUGE/BLEU)
- the explination (ROUGE/BLEU)

Evaluate the generated explanation
"""

# Function to find match in original file and return corrrections
def get_ground_truth(csv_path, search_value):
  df = pd.read_csv(csv_path)
  # Filter the DataFrame based on column A value
  match_val = df[df['الخطأ'] == search_value]
  df['Combined'] = match_val['الصواب']+ " " + match_val['التفسير']
  return df['Combined'].dropna().tolist()[0]

# Get ground truth
#real_response = get_ground_truth("/content/الأخطاء اللغوية الشائعة (تنظيف).csv", query.split(":")[1].strip())

# Get ground truth
real_response = get_ground_truth("C:\\Users\\KHA\Documents\\allam files\\nadaLangchain\\Arabic-Error-Checker\\الأخطاء اللغوية .csv", Sentence)

real_response

allam_response_RAG_modified = allam_response_RAG.split("التفسير: ", 1)[1].strip()
allam_response_RAG_modified

"""Define Accuracy (Exact Match)"""

def calculate_accuracy(predictions, targets):
    correct = sum([1 if pred == target else 0 for pred, target in zip(predictions, targets)])
    accuracy = correct / len(targets)
    return accuracy

# Calculate accuracy
accuracy_score = calculate_accuracy(allam_response_RAG_modified, real_response)
print("Accuracy Score:", accuracy_score)

"""BLEU Score (Bilingual Evaluation Understudy)"""

def calculate_bleu(predictions, targets):
    scores = [sentence_bleu([target.split()], pred.split()) for pred, target in zip(predictions, targets)]
    return sum(scores) / len(scores)

# Calculate BLEU score
bleu_score = calculate_bleu(allam_response_RAG_modified, real_response)
print("BLEU Score:", bleu_score)

"""ROUGE Score"""

def calculate_rouge(predictions, targets):
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=True)
    scores = [scorer.score(target, pred) for pred, target in zip(predictions, targets)]
    avg_rouge = {
        'rouge1': sum([score['rouge1'].fmeasure for score in scores]) / len(scores),
        'rougeL': sum([score['rougeL'].fmeasure for score in scores]) / len(scores),
    }
    return avg_rouge

def calculate_rouge(prediction, target):
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=True)
    scores = scorer.score(target, prediction)
    return {
        'rouge1': scores['rouge1'].fmeasure,
        'rougeL': scores['rougeL'].fmeasure,
    }

# Calculate ROUGE scores
rouge_results = calculate_rouge(allam_response_RAG_modified, real_response)
print(f"Average ROUGE-1 F1 Score: {rouge_results['rouge1']}")
print(f"Average ROUGE-L F1 Score: {rouge_results['rougeL']}")