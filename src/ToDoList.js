/*global chrome*/
import React, {Component} from 'react'
import axios from 'axios';

class TodoList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            inputValue: '',
            contents: ['abc', 'def'],
            sep: '%$',
            host: 'http://caa6a6a9292c.ngrok.io',
        }
        this.displayContent = this.displayContent.bind(this)
        this.handlePostQuery = this.handlePostQuery.bind(this)
        //this.queryAnswer = this.queryAnswer.bind(this)
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


            const content = this.state.contents.join(this.state.sep)
            //const query = question + this.state.sep + content
            //console.log("current state")
            //console.log(content)
            //const answer = this.queryAnswer(question)
            //console.log("the answer is")
            //console.log(answer)
            //this.handlePostQuery(query)

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {greeting: question}, function(response) {
                    //console.log(response.farewell);
                });
            });

        }



    }

    displayContent(resultArray) {
        const question = this.state.contents[0]
        let content = [question]

        for (let i = 0; i < resultArray[0].length; i++) {
            const line = resultArray[0][i];
            if (line.length < 20) {
                continue;
            }
            content.push(line)
        }


        const text = content.join(this.state.sep)
        this.handlePostQuery(text)
        /*
        this.setState({
            contents: question + "set done"
        })*/

    }

    queryAnswer(question) {
        const url = this.state.host + "/api/query"
        const content = document.body.innerText
        const data = question+"\n"+content
        fetch(url, {
                method:"POST",
                mode: 'cors',
                credentials: 'include',
                headers:{
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body:JSON.stringify(data)
            }
        ).then(response => {
            return response.json()
        }).then(json => {
            console.log(json)
            //this.setState({playerName: json[0]})
        })
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
            /*
            this.setState({
                contents: myParams.data,
            })*/
        } else {
            alert("The search query cannot be empty")
        }
        /*
        this.setState({
            contents: [answer],
        }) */
    }





}

export default TodoList