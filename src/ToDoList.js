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
            contents: ['Ask as many questions as you want!'],
            sep: '%$',
            host: 'http://caa6a6a9292c.ngrok.io',
        }
        //this.queryAnswer = this.queryAnswer.bind(this)
        this.load_model = this.load_model.bind(this)
        this.run_model = this.run_model.bind(this)
        this.load_model().finally(() => {
            this.displayContent = this.displayContent.bind(this)
            this.handlePostQuery = this.handlePostQuery.bind(this)
            this.highlightContent = this.highlightContent.bind(this)
        })

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
                </div>
            </fragment>
        )
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
                this.displayContent);


            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {greeting: question}, function(response) {
                    //console.log(response.farewell);
                });
            });

        }



    }

    highlightContent(contents) {
        const text = this.state.sep.join(contents)
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: text}, function(response) {
                //console.log(response.farewell);
            });
        });
    }

    displayContent(resultArray) {

        const question = this.state.contents[0]
        var content = resultArray[0].join('\\n')

        console.log(question)
        this.run_model(question, content).finally(() => {})
        /*
        if (localAnswers.length > 0) {
            console.log("Found answers")
            console.log(localAnswers)
            this.highlightContent(localAnswers)
        } else {
            console.log("Cannot find answer on local; send question and content to backend.")
            const question = this.state.contents[0]
            let postContents = [question]

            for (let i = 0; i < resultArray[0].length; i++) {
                const line = resultArray[0][i];
                if (line.length < 20) {
                    continue;
                }
                postContents.push(line)
            }
            const text = postContents.join(this.state.sep)
            this.handlePostQuery(text)
        }

         */


    }

    async run_model(question, content) {
        var localAnswers = []
        console.log("running query")
        const answers = await this.model.findAnswers(question, content)
        console.log(answers)
        for (const ans of answers){
            console.log(ans)
            var start = ans.startIndex
            var end = ans.endIndex
            console.log(start, end)
            console.log(content.substr(start, end-start))
            localAnswers = [...localAnswers, content.substr(start, end-start)]
        }
        const texts = localAnswers.join("%$")
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: texts}, function(response) {
                //console.log(response.farewell);
            });
        });

    }



    handlePostQuery(query){
        const url = this.state.host + '/api/query'
        var myParams = {
            data: query
        }
        let answer = "fail"
        if (query !=="") {
            axios.post(url, myParams)
                .then(function(response){

                    answer = response.data.toString()
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {greeting: answer}, function(response) {
                            //console.log(response.farewell);
                        });
                    });
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





}

export default TodoList
