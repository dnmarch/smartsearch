/*global chrome*/
import React, { Component } from 'react';
import './App.css';
import TodoList from "./ToDoList";

class App extends Component {
  constructor(props) {
    super(props)
    this.state = { url: '' }
  }

  renderStatus(url) {
    this.setState({ url })
  }

  render() {
    const { url } = this.state
    return (
      <div>
        <div>SmartSearch</div>
        <div className="url">
          {url}
        </div>
        <TodoList/>
      </div>
    );
  }

  componentDidMount() {
    var queryInfo = {
      active: true,
      currentWindow: true
    }
    
    chrome.tabs.query(queryInfo, (tabs) => {
      const tab = tabs[0]
      const url = tab.url
      this.setState({ url })
    })
  }
}

export default App;
