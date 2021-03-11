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
            contents: ['Loading model...'],
            sep: '%$',
            qasep:'#@',
            BATCH_SIZE: 256,
            host: 'http://cf999a4c6ff6.ngrok.io',
            topQuestions: ['Some are interesting questions', 'Some are boring questions'],
            topAnswers: [['good', 'question'], ['bad', 'question']],
            url: ""
        }
        //this.queryAnswer = this.queryAnswer.bind(this)
        this.setTopAskedQuestion = this.setTopAskedQuestion.bind(this)
        this.log_msg = this.log_msg.bind(this)
        this.retrieveTopAskedQuestion = this.retrieveTopAskedQuestion.bind(this)
        this.highlightContent = this.highlightContent.bind(this)
        //this.showTopAnswer = this.showTopAnswer.bind(this)
        this.load_model = this.load_model.bind(this)
        this.run_model = this.run_model.bind(this)
        this.load_model().finally(() => {
            this.searchAnswer = this.searchAnswer.bind(this)
            this.retrieveAnswer = this.retrieveAnswer.bind(this)

        })

    }
    componentDidMount() {
        this.setState({
            contents: ['Ask as many questions as you want!']
        })
        chrome.tabs.executeScript( null, {code:'document.URL;'},
            this.retrieveTopAskedQuestion);

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
                        topQuestions: ["error", error.toString()],
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
            contents: [...this.state.contents, this.state.inputValue],
        })

        this.setTopAskedQuestion()
    }

    handleEnterKey(e) {
        if (e.key === 'Enter') {
            this.setState({
                contents: [...this.state.contents, this.state.inputValue],
            })

            const question = this.state.inputValue
            this.setState({
                contents: [this.state.inputValue],
            })
            chrome.tabs.executeScript( null, {code:'document.body.innerText.split("\\n");'},
                this.searchAnswer);


            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {greeting: question}, function(response) {
                    //console.log(response.farewell);
                });
            });

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

    searchAnswer(resultArray) {

        const question = this.state.contents[0]
        const contents = resultArray[0];

        console.log(question)
        this.run_model(question, contents).finally(() => {})

    }

    async run_model(question, contents) {

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
        // Cannot find answer; search for the backend
        if (foundAnswer === false) {

            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {greeting: "query backend to find answer !!%"}, function (response) {
                    //console.log(response.farewell);
                });
            });
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
            const text = postContents.join(this.state.sep)
            this.retrieveAnswer(text, true)
        } else {
            //const answer_found = Array.from(all_answers_found)
            const qa = [question, ...all_answers_found_list, this.state.url, "@answer"]
            const text = qa.join(this.state.sep)
            this.retrieveAnswer(text, false)
        }


    }



    retrieveAnswer(query, isQuestion=true, subdomain='/api/query'){
        const url = this.state.host + subdomain
        const myParams = {
            data: query
        };
        let answer = "fail"
        if (query !=="") {
            axios.post(url, myParams)
                .then(function(response){
                    if (isQuestion) {
                        answer = response.data.toString()
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
