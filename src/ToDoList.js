/*global chrome*/
import React, {Component} from 'react'

import axios from 'axios';


const qna = require('@tensorflow-models/qna');
class TodoList extends Component {

    async load_model() {
        this.model = await qna.load();
    }

    constructor(props) {
        super(props);
        this.state = {
            inputValue: '',
            contents: [],
            sep: '%$',
            qasep:'#@',
            BATCH_SIZE: 256,
            host: 'http://e31e7c8d88a8.ngrok.io',
            topQuestions: ['Some are interesting questions', 'Some are boring questions'],
            topAnswers: [['good', 'question'], ['bad', 'question']],
            url: "some website",
            vocab: [],
            status: 'Loading model...',
        }
        //this.queryAnswer = this.queryAnswer.bind(this)
        this.setStateAsync = this.setStateAsync.bind(this)
        this.setTopAskedQuestion = this.setTopAskedQuestion.bind(this)
        this.log_msg = this.log_msg.bind(this)
        this.retrieveTopAskedQuestion = this.retrieveTopAskedQuestion.bind(this)
        this.highlightContent = this.highlightContent.bind(this)
        //this.showTopAnswer = this.showTopAnswer.bind(this)
        this.load_model = this.load_model.bind(this)
        this.run_model = this.run_model.bind(this)
        this.searchAnswer = this.searchAnswer.bind(this)
        this.searchAnswerBackend = this.searchAnswerBackend.bind(this)
        this.retrieveAnswer = this.retrieveAnswer.bind(this)
        this.load_model().finally(() => {


        })

    }
    componentDidMount() {
        this.setState({
            status: 'Ask as many questions as you want!'
        })
        chrome.tabs.executeScript( null, {code:'document.URL;'},
            this.retrieveTopAskedQuestion);
        //chrome.tabs.executeScript( null, {code:'document.body.innerText.split("\\n");'},
        //    this.extractText);

    }

    extractText(resultArray) {
        const contents = resultArray[0];
        let vocab = new Set()
        for (let i = 0; i < contents; i++) {
            const words = contents[i].split(' ')
            for (let j = 0; j < words.length; j++) {
                const word = words[i].replace(/[^0-9a-z]/gi, '')
                if (word.length === words[i].length) {
                    vocab.add(word)
                }

            }

        }
        this.setState(
            {
                vocab: [...vocab]
            }

        )

    }

    setTopAskedQuestion() {
        const url = this.state.host + '/api/init'
        const query = this.state.url
        const myParams = {
            data: query
        };
        var self = this;
        let hasQuestion = false
        if (query !=="") {

            axios.post(url, myParams)
                .then(function(response){
                    const data = response.data.toString()

                    if (data.length > 0) {
                        const qas = data.split(self.state.qasep)
                        let topQuestions = []
                        let topAnswers = []

                        for (let i = 0; i < qas.length; i++) {
                            const qa = qas[i].split(self.state.sep)
                            topQuestions.push(qa[0])
                            topAnswers.push(qa.slice(1))

                        }

                        self.setState({
                            topQuestions: topQuestions,
                            topAnswers: topAnswers,
                        })
                        hasQuestion = true
                    }

                })
                .catch(function(error){
                    console.log(error);
                    self.setState({
                        topQuestions: ["Offline mode", error.toString()],
                        topAnswers: [['the', 'is'], ['an', 'error']],
                    })

                    //Perform action based on error
                });

        } else {
            alert("The search query cannot be empty")
        }
        return hasQuestion

    }

    retrieveTopAskedQuestion(resultArray) {
        this.setState({
            url: resultArray[0]
        })
        const hasQuestion = this.setTopAskedQuestion()
        if (!hasQuestion) {
            this.setState({
                topQuestions: ["Be the first one to ask question here!"]
            })
        }




    }


    render() {
        return (
            <fragment>
                <div>
                    <input
                        value={this.state.inputValue}
                        onChange={this.handleInputChange.bind(this)}
                        onKeyPress={this.handleEnterKey.bind(this)}
                    />
                    <button onClick={this.handleButtonClick.bind(this)}>submit</button>
                </div>
                <div>
                    {this.state.status}
                    <ul>
                        {
                            this.state.contents.map((item, index) => {
                                return <li> {item}</li>
                            })
                        }
                    </ul>
                    <ul>
                        {
                            this.state.topQuestions.map((item, index) => {
                                return <li onClick={this.showTopAnswer.bind(this, index)}
                                           style={{cursor:'pointer'}}>
                                           {item}

                                        </li>
                            })
                        }
                    </ul>


                </div>

            </fragment>
        )
    }
    showTopAnswer(idx) {
        const answers = this.state.topAnswers[idx]
        this.highlightContent(answers, true)


    }

    handleInputChange(e) {
        const str = e.target.value
        const lastChar = str[str.length -1];

        this.setState({
            inputValue: e.target.value
        })


    }

    handleButtonClick() {
        this.setState({
            contents: [this.state.inputValue],
        })


        chrome.tabs.executeScript( null, {code:'document.body.innerText.split("\\n");'},
            this.searchAnswer)
        const question = this.state.inputValue


        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: question}, function(response) {
                //console.log(response.farewell);
            });
        });
    }

    handleEnterKey(e) {
        if (e.key === 'Enter') {
            this.handleButtonClick()

        }
    }


    highlightContent(contents, clear=false) {
        if (contents === null || contents === undefined) {
            contents = ["something is wrong"]
        }
        // Format: "clear Highlight%$content"
        let text = contents.join(this.state.sep)
        const clearHeader = clear? "clear highlight": "0"
        text = clearHeader + this.state.sep + text

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: text}, function(response) {
                //console.log(response.farewell);
            });
        });
    }

    setStateAsync(state) {
        return new Promise((resolve) => {
            this.setState(state, resolve)
        });
    }

    async searchAnswer(resultArray) {

        const question = this.state.contents[0]
        const contents = resultArray[0];

        await this.setStateAsync({status: "Answer will be ready shortly..."});

        // format: question%$content%$url%$type
        let foundAnswer = await this.searchAnswerBackend(question + this.state.sep+""+
            this.state.sep + this.state.url + this.state.sep+"@question")

        if (foundAnswer) {
            await this.setStateAsync({status: "Answer Found"});
            return
        } else {
            await this.setStateAsync({status: "Working Hard to find it"});
        }

        const texts = await this.run_model(question, contents)
        if (texts !== "") {
            await this.setStateAsync({status: "Good Question! Let me ask my boss for advice..."});
            const foundAnswer = await this.searchAnswerBackend(texts)
            await this.setStateAsync({status: foundAnswer ? "Answer Found!" : "Sorry, no answer found. Try a new one."})
        } else {
            await this.setStateAsync({status: "Answer Found!"})
        }
    }


    run_model = async(question, contents) => {

        console.log("running query")
        let foundAnswer = false
        let i = 0
        let processLength = 0
        let batch = []
        let all_answers_found = new Set()
        let all_answers_found_list = []

        while (i < contents.length) {
            //if (contents[i].split(' ').length < 4) continue
            batch = [...batch, contents[i]]
            processLength += contents[i].length
            i += 1
            if (processLength < 2000) {
                if (i < contents.length) continue
            }
            processLength = 0
            let localAnswers = [foundAnswer? "0":"clear highlight"]
            const content = batch.join('\n')
            batch = []
            const answers = await this.model.findAnswers(question, content)
            console.log(answers)
            for (const ans of answers){
                console.log(ans)
                var start = ans.startIndex
                var end = ans.endIndex
                const score = ans.score
                if (score < 0.85) break

                console.log(start, end)
                console.log(content.substr(start, end-start))

                // adjust token index
                var s = start
                while (s < end && !"\t\r\n\f".includes(content[s])) s++;
                if (s === end) {
                    while (start >= 0 && !" \t\r\n\f".includes(content[start])) start--;
                } else {
                    start = s + 1
                }

                while (end < content.length && !" \t\r\n\f".includes(content[end])) end++;


                localAnswers = [...localAnswers, content.substr(start, end-start)]

            }
            if (localAnswers.length > 1) {
                foundAnswer = true
                // localAnswers[0] = clear highlight or not
                let new_answers = [localAnswers[0]]
                for (let i = 1; i < localAnswers.length; i++) {
                    const ans = localAnswers[i]
                    if (!all_answers_found.has(ans)) {
                        new_answers = [...new_answers, ans]
                        all_answers_found.add(ans)
                        all_answers_found_list.push(ans)
                    }
                }
                // highlight
                //const texts = localAnswers.join(this.state.sep)
                const texts = new_answers.join(this.state.sep)
                chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {greeting: texts}, function (response) {
                        //console.log(response.farewell);
                    });
                });
            }
        }

        if (foundAnswer) {
            const qa = [question, ...all_answers_found_list, this.state.url, "@answer"]
            const text = qa.join(this.state.sep)
            await this.retrieveAnswer(text, false)
            return new Promise(function (resolve, reject) {
                resolve("")
            })


        } else {
            let postContents = [question]

            for (let i = 0; i < contents.length; i++) {
                const line = contents[i];
                if (line.length < 20) {
                    continue;
                }
                postContents.push(line)
            }
            postContents.push(this.state.url)
            postContents.push("@question")
            const texts = postContents.join(this.state.sep)
            return new Promise(function (resolve, reject) {
                resolve(texts)
            })

        }

    }

    async searchAnswerBackend(text) {
        if (text === "") return true
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: "query backend to find answer !!%"}, function (response) {
                //console.log(response.farewell);
            });
        });

        let foundAnswer = await this.retrieveAnswer(text, true);
        return new Promise(function(resolve, reject) {
            resolve(foundAnswer)
        })
        //return this.retrieveAnswer(text, true);
    }



    async retrieveAnswer(query, isQuestion=true, subdomain='/api/query'){
        const url = this.state.host + subdomain
        const myParams = {
            data: query
        };
        let foundAnswer = false
        let answer = "fail"
        if (query !=="") {
            await axios.post(url, myParams)
                .then(function(response){
                    if (isQuestion) {
                        answer = response.data.toString()
                        foundAnswer = answer.length > 1
                        answer = "clear highlight%$" + answer
                        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                            chrome.tabs.sendMessage(tabs[0].id, {greeting: answer}, function (response) {
                                //console.log(response.farewell);
                            });
                        });

                    }
                    //Perform action based on response
                })
                .catch(function(error){
                    console.log(error);
                    answer = "error happen in response"
                    //Perform action based on error
                });

        } else {
            alert("The search query cannot be empty")
        }
        return foundAnswer
    }

    log_msg(msg) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: msg}, function(response) {
                //console.log(response.farewell);
            });
        });
    }







}


export default TodoList
