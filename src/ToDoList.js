/*global chrome*/
import React, {Component} from 'react'


class TodoList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            inputValue: '',
            list: ['abc', 'def']
        }
        this.displayContent = this.displayContent.bind(this)

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
                            this.state.list.map((item, index) => {
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
            list: [...this.state.list, this.state.inputValue],
        })
    }

    handleEnterKey(e) {
        if (e.key === 'Enter') {
            this.setState({
                list: [...this.state.list, this.state.inputValue],
            })

            chrome.tabs.executeScript( null, {code:'document.body.innerText.split("\\n");'},
                this.displayContent);

            const question = this.state.inputValue

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {greeting: question}, function(response) {
                    //console.log(response.farewell);
                });
            });

        }



    }

    displayContent(resultArray) {

        var content = []

        for (let i = 0; i < resultArray[0].length; i++) {
            const line = resultArray[0][i];
            if (line.length < 20) {
                continue;
            }
            content.push(line)
        }
        this.setState({
            list: content
        })
    }





}

export default TodoList