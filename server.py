from flask import Flask 
from flask import request
from flask_cors import CORS, cross_origin
from flask import jsonify
from collections import defaultdict, Counter
from heapq import heappush, heappop

import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering

tokenizer = AutoTokenizer.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")
model = AutoModelForQuestionAnswering.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")
tokenizer = AutoTokenizer.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")
model = AutoModelForQuestionAnswering.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")

def get_answer(questions, texts):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    answers = []
    scores = []
    for question in questions:
        for text in texts:

            inputs = tokenizer.encode_plus(question, text, add_special_tokens=True, padding=True, max_length=512, return_tensors="pt").to(device)
            offset_map = tokenizer.encode_plus(question, text, add_special_tokens=True, padding=True, max_length=512, return_tensors="pt", return_offsets_mapping=True)['offset_mapping'][0]
            input_ids = inputs["input_ids"].tolist()[0]
            
            text_tokens = tokenizer.convert_ids_to_tokens(input_ids)
            model.to(device)
            res = model(**inputs)
            model.to('cpu')
            answer_start_scores = res['start_logits']
            answer_end_scores = res['end_logits']
            answer_start = torch.argmax(answer_start_scores)
            answer_end = torch.argmax(answer_end_scores) + 1
            score = torch.max(answer_start_scores) + torch.max(answer_end_scores)
            
            if answer_start >= answer_end - 1:
                continue

            if score < 0.75:
                continue
            
            start = offset_map[answer_start][0]
            end = offset_map[answer_end][1]
            # answer = tokenizer.convert_tokens_to_string(tokenizer.convert_ids_to_tokens(input_ids[answer_start:answer_end]))
            answer = text[start:end]
            if len(answer) == 0:
                continue
            answers.append(answer)
            if len(answers) > 10:
                return answers
    return answers


class URL:
    def __init__(self):
        # self.url = url
        self.asked_questions = defaultdict(set)
        self.counter = Counter()
        self.qa_sep = "#@"
        self.sep = "%$"

    def add_qa(self, question, answer):
        answer = answer.replace('\n', self.sep)
        self.asked_questions[question].add(answer)
        self.counter[question] += 1

    def get_top_qa(self, top=3):
        qas = sorted([(q, a) for q, a in self.asked_questions.items()], key=lambda x: -self.counter[x[0]])
        return qas[:top]

    def get_answer(self, question):
        if question in self.asked_questions:
            return self.sep.join([str(answer) for answer in self.asked_questions[question]])
        return ""

    def get_top_qa_string(self, top=3):
        qa = self.qa_sep.join([q+self.sep+ self.sep.join(list(a)) for q, a in self.get_top_qa(top)])
        return qa

class Database:
    def __init__(self):
        self.urls = defaultdict(URL)

    def set_url_qa(self, url, question, answer):
        self.urls[url].add_qa(question, answer)

    def get_url(self, url):
        if url in self.urls:
            return self.urls[url]
        return None

    def get_url_top_qa(self, url, top=3):
        if url not in self.urls:
            return ""
        else:
            return self.urls[url].get_top_qa_string()

    def get_answer(self, url, question):
        url_obj = self.get_url(url)
        if url_obj is None:
            return ""
        return self.urls[url].get_answer(question)

    def remove_url(self, url):
        if url not in self.urls:
            return
        del self.urls[url]


database = Database()
app = Flask(__name__) 
# CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/") 
def home(): 
    return "<h1>Server is up and running!</h1>"

# @cross_origin(headers=['Content-Type']) # Send Access-Control-Allow-Headers
@app.route('/api/query', methods = ['POST', 'GET'])
@cross_origin(headers=['Content-Type'])
def get_query_from_react():
    print()
    sep = '%$'
    data = request.get_json()
    texts = data['data'].split(sep)
    question = texts[0]
    contents = [text for text in texts[1:] if len(text.split(' ')) > 20]
    is_answer = texts[-1] == "@answer"
    url = texts[-2]
    
    if is_answer:
        print("Attempting to add answer from front-end to database")
    else:
        if len(contents):
            print("Attempting to run back-end model to get answers")
        else:
            print("Attempting to find answer in database")

    print("Number of paragraphs: ", len(contents))
    print("Question is: ", question)
    print("URL is ", url)
    answers = ""
    if not is_answer:
        old_answers = database.get_answer(url, question)
        if old_answers:
            print("Returning answer from database")
            answers = old_answers
        elif len(contents):
            print("Running back-end model to get answers")
            answers = sep.join(get_answer([question], contents))
        else:
            print("No answers found in database")
    else: # get answer from front-end
        print("Getting answer from front-end")
        answers = sep.join(texts[1:-2])
    
    if answers:
        database.set_url_qa(url, question, answers)
        print("Adding <url, question, answer> to database")
        if not is_answer:
            print("Returning answer")
    else:
        print("No answer being returned")

    return jsonify(answers)

@app.route('/api/init', methods = ['POST', 'GET'])
@cross_origin(headers=['Content-Type'])
def get_top_question_answer():
    print()
    print("Attempting to retrieve top Q&A for URL")
    sep = '%$'
    data = request.get_json()
    url = data['data']
    print("URL is: ", url)

    qa = database.get_url_top_qa(url)
    if len(qa) > 0:
        print("Returning cached top question and answers for the URL")
    else:
        print("No cached top question and answers for the URL found")
    
    return jsonify(qa)

app.run(host='0.0.0.0', port=80)